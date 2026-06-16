import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Phone, PhoneOff, Video, X } from 'lucide-react';
import { videoCallService, type IncomingCall } from '@services/videoCallService';

interface Props {
  onAnswer: (call: IncomingCall) => void;
}

export function IncomingCallNotification({ onAnswer }: Props) {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data } = useQuery({
    queryKey: ['incoming-calls'],
    queryFn: () => videoCallService.getIncomingCalls(),
    refetchInterval: 3000,
    staleTime: 0,
  });

  const answerMutation = useMutation({
    mutationFn: (id: number) => videoCallService.answerCall(id),
  });

  const declineMutation = useMutation({
    mutationFn: (id: number) => videoCallService.declineCall(id),
  });

  const calls: IncomingCall[] = (data as any) || [];
  const activeCalls = calls.filter(c => c.status === 'Ringing' && !dismissed.has(c.id));

  // Ring sound
  useEffect(() => {
    if (activeCalls.length > 0) {
      if (!audioRef.current) {
        audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA==');
        audioRef.current.loop = true;
      }
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current?.pause();
    }
    return () => audioRef.current?.pause();
  }, [activeCalls.length]);

  const handleAnswer = (call: IncomingCall) => {
    answerMutation.mutate(call.id);
    setDismissed(d => new Set([...d, call.id]));
    onAnswer(call);
  };

  const handleDecline = (call: IncomingCall) => {
    declineMutation.mutate(call.id);
    setDismissed(d => new Set([...d, call.id]));
  };

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-3 pointer-events-none">
      <AnimatePresence>
        {activeCalls.map(call => {
          const callerName = call.caller
            ? `${call.caller.firstName} ${call.caller.lastName}`
            : `User #${call.callerUserId}`;
          const isVideo = call.callType === 'Video';

          return (
            <motion.div
              key={call.id}
              initial={{ opacity: 0, x: 120, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 120, scale: 0.8 }}
              className="pointer-events-auto bg-gray-900 text-white rounded-2xl shadow-2xl overflow-hidden w-80"
            >
              {/* Animated gradient bar */}
              <div className={`h-1 ${isVideo ? 'bg-indigo-500' : 'bg-green-500'} animate-pulse`} />

              <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  {/* Caller avatar with ring animation */}
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-lg font-bold">
                      {callerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <span className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 mb-0.5">
                      {isVideo ? '📹 Incoming video call' : '📞 Incoming voice call'}
                    </p>
                    <p className="font-semibold text-white truncate">{callerName}</p>
                  </div>

                  <button
                    onClick={() => setDismissed(d => new Set([...d, call.id]))}
                    className="p-1 text-gray-400 hover:text-white rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleDecline(call)}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
                  >
                    <PhoneOff className="h-4 w-4" /> Decline
                  </button>
                  <button
                    onClick={() => handleAnswer(call)}
                    className={`flex-1 flex items-center justify-center gap-2 text-white rounded-xl py-2.5 text-sm font-medium transition-colors ${isVideo ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    {isVideo ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                    Answer
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
