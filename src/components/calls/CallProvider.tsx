import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, MonitorUp, MonitorX, Minimize2, Maximize2, Users, UserPlus, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { chatSocket } from '@services/chatSocket';
import { erpService } from '@services/erpService';
import { apiClient } from '@services/apiClient';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';

/**
 * In-app voice & video calls (up to 8 people, peer-to-peer WebRTC).
 *
 * Uses the "perfect negotiation" pattern so any change (someone joins, turns
 * the camera on, starts/stops sharing their screen) renegotiates cleanly
 * without the two sides colliding. Screen sharing is sent as an EXTRA video
 * track, so your camera keeps showing while your screen is presented — like
 * Google Meet.
 */

type CallType = 'Voice' | 'Video';
interface Incoming { callId: string; from: { id: number; name: string }; callType: CallType; title?: string }
interface StartOpts { conversationId?: number; userIds?: number[]; callType: CallType }
interface Peer { userId: number; name: string; streams: Record<string, MediaStream>; audio: boolean; video: boolean; screenStreamId: string | null; state: string }
interface Conn { pc: RTCPeerConnection; polite: boolean; makingOffer: boolean; ignoreOffer: boolean; screenSenders: RTCRtpSender[] }

interface Ctx { startCall: (o: StartOpts) => void; inCall: boolean }
const CallContext = createContext<Ctx>({ startCall: () => toast.error('Calls are not available here'), inCall: false });
export const useCalls = () => useContext(CallContext);

const FALLBACK_ICE: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

function useRinger() {
  const ctxRef = useRef<AudioContext | null>(null);
  const timer = useRef<number | null>(null);
  const stop = useCallback(() => { if (timer.current) window.clearInterval(timer.current); timer.current = null; }, []);
  const start = useCallback((outgoing = false) => {
    stop();
    try {
      ctxRef.current = ctxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
      const ring = () => {
        const ctx = ctxRef.current!;
        [0, 0.4].forEach((offset, i) => {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.frequency.value = outgoing ? 425 : i ? 480 : 440; g.gain.value = 0.06;
          o.connect(g); g.connect(ctx.destination); o.start(ctx.currentTime + offset); o.stop(ctx.currentTime + offset + 0.35);
        });
      };
      ring(); timer.current = window.setInterval(ring, outgoing ? 3000 : 2000);
    } catch { /* autoplay blocked — visual ring only */ }
  }, [stop]);
  return { start, stop };
}

function Tile({ stream, name, muted, mirrored, showVideo, micOff, big, label }: { stream?: MediaStream; name: string; muted?: boolean; mirrored?: boolean; showVideo: boolean; micOff?: boolean; big?: boolean; label?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current && ref.current.srcObject !== (stream || null)) ref.current.srcObject = stream || null; }, [stream]);
  return (
    <div className={cn('relative rounded-2xl overflow-hidden bg-gray-800 flex items-center justify-center', big ? 'w-full h-full' : 'aspect-video')}>
      <video ref={ref} autoPlay playsInline muted={muted} className={cn('w-full h-full', big ? 'object-contain bg-black' : 'object-cover', !showVideo && 'hidden', mirrored && '-scale-x-100')} />
      {!showVideo && <div className={cn('rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white', big ? 'h-24 w-24 text-4xl' : 'h-14 w-14 text-2xl')}>{(name || '?').charAt(0).toUpperCase()}</div>}
      <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded-full flex items-center gap-1">{micOff && <MicOff className="h-3 w-3 text-red-400" />}{label || name}</span>
    </div>
  );
}

/** Hidden audio element per remote participant (video tiles may not render, e.g. while minimised). */
function RemoteAudio({ stream }: { stream?: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => { if (ref.current && stream && ref.current.srcObject !== stream) ref.current.srcObject = stream; }, [stream]);
  return <audio ref={ref} autoPlay />;
}

export function CallProvider({ children }: { children: ReactNode }) {
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [, setCallType] = useState<CallType>('Video');
  const [status, setStatus] = useState<'idle' | 'calling' | 'active'>('idle');
  const [peers, setPeers] = useState<Record<number, Peer>>({});
  const [local, setLocal] = useState<MediaStream | null>(null);
  const [screen, setScreen] = useState<MediaStream | null>(null);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [minimised, setMinimised] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [, tick] = useState(0);

  const conns = useRef<Record<number, Conn>>({});
  const iceServers = useRef<RTCIceServer[]>(FALLBACK_ICE);
  const localRef = useRef<MediaStream | null>(null);
  const screenRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string | null>(null);
  const myIdRef = useRef<number>(0);
  const names = useRef<Record<number, string>>({});
  const mediaRef = useRef({ mic: true, cam: true });
  const ringer = useRinger();

  useEffect(() => { erpService.iceServers().then((r) => { if (r?.iceServers?.length) iceServers.current = r.iceServers; }).catch(() => undefined); }, []);
  useEffect(() => { if (status !== 'active') return; const t = window.setInterval(() => tick((x) => x + 1), 1000); return () => window.clearInterval(t); }, [status]);
  useEffect(() => { (window as any).__maxhubInCall = status !== 'idle'; }, [status]);

  const patchPeer = (uid: number, patch: Partial<Peer> | ((p: Peer) => Partial<Peer>)) =>
    setPeers((all) => {
      const base: Peer = all[uid] || { userId: uid, name: names.current[uid] || 'Participant', streams: {}, audio: true, video: true, screenStreamId: null, state: 'connecting' };
      const p = typeof patch === 'function' ? patch(base) : patch;
      return { ...all, [uid]: { ...base, ...p } };
    });

  const send = (toUserId: number, data: any) => callIdRef.current && chatSocket.emit('call:signal', { callId: callIdRef.current, toUserId, data });
  const broadcastMedia = () => {
    if (!callIdRef.current) return;
    chatSocket.emit('call:media_state', { callId: callIdRef.current, audio: mediaRef.current.mic, video: mediaRef.current.cam, screenStreamId: screenRef.current?.id || null });
  };

  const cleanup = useCallback(() => {
    ringer.stop();
    Object.values(conns.current).forEach((c) => { try { c.pc.close(); } catch { /* */ } });
    conns.current = {};
    localRef.current?.getTracks().forEach((t) => t.stop());
    screenRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null; screenRef.current = null; callIdRef.current = null;
    setLocal(null); setScreen(null); setPeers({}); setCallId(null); setStatus('idle'); setStartedAt(null); setMinimised(false); setInviteOpen(false);
  }, [ringer]);

  const getMedia = async (type: CallType) => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: type === 'Video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false });
      localRef.current = s; setLocal(s);
      mediaRef.current = { mic: true, cam: type === 'Video' };
      setMic(true); setCam(type === 'Video');
      return s;
    } catch (e: any) {
      toast.error(type === 'Video' ? 'Camera/microphone blocked' : 'Microphone blocked', 'Allow access in your browser settings, then try again.');
      throw e;
    }
  };

  /** One RTCPeerConnection per participant, using perfect negotiation. */
  const connect = useCallback((uid: number, name?: string) => {
    if (name) names.current[uid] = name;
    if (conns.current[uid]) return conns.current[uid];
    const pc = new RTCPeerConnection({ iceServers: iceServers.current });
    const conn: Conn = { pc, polite: myIdRef.current < uid, makingOffer: false, ignoreOffer: false, screenSenders: [] };
    conns.current[uid] = conn;
    localRef.current?.getTracks().forEach((t) => pc.addTrack(t, localRef.current!));
    if (screenRef.current) screenRef.current.getTracks().forEach((t) => conn.screenSenders.push(pc.addTrack(t, screenRef.current!)));

    pc.onnegotiationneeded = async () => {
      try {
        conn.makingOffer = true;
        await pc.setLocalDescription();
        send(uid, { description: pc.localDescription });
      } catch (e) { console.warn('[call] negotiation', e); } finally { conn.makingOffer = false; }
    };
    pc.onicecandidate = (e) => { if (e.candidate) send(uid, { candidate: e.candidate.toJSON() }); };
    pc.ontrack = (e) => {
      const stream = e.streams[0] || new MediaStream([e.track]);
      patchPeer(uid, (p) => ({ streams: { ...p.streams, [stream.id]: stream } }));
      e.track.onended = () => patchPeer(uid, (p) => { const s = { ...p.streams }; if (!stream.getTracks().some((t) => t.readyState === 'live')) delete s[stream.id]; return { streams: s }; });
      stream.onremovetrack = () => patchPeer(uid, (p) => { const s = { ...p.streams }; if (!stream.getTracks().length) delete s[stream.id]; return { streams: s }; });
    };
    pc.onconnectionstatechange = () => {
      patchPeer(uid, { state: pc.connectionState });
      if (pc.connectionState === 'failed') {
        pc.restartIce();
        toast.error(`Trouble connecting to ${names.current[uid] || 'a participant'}`, 'Retrying… If it keeps failing, ask your admin to add a TURN server.');
      }
    };
    patchPeer(uid, { name: names.current[uid] || 'Participant' });
    return conn;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dropPeer = (uid: number) => {
    try { conns.current[uid]?.pc.close(); } catch { /* */ }
    delete conns.current[uid];
    setPeers((p) => { const n = { ...p }; delete n[uid]; return n; });
  };

  // ── Socket events ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onIncoming = (c: Incoming) => {
      if (callIdRef.current) { chatSocket.emit('call:decline', { callId: c.callId }); return; }
      setIncoming(c); ringer.start(false);
      if (document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') {
        const n = new Notification(`Incoming ${c.callType.toLowerCase()} call`, { body: c.from.name, tag: `call-${c.callId}`, requireInteraction: true });
        n.onclick = () => { window.focus(); n.close(); };
      }
    };
    const onSignal = async ({ callId: cid, fromUserId, data }: any) => {
      if (cid !== callIdRef.current) return;
      const conn = conns.current[fromUserId] || connect(fromUserId);
      const pc = conn.pc;
      try {
        if (data.description) {
          const desc = data.description as RTCSessionDescriptionInit;
          const collision = desc.type === 'offer' && (conn.makingOffer || pc.signalingState !== 'stable');
          conn.ignoreOffer = !conn.polite && collision;
          if (conn.ignoreOffer) return;
          await pc.setRemoteDescription(desc);
          if (desc.type === 'offer') {
            await pc.setLocalDescription();
            send(fromUserId, { description: pc.localDescription });
          }
          setStatus('active'); ringer.stop(); setStartedAt((s) => s || Date.now());
        } else if (data.candidate) {
          try { await pc.addIceCandidate(data.candidate); } catch (e) { if (!conn.ignoreOffer) console.warn('[call] ice', e); }
        }
      } catch (e) { console.warn('[call] signal error', e); }
    };
    const onJoined = ({ callId: cid, userId, name }: any) => {
      if (cid !== callIdRef.current) return;
      connect(userId, name);
      broadcastMedia();
      setStatus('active'); ringer.stop(); setStartedAt((s) => s || Date.now());
    };
    const onLeft = ({ callId: cid, userId }: any) => { if (cid === callIdRef.current) dropPeer(userId); };
    const onEnded = ({ callId: cid, reason }: any) => {
      setIncoming((cur) => (cur?.callId === cid ? null : cur));
      if (cid === callIdRef.current) {
        if (reason === 'no-answer') toast.info('No answer');
        else if (reason === 'declined') toast.info('Call declined');
        cleanup();
      } else ringer.stop();
    };
    const onDeclined = ({ callId: cid, name }: any) => { if (cid === callIdRef.current) toast.info(`${name} declined the call`); };
    const onElsewhere = ({ callId: cid }: any) => { setIncoming((cur) => (cur?.callId === cid ? null : cur)); ringer.stop(); };
    const onMedia = ({ callId: cid, userId, audio, video, screenStreamId }: any) => {
      if (cid === callIdRef.current) patchPeer(userId, { audio, video, screenStreamId: screenStreamId || null });
    };
    const events: [string, any][] = [['call:incoming', onIncoming], ['call:signal', onSignal], ['call:participant_joined', onJoined], ['call:participant_left', onLeft], ['call:ended', onEnded], ['call:declined', onDeclined], ['call:answered_elsewhere', onElsewhere], ['call:media_state', onMedia]];
    events.forEach(([e, h]) => chatSocket.on(e, h));
    return () => events.forEach(([e, h]) => chatSocket.off(e, h));
  }, [cleanup, connect, ringer]); // eslint-disable-line react-hooks/exhaustive-deps

  const myId = () => {
    try { return Number(JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.user?.id) || 0; } catch { return 0; }
  };

  const startCall = useCallback(async (o: StartOpts) => {
    if (callIdRef.current) return toast.info('You are already in a call');
    if (!window.RTCPeerConnection || !navigator.mediaDevices) return toast.error('Your browser does not support calls');
    myIdRef.current = myId();
    try {
      await getMedia(o.callType);
      setCallType(o.callType); setStatus('calling'); ringer.start(true);
      const r = await chatSocket.emitAck<{ ok: boolean; callId?: string; error?: string; offline?: number[] }>('call:start', { conversationId: o.conversationId, targetUserIds: o.userIds, callType: o.callType });
      if (!r.ok || !r.callId) { toast.error('Could not start call', r.error); cleanup(); return; }
      callIdRef.current = r.callId; setCallId(r.callId);
      if (r.offline?.length) toast.info(`${r.offline.length} person(s) are offline`, 'They will get a missed-call notification.');
    } catch (e: any) { if (e?.message) toast.error('Could not start call', e.message); cleanup(); }
  }, [cleanup, ringer]); // eslint-disable-line react-hooks/exhaustive-deps

  const accept = async () => {
    if (!incoming) return;
    const c = incoming; setIncoming(null); ringer.stop();
    myIdRef.current = myId();
    try {
      await getMedia(c.callType);
      setCallType(c.callType);
      callIdRef.current = c.callId; setCallId(c.callId);
      const r = await chatSocket.emitAck<{ ok: boolean; error?: string; peers?: { userId: number; name: string; media?: any }[] }>('call:accept', { callId: c.callId });
      if (!r.ok) { toast.error('Could not join', r.error); cleanup(); return; }
      setStatus('active'); setStartedAt(Date.now());
      for (const p of r.peers || []) {
        connect(p.userId, p.name);
        if (p.media) patchPeer(p.userId, { audio: p.media.audio, video: p.media.video, screenStreamId: p.media.screenStreamId || null });
      }
      broadcastMedia();
    } catch { cleanup(); }
  };
  const decline = () => { if (incoming) chatSocket.emit('call:decline', { callId: incoming.callId }); setIncoming(null); ringer.stop(); };
  const hangUp = () => { if (callIdRef.current) chatSocket.emit('call:leave', { callId: callIdRef.current }); cleanup(); };

  const toggleMic = () => {
    const on = !mic; localRef.current?.getAudioTracks().forEach((t) => (t.enabled = on));
    mediaRef.current.mic = on; setMic(on); broadcastMedia();
  };
  const toggleCam = async () => {
    const vt = localRef.current?.getVideoTracks()[0];
    if (vt) { vt.enabled = !cam; mediaRef.current.cam = !cam; setCam(!cam); broadcastMedia(); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      const track = s.getVideoTracks()[0];
      localRef.current?.addTrack(track);
      Object.values(conns.current).forEach((c) => c.pc.addTrack(track, localRef.current!)); // renegotiates automatically
      setLocal(new MediaStream(localRef.current!.getTracks()));
      mediaRef.current.cam = true; setCam(true); broadcastMedia();
    } catch { toast.error('Camera not available'); }
  };
  const stopShare = () => {
    screenRef.current?.getTracks().forEach((t) => t.stop());
    Object.values(conns.current).forEach((c) => { c.screenSenders.forEach((s) => { try { c.pc.removeTrack(s); } catch { /* */ } }); c.screenSenders = []; });
    screenRef.current = null; setScreen(null); broadcastMedia();
  };
  const toggleShare = async () => {
    if (screenRef.current) return stopShare();
    try {
      const ds: MediaStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: { frameRate: 15 }, audio: false });
      screenRef.current = ds; setScreen(ds);
      const track = ds.getVideoTracks()[0];
      track.onended = () => stopShare();
      Object.values(conns.current).forEach((c) => { c.screenSenders.push(c.pc.addTrack(track, ds)); }); // extra track — camera keeps going
      broadcastMedia();
    } catch { /* cancelled */ }
  };

  // ── Layout ────────────────────────────────────────────────────────────────
  const peerList = Object.values(peers);
  const cameraOf = (p: Peer) => Object.values(p.streams).find((s) => s.id !== p.screenStreamId);
  const screenOf = (p: Peer) => (p.screenStreamId ? p.streams[p.screenStreamId] : undefined);
  const presenter = useMemo(() => {
    if (screen) return { name: 'You are presenting', stream: screen, mine: true };
    const p = peerList.find((x) => screenOf(x));
    return p ? { name: `${p.name} is presenting`, stream: screenOf(p)!, mine: false } : null;
  }, [screen, peers]); // eslint-disable-line react-hooks/exhaustive-deps
  const elapsed = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  const tiles = [
    ...peerList.map((p) => <Tile key={p.userId} stream={cameraOf(p)} name={p.name} showVideo={p.video && !!cameraOf(p)?.getVideoTracks().length} micOff={!p.audio} label={p.state === 'connected' || p.state === 'connecting' || !p.state ? p.name : `${p.name} (${p.state})`} />),
    <Tile key="me" stream={local || undefined} name="You" muted mirrored showVideo={cam && !!local?.getVideoTracks().length} micOff={!mic} />,
  ];

  return (
    <CallContext.Provider value={{ startCall, inCall: status !== 'idle' }}>
      {children}

      <AnimatePresence>
        {incoming && (
          <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] w-[min(380px,calc(100vw-2rem))] bg-gray-900 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center text-xl font-bold animate-pulse">{incoming.from.name.charAt(0)}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{incoming.from.name}</p>
              <p className="text-xs text-gray-300">Incoming {incoming.callType.toLowerCase()} call{incoming.title ? ` · ${incoming.title}` : ''}</p>
            </div>
            <button onClick={decline} className="h-11 w-11 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center" title="Decline"><PhoneOff className="h-5 w-5" /></button>
            <button onClick={accept} className="h-11 w-11 rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center" title="Answer">{incoming.callType === 'Video' ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}</button>
          </motion.div>
        )}
      </AnimatePresence>

      {status !== 'idle' && (
        <div className={cn('fixed z-[250] bg-gray-950 text-white shadow-2xl flex flex-col', minimised ? 'bottom-4 right-4 w-80 h-60 rounded-2xl' : 'inset-0 sm:inset-4 sm:rounded-3xl')}>
          {peerList.map((p) => <RemoteAudio key={p.userId} stream={cameraOf(p)} />)}
          <div className="flex items-center gap-2 px-4 py-3">
            <Users className="h-4 w-4 text-gray-400" />
            <p className="text-sm flex-1 truncate">{status === 'calling' && !peerList.length ? 'Calling…' : `${peerList.length + 1} in call · ${peerList.map((p) => p.name).join(', ')}`}</p>
            {status === 'active' && <span className="text-xs text-gray-400 font-mono">{clock}</span>}
            <button onClick={() => setMinimised((m) => !m)} className="p-1.5 rounded-lg hover:bg-white/10" title={minimised ? 'Expand' : 'Minimise'}>{minimised ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}</button>
          </div>

          {minimised ? (
            <div className="flex-1 px-3 pb-2 min-h-0">{presenter ? <Tile big stream={presenter.stream} name={presenter.name} showVideo /> : tiles[0]}</div>
          ) : presenter ? (
            // Presentation: shared screen on the stage, everyone's camera in the side strip.
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 px-3 pb-2">
              <div className="flex-1 min-h-0 rounded-2xl overflow-hidden"><Tile big stream={presenter.stream} name={presenter.name} showVideo label={presenter.name} /></div>
              <div className="lg:w-64 flex lg:flex-col gap-3 overflow-auto">{tiles.map((t, i) => <div key={i} className="w-48 lg:w-full flex-shrink-0">{t}</div>)}</div>
            </div>
          ) : (
            <div className={cn('flex-1 min-h-0 grid gap-3 px-3 pb-2 overflow-y-auto content-center', peerList.length === 0 ? 'grid-cols-1 max-w-3xl mx-auto w-full' : peerList.length === 1 ? 'grid-cols-1 sm:grid-cols-2' : peerList.length <= 3 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3')}>
              {status === 'calling' && !peerList.length && <div className="rounded-2xl bg-gray-800 aspect-video flex items-center justify-center text-gray-400 text-sm">Ringing…</div>}
              {tiles}
            </div>
          )}

          <div className="flex items-center justify-center gap-3 py-3">
            <button onClick={toggleMic} className={cn('h-12 w-12 rounded-full flex items-center justify-center', mic ? 'bg-white/10 hover:bg-white/20' : 'bg-red-600')} title={mic ? 'Mute' : 'Unmute'}>{mic ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}</button>
            <button onClick={toggleCam} className={cn('h-12 w-12 rounded-full flex items-center justify-center', cam ? 'bg-white/10 hover:bg-white/20' : 'bg-red-600')} title={cam ? 'Turn camera off' : 'Turn camera on'}>{cam ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}</button>
            {!minimised && <button onClick={toggleShare} className={cn('h-12 w-12 rounded-full flex items-center justify-center', screen ? 'bg-indigo-600' : 'bg-white/10 hover:bg-white/20')} title={screen ? 'Stop presenting' : 'Present your screen'}>{screen ? <MonitorX className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}</button>}
            {!minimised && <button onClick={() => setInviteOpen(true)} className="h-12 w-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20" title="Add people"><UserPlus className="h-5 w-5" /></button>}
            <button onClick={hangUp} className="h-12 w-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center" title="Leave call"><PhoneOff className="h-5 w-5" /></button>
          </div>
          {inviteOpen && callId && <InvitePicker exclude={[...peerList.map((p) => p.userId), myIdRef.current]} onClose={() => setInviteOpen(false)} onInvite={(ids) => { chatSocket.emit('call:invite', { callId, userIds: ids }); toast.success(`Calling ${ids.length} more`); setInviteOpen(false); }} />}
        </div>
      )}
    </CallContext.Provider>
  );
}

function InvitePicker({ exclude, onClose, onInvite }: { exclude: number[]; onClose: () => void; onInvite: (ids: number[]) => void }) {
  const { data: people = [] } = useQuery({ queryKey: ['erp-people'], queryFn: () => apiClient.get<{ id: number; name: string; position?: string }[]>('/erp/people') });
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<number[]>([]);
  const list = people.filter((p) => !exclude.includes(p.id) && p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 rounded-3xl">
      <div className="w-full max-w-sm bg-gray-900 border border-white/10 rounded-2xl p-4 space-y-3 max-h-[80%] flex flex-col">
        <div className="flex items-center justify-between"><p className="font-semibold">Add people to the call</p><button onClick={onClose}><X className="h-4 w-4" /></button></div>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search staff…" className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none" />
        <div className="flex-1 overflow-y-auto space-y-1">
          {list.map((p) => (
            <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 text-sm cursor-pointer">
              <input type="checkbox" checked={sel.includes(p.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))} />
              {p.name}{p.position ? <span className="text-gray-400 text-xs">· {p.position}</span> : null}
            </label>
          ))}
        </div>
        <button disabled={!sel.length} onClick={() => onInvite(sel)} className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-sm font-medium">Call {sel.length || ''}</button>
      </div>
    </div>
  );
}
