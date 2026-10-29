import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, MonitorUp, Minimize2, Maximize2, Users } from 'lucide-react';
import { chatSocket } from '@services/chatSocket';
import { erpService } from '@services/erpService';
import { toast } from '@components/ui/toaster';
import { cn } from '@utils/cn';

type CallType = 'Voice' | 'Video';
interface Peer { userId: number; name: string; stream?: MediaStream; audio: boolean; video: boolean }
interface Incoming { callId: string; from: { id: number; name: string }; callType: CallType; title?: string }
interface StartOpts { conversationId?: number; userIds?: number[]; callType: CallType }

interface Ctx { startCall: (o: StartOpts) => void; inCall: boolean }
const CallContext = createContext<Ctx>({ startCall: () => toast.error('Calls are not available here'), inCall: false });
export const useCalls = () => useContext(CallContext);

const FALLBACK_ICE: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

/** Simple two-tone ring generated with Web Audio (no audio file needed). */
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

function VideoTile({ stream, name, muted, mirrored, audioOnly }: { stream?: MediaStream; name: string; muted?: boolean; mirrored?: boolean; audioOnly?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current && stream) ref.current.srcObject = stream; }, [stream]);
  const hasVideo = !!stream?.getVideoTracks().some((t) => t.enabled && t.readyState === 'live') && !audioOnly;
  return (
    <div className="relative rounded-2xl overflow-hidden bg-gray-800 aspect-video flex items-center justify-center">
      <video ref={ref} autoPlay playsInline muted={muted} className={cn('w-full h-full object-cover', !hasVideo && 'hidden', mirrored && '-scale-x-100')} />
      {!hasVideo && <div className="h-16 w-16 rounded-full bg-indigo-600 flex items-center justify-center text-2xl font-bold text-white">{name.charAt(0).toUpperCase()}</div>}
      <span className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full">{name}</span>
    </div>
  );
}

export function CallProvider({ children }: { children: ReactNode }) {
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [callType, setCallType] = useState<CallType>('Video');
  const [status, setStatus] = useState<'idle' | 'calling' | 'active'>('idle');
  const [peers, setPeers] = useState<Record<number, Peer>>({});
  const [local, setLocal] = useState<MediaStream | null>(null);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [, tick] = useState(0);
  const pcs = useRef<Record<number, RTCPeerConnection>>({});
  const pendingIce = useRef<Record<number, RTCIceCandidateInit[]>>({});
  const iceServers = useRef<RTCIceServer[]>(FALLBACK_ICE);
  const localRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string | null>(null);
  const ringer = useRinger();

  useEffect(() => { erpService.iceServers().then((r) => { if (r?.iceServers?.length) iceServers.current = r.iceServers; }).catch(() => undefined); }, []);
  useEffect(() => { if (status !== 'active') return; const t = window.setInterval(() => tick((x) => x + 1), 1000); return () => window.clearInterval(t); }, [status]);

  const cleanup = useCallback(() => {
    ringer.stop();
    Object.values(pcs.current).forEach((pc) => { try { pc.close(); } catch { /* */ } });
    pcs.current = {}; pendingIce.current = {};
    localRef.current?.getTracks().forEach((t) => t.stop());
    localRef.current = null; callIdRef.current = null;
    setLocal(null); setPeers({}); setCallId(null); setStatus('idle'); setSharing(false); setStartedAt(null); setMinimised(false);
  }, [ringer]);

  const getMedia = async (type: CallType) => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: type === 'Video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false });
      localRef.current = s; setLocal(s); setMic(true); setCam(type === 'Video');
      return s;
    } catch (e: any) {
      toast.error(type === 'Video' ? 'Camera/microphone blocked' : 'Microphone blocked', 'Allow access in your browser settings, then try again.');
      throw e;
    }
  };

  const peerConn = useCallback((uid: number, name: string) => {
    if (pcs.current[uid]) return pcs.current[uid];
    const pc = new RTCPeerConnection({ iceServers: iceServers.current });
    localRef.current?.getTracks().forEach((t) => pc.addTrack(t, localRef.current!));
    pc.onicecandidate = (e) => { if (e.candidate && callIdRef.current) chatSocket.emit('call:signal', { callId: callIdRef.current, toUserId: uid, data: { type: 'candidate', candidate: e.candidate.toJSON() } }); };
    pc.ontrack = (e) => setPeers((p) => ({ ...p, [uid]: { ...(p[uid] || { userId: uid, name, audio: true, video: true }), stream: e.streams[0] } }));
    pc.onconnectionstatechange = () => { if (pc.connectionState === 'failed') toast.error(`Connection to ${name} failed`, 'Your network may be blocking calls. Ask an admin to configure a TURN server.'); };
    pcs.current[uid] = pc;
    setPeers((p) => ({ ...p, [uid]: p[uid] || { userId: uid, name, audio: true, video: true } }));
    return pc;
  }, []);

  const flushIce = async (uid: number) => {
    const pc = pcs.current[uid]; const q = pendingIce.current[uid] || [];
    pendingIce.current[uid] = [];
    for (const c of q) { try { await pc.addIceCandidate(c); } catch { /* */ } }
  };

  // Socket events
  useEffect(() => {
    const onIncoming = (c: Incoming) => {
      if (callIdRef.current) { chatSocket.emit('call:decline', { callId: c.callId }); return; } // already busy
      setIncoming(c); ringer.start(false);
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') new Notification(`Incoming ${c.callType.toLowerCase()} call`, { body: c.from.name });
    };
    const onSignal = async ({ callId: cid, fromUserId, data }: any) => {
      if (cid !== callIdRef.current) return;
      const pc = pcs.current[fromUserId] || peerConn(fromUserId, peers[fromUserId]?.name || 'Participant');
      try {
        if (data.type === 'offer') {
          await pc.setRemoteDescription({ type: 'offer', sdp: data.sdp });
          await flushIce(fromUserId);
          const ans = await pc.createAnswer(); await pc.setLocalDescription(ans);
          chatSocket.emit('call:signal', { callId: cid, toUserId: fromUserId, data: { type: 'answer', sdp: ans.sdp } });
          setStatus('active'); ringer.stop(); setStartedAt((s) => s || Date.now());
        } else if (data.type === 'answer') {
          await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp });
          await flushIce(fromUserId);
        } else if (data.type === 'candidate') {
          if (pc.remoteDescription) await pc.addIceCandidate(data.candidate);
          else (pendingIce.current[fromUserId] ||= []).push(data.candidate);
        }
      } catch (e) { console.warn('[call] signal error', e); }
    };
    const onJoined = ({ callId: cid, userId, name }: any) => {
      if (cid !== callIdRef.current) return;
      peerConn(userId, name); setPeers((p) => ({ ...p, [userId]: { ...(p[userId] || { audio: true, video: true, userId }), name } }));
      setStatus('active'); ringer.stop(); setStartedAt((s) => s || Date.now());
    };
    const onLeft = ({ callId: cid, userId }: any) => {
      if (cid !== callIdRef.current) return;
      try { pcs.current[userId]?.close(); } catch { /* */ }
      delete pcs.current[userId];
      setPeers((p) => { const n = { ...p }; delete n[userId]; return n; });
    };
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
    const onMedia = ({ callId: cid, userId, audio, video }: any) => { if (cid === callIdRef.current) setPeers((p) => (p[userId] ? { ...p, [userId]: { ...p[userId], audio, video } } : p)); };
    const events: [string, any][] = [['call:incoming', onIncoming], ['call:signal', onSignal], ['call:participant_joined', onJoined], ['call:participant_left', onLeft], ['call:ended', onEnded], ['call:declined', onDeclined], ['call:answered_elsewhere', onElsewhere], ['call:media_state', onMedia]];
    events.forEach(([e, h]) => chatSocket.on(e, h));
    return () => events.forEach(([e, h]) => chatSocket.off(e, h));
  }, [cleanup, peerConn, peers, ringer]);

  const startCall = useCallback(async (o: StartOpts) => {
    if (callIdRef.current) return toast.info('You are already in a call');
    if (!window.RTCPeerConnection || !navigator.mediaDevices) return toast.error('Your browser does not support calls');
    try {
      await getMedia(o.callType);
      setCallType(o.callType); setStatus('calling'); ringer.start(true);
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => undefined);
      const r = await chatSocket.emitAck<{ ok: boolean; callId?: string; error?: string; offline?: number[] }>('call:start', { conversationId: o.conversationId, targetUserIds: o.userIds, callType: o.callType });
      if (!r.ok || !r.callId) { toast.error('Could not start call', r.error); cleanup(); return; }
      callIdRef.current = r.callId; setCallId(r.callId);
      if (r.offline?.length) toast.info(`${r.offline.length} person(s) are offline`, 'They will see a missed-call notification.');
    } catch (e: any) { if (e?.message) toast.error('Could not start call', e.message); cleanup(); }
  }, [cleanup, ringer]);

  const accept = async () => {
    if (!incoming) return;
    const c = incoming; setIncoming(null); ringer.stop();
    try {
      await getMedia(c.callType);
      setCallType(c.callType);
      const r = await chatSocket.emitAck<{ ok: boolean; error?: string; peers?: { userId: number; name: string }[] }>('call:accept', { callId: c.callId });
      if (!r.ok) { toast.error('Could not join', r.error); cleanup(); return; }
      callIdRef.current = c.callId; setCallId(c.callId); setStatus('active'); setStartedAt(Date.now());
      for (const p of r.peers || []) {
        const pc = peerConn(p.userId, p.name);
        const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
        chatSocket.emit('call:signal', { callId: c.callId, toUserId: p.userId, data: { type: 'offer', sdp: offer.sdp } });
      }
    } catch { cleanup(); }
  };
  const decline = () => { if (incoming) chatSocket.emit('call:decline', { callId: incoming.callId }); setIncoming(null); ringer.stop(); };
  const hangUp = () => { if (callIdRef.current) chatSocket.emit('call:leave', { callId: callIdRef.current }); cleanup(); };

  const broadcastMedia = (audio: boolean, video: boolean) => callIdRef.current && chatSocket.emit('call:media_state', { callId: callIdRef.current, audio, video });
  const toggleMic = () => { const on = !mic; localRef.current?.getAudioTracks().forEach((t) => (t.enabled = on)); setMic(on); broadcastMedia(on, cam); };
  const toggleCam = async () => {
    const vt = localRef.current?.getVideoTracks()[0];
    if (vt) { vt.enabled = !cam; setCam(!cam); broadcastMedia(mic, !cam); return; }
    // Voice call → turn camera on
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      const track = s.getVideoTracks()[0];
      localRef.current?.addTrack(track);
      for (const [uid, pc] of Object.entries(pcs.current)) {
        pc.addTrack(track, localRef.current!);
        const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
        chatSocket.emit('call:signal', { callId: callIdRef.current, toUserId: Number(uid), data: { type: 'offer', sdp: offer.sdp } });
      }
      setLocal(new MediaStream(localRef.current!.getTracks())); setCam(true); broadcastMedia(mic, true);
    } catch { toast.error('Camera not available'); }
  };
  const toggleShare = async () => {
    const senders = Object.values(pcs.current).map((pc) => pc.getSenders().find((s) => s.track?.kind === 'video')).filter(Boolean) as RTCRtpSender[];
    if (!senders.length) return toast.info('Turn on your camera first, then share your screen');
    if (sharing) {
      const cam0 = localRef.current?.getVideoTracks()[0];
      if (cam0) senders.forEach((s) => s.replaceTrack(cam0));
      setSharing(false); return;
    }
    try {
      const ds = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
      const track = ds.getVideoTracks()[0];
      senders.forEach((s) => s.replaceTrack(track));
      track.onended = () => { const cam0 = localRef.current?.getVideoTracks()[0]; if (cam0) senders.forEach((s) => s.replaceTrack(cam0)); setSharing(false); };
      setSharing(true);
    } catch { /* cancelled */ }
  };

  const peerList = Object.values(peers);
  const elapsed = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

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

      {status !== 'idle' && callId !== undefined && (
        <div className={cn('fixed z-[250] bg-gray-950 text-white shadow-2xl flex flex-col', minimised ? 'bottom-4 right-4 w-80 rounded-2xl' : 'inset-0 sm:inset-6 sm:rounded-3xl')}>
          <div className="flex items-center gap-2 px-4 py-3">
            <Users className="h-4 w-4 text-gray-400" />
            <p className="text-sm flex-1 truncate">{status === 'calling' && !peerList.length ? 'Calling…' : peerList.map((p) => p.name).join(', ') || 'Connecting…'}</p>
            {status === 'active' && <span className="text-xs text-gray-400 font-mono">{clock}</span>}
            <button onClick={() => setMinimised((m) => !m)} className="p-1.5 rounded-lg hover:bg-white/10" title={minimised ? 'Expand' : 'Minimise'}>{minimised ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}</button>
          </div>
          <div className={cn('flex-1 grid gap-3 p-3 overflow-y-auto', minimised ? 'grid-cols-2' : peerList.length <= 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 lg:grid-cols-3')}>
            {peerList.map((p) => <VideoTile key={p.userId} stream={p.stream} name={`${p.name}${!p.audio ? ' 🔇' : ''}`} audioOnly={callType === 'Voice' && !p.video} />)}
            {!peerList.length && <div className="rounded-2xl bg-gray-800 aspect-video flex items-center justify-center text-gray-400 text-sm">Ringing…</div>}
            <VideoTile stream={local || undefined} name="You" muted mirrored={!sharing} audioOnly={!cam} />
          </div>
          <div className="flex items-center justify-center gap-3 py-4">
            <button onClick={toggleMic} className={cn('h-12 w-12 rounded-full flex items-center justify-center', mic ? 'bg-white/10 hover:bg-white/20' : 'bg-red-600')} title={mic ? 'Mute' : 'Unmute'}>{mic ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}</button>
            <button onClick={toggleCam} className={cn('h-12 w-12 rounded-full flex items-center justify-center', cam ? 'bg-white/10 hover:bg-white/20' : 'bg-white/10 opacity-70')} title={cam ? 'Camera off' : 'Camera on'}>{cam ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}</button>
            {!minimised && <button onClick={toggleShare} className={cn('h-12 w-12 rounded-full flex items-center justify-center', sharing ? 'bg-indigo-600' : 'bg-white/10 hover:bg-white/20')} title="Share screen"><MonitorUp className="h-5 w-5" /></button>}
            <button onClick={hangUp} className="h-12 w-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center" title="Hang up"><PhoneOff className="h-5 w-5" /></button>
          </div>
        </div>
      )}
    </CallContext.Provider>
  );
}
