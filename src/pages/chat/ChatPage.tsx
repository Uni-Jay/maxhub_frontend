import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { GlassCard } from "../../components/ui/GlassCard";
import { AppButton } from "../../components/ui/AppButton";
import { useSocket } from "../../hooks/useSocket";
const stunUrl = import.meta.env.VITE_WEBRTC_STUN_URL || "stun:stun.l.google.com:19302";
const turnUrl = import.meta.env.VITE_WEBRTC_TURN_URL;
const turnUsername = import.meta.env.VITE_WEBRTC_TURN_USERNAME;
const turnCredential = import.meta.env.VITE_WEBRTC_TURN_CREDENTIAL;

const rtcConfig = {
  iceServers: [
    { urls: stunUrl },
    ...(turnUrl && turnUsername && turnCredential
      ? [
          {
            urls: turnUrl,
            username: turnUsername,
            credential: turnCredential,
          },
        ]
      : []),
  ],
};

type Room = { id: string; name: string; type: string };
type Message = {
  id: string;
  roomId: string;
  senderId: string;
  senderRole: string;
  content: string;
  createdAt: string;
};
type RoomParticipant = {
  socketId: string;
  user: {
    userId: string;
    name: string;
    role: string;
  } | null;
};

function VideoTile({ title, stream, muted }: { title: string; stream: MediaStream; muted?: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="overflow-hidden rounded-xl border border-white/20 bg-black/40">
      <video ref={videoRef} autoPlay playsInline muted={muted} className="h-40 w-full object-cover" />
      <p className="px-3 py-2 text-xs text-slate-200">{title}</p>
    </div>
  );
}

export function ChatPage() {
  const { user } = useAuth();
  const { socket, status, errorMessage } = useSocket();
  const queryClient = useQueryClient();
  const [activeRoom, setActiveRoom] = useState<string>("company-announcements");
  const [message, setMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [isMeetingActive, setIsMeetingActive] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});

  const roomsQuery = useQuery({
    queryKey: ["chat-rooms"],
    queryFn: async () => {
      const response = await api.get("/chat/rooms");
      return response.data.data as Room[];
    },
  });

  const messagesQuery = useQuery({
    queryKey: ["chat-messages", activeRoom],
    queryFn: async () => {
      const response = await api.get(`/chat/messages/${activeRoom}`);
      return response.data.data as Message[];
    },
  });

  const closeAllPeerConnections = () => {
    Object.values(peerConnections.current).forEach((peerConnection) => peerConnection.close());
    peerConnections.current = {};
    setRemoteStreams({});
  };

  const stopLocalStream = () => {
    if (!localStream) return;
    localStream.getTracks().forEach((track) => track.stop());
    setLocalStream(null);
  };

  const createPeerConnection = (peerSocketId: string, activeLocalStream: MediaStream) => {
    if (peerConnections.current[peerSocketId]) {
      return peerConnections.current[peerSocketId];
    }

    const peerConnection = new RTCPeerConnection(rtcConfig);
    peerConnections.current[peerSocketId] = peerConnection;

    activeLocalStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, activeLocalStream);
    });

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) return;
      socket.emit("webrtc-ice-candidate", {
        to: peerSocketId,
        room: activeRoom,
        candidate: event.candidate,
      });
    };

    peerConnection.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStreams((previous) => ({
        ...previous,
        [peerSocketId]: stream,
      }));
    };

    peerConnection.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(peerConnection.connectionState)) {
        peerConnection.close();
        delete peerConnections.current[peerSocketId];
        setRemoteStreams((previous) => {
          const next = { ...previous };
          delete next[peerSocketId];
          return next;
        });
      }
    };

    return peerConnection;
  };

  const startMeeting = async () => {
    if (!user || isMeetingActive) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    setLocalStream(stream);
    setIsMeetingActive(true);

    participants
      .filter((participant) => participant.socketId !== socket.id)
      .forEach(async (participant) => {
        const peerConnection = createPeerConnection(participant.socketId, stream);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit("webrtc-offer", {
          to: participant.socketId,
          room: activeRoom,
          offer,
        });
      });
  };

  const endMeeting = () => {
    setIsMeetingActive(false);
    closeAllPeerConnections();
    stopLocalStream();
  };

  useEffect(() => {
    if (!user) return;

    if (!socket.connected) {
      socket.connect();
      socket.emit("presence-online", { userId: user.id, name: user.fullName, role: user.role });
    }

    socket.emit("join-room", activeRoom);

    const onMessage = (payload: Message) => {
      if (payload.roomId === activeRoom || (payload as any).room === activeRoom) {
        queryClient.setQueryData(["chat-messages", activeRoom], (current: Message[] = []) => [...current, payload]);
      }
    };

    const onRoomParticipants = (payload: { room: string; participants: RoomParticipant[] }) => {
      if (payload.room !== activeRoom) return;
      setParticipants(payload.participants);
    };

    const onRoomJoined = (payload: { room: string; socketId: string; user: RoomParticipant["user"] }) => {
      if (payload.room !== activeRoom) return;
      setParticipants((previous) => {
        if (previous.some((item) => item.socketId === payload.socketId)) return previous;
        return [...previous, { socketId: payload.socketId, user: payload.user }];
      });

      if (!isMeetingActive || !localStream || payload.socketId === socket.id) return;

      const inviteNewPeer = async () => {
        const peerConnection = createPeerConnection(payload.socketId, localStream);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit("webrtc-offer", {
          to: payload.socketId,
          room: activeRoom,
          offer,
        });
      };

      inviteNewPeer();
    };

    const onRoomLeft = (payload: { room: string; socketId: string }) => {
      if (payload.room !== activeRoom) return;
      setParticipants((previous) => previous.filter((item) => item.socketId !== payload.socketId));

      const peerConnection = peerConnections.current[payload.socketId];
      if (peerConnection) {
        peerConnection.close();
        delete peerConnections.current[payload.socketId];
      }

      setRemoteStreams((previous) => {
        const next = { ...previous };
        delete next[payload.socketId];
        return next;
      });
    };

    const onWebRtcOffer = async (payload: { from: string; room: string; offer: RTCSessionDescriptionInit }) => {
      if (payload.room !== activeRoom || !isMeetingActive || !localStream) return;

      const peerConnection = createPeerConnection(payload.from, localStream);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit("webrtc-answer", {
        to: payload.from,
        room: activeRoom,
        answer,
      });
    };

    const onWebRtcAnswer = async (payload: { from: string; room: string; answer: RTCSessionDescriptionInit }) => {
      if (payload.room !== activeRoom) return;
      const peerConnection = peerConnections.current[payload.from];
      if (!peerConnection) return;
      await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.answer));
    };

    const onIceCandidate = async (payload: { from: string; room: string; candidate: RTCIceCandidateInit }) => {
      if (payload.room !== activeRoom) return;
      const peerConnection = peerConnections.current[payload.from];
      if (!peerConnection) return;
      await peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
    };

    const onTyping = (payload: { room: string; userId: string; typing: boolean }) => {
      if (payload.room !== activeRoom || payload.userId === user.id) return;
      setTypingUsers((prev) => ({ ...prev, [payload.userId]: payload.typing }));
    };

    socket.on("chat-message", onMessage);
    socket.on("room-participants", onRoomParticipants);
    socket.on("room-user-joined", onRoomJoined);
    socket.on("room-user-left", onRoomLeft);
    socket.on("webrtc-offer", onWebRtcOffer);
    socket.on("webrtc-answer", onWebRtcAnswer);
    socket.on("webrtc-ice-candidate", onIceCandidate);
    socket.on("typing", onTyping);

    return () => {
      socket.emit("leave-room", activeRoom);
      socket.off("chat-message", onMessage);
      socket.off("room-participants", onRoomParticipants);
      socket.off("room-user-joined", onRoomJoined);
      socket.off("room-user-left", onRoomLeft);
      socket.off("webrtc-offer", onWebRtcOffer);
      socket.off("webrtc-answer", onWebRtcAnswer);
      socket.off("webrtc-ice-candidate", onIceCandidate);
      socket.off("typing", onTyping);
    };
  }, [activeRoom, isMeetingActive, localStream, queryClient, user]);

  useEffect(() => {
    return () => {
      endMeeting();
    };
  }, []);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/chat/messages/${activeRoom}`, {
        content: message,
      });

      const payload = response.data.data;
      socket.emit("chat-message", {
        room: activeRoom,
        message: payload,
      });
      return payload;
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages", activeRoom] });
    },
  });

  const typingText = useMemo(() => {
    const count = Object.values(typingUsers).filter(Boolean).length;
    if (!count) return "";
    return `${count} user typing...`;
  }, [typingUsers]);

  const participantCount = participants.length;

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <GlassCard className="h-fit p-4">
        <h2 className="font-serif text-xl text-white">Team Chat</h2>
        <div className="mt-3 space-y-2">
          {(roomsQuery.data || []).map((room) => (
            <button
              type="button"
              key={room.id}
              onClick={() => setActiveRoom(room.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                activeRoom === room.id ? "bg-[#1f73bf] text-white" : "bg-white/5 text-slate-300"
              }`}
            >
              {room.name}
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-white">{activeRoom}</h2>
            <p className="mt-1 text-xs text-slate-300">Realtime messaging, typing indicators, and group video meetings.</p>
            {status === "connected" ? (
              <p className="mt-1 text-xs text-emerald-400">● Connected</p>
            ) : status === "connecting" ? (
              <p className="mt-1 text-xs text-amber-400">⟳ Reconnecting...</p>
            ) : (
              <p className="mt-1 text-xs text-red-400">● Disconnected</p>
            )}
            {errorMessage && <p className="text-xs text-red-300">{errorMessage}</p>}
            <p className="text-xs text-slate-400">Participants in room: {participantCount}</p>
          </div>
          <div className="w-40">
            {isMeetingActive ? (
              <AppButton
                type="button"
                onClick={endMeeting}
                className="bg-gradient-to-r from-rose-700 via-rose-600 to-rose-500"
              >
                End Meeting
              </AppButton>
            ) : (
              <AppButton type="button" onClick={() => startMeeting()}>
                Start Meeting
              </AppButton>
            )}
          </div>
        </div>

        {isMeetingActive ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {localStream ? <VideoTile title="You" stream={localStream} muted /> : null}
            {Object.entries(remoteStreams).map(([socketId, stream]) => (
              <VideoTile key={socketId} title={`Participant ${socketId.slice(0, 5)}`} stream={stream} />
            ))}
          </div>
        ) : null}

        <div className="mt-4 h-[380px] space-y-2 overflow-y-auto rounded-xl border border-white/15 bg-black/10 p-3">
          {(messagesQuery.data || []).map((item) => (
            <div key={item.id} className="rounded-lg border border-white/10 bg-white/5 p-2 text-sm">
              <p className="text-xs text-slate-300">{item.senderRole}</p>
              <p className="text-slate-100">{item.content}</p>
            </div>
          ))}
        </div>

        <p className="mt-2 h-5 text-xs text-emerald-300">{typingText}</p>

        <div className="mt-2 flex gap-2">
          <input
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              if (user) {
                socket.emit("typing", { room: activeRoom, userId: user.id, typing: event.target.value.length > 0 });
              }
            }}
            placeholder="Send a message"
            className="h-11 flex-1 rounded-xl border border-white/20 bg-white/10 px-3 text-white outline-none"
          />
          <div className="w-28">
            <AppButton
              type="button"
              loading={sendMutation.isPending}
              onClick={() => {
                if (!message.trim()) return;
                sendMutation.mutate();
              }}
            >
              Send
            </AppButton>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
