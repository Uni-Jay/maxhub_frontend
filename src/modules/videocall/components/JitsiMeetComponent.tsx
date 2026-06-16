import { useEffect, useRef } from 'react';
import { useAuthStore } from '@store/authStore';

interface JitsiMeetProps {
  roomName: string;
  displayName?: string;
  email?: string;
  subject?: string;
  isHost?: boolean;
  startAudioMuted?: boolean;
  startVideoMuted?: boolean;
  onJoined?: () => void;
  onLeft?: () => void;
  onParticipantJoined?: (p: { id: string; displayName: string }) => void;
  onParticipantLeft?: (p: { id: string }) => void;
  onRecordingStatusChanged?: (event: { on: boolean; mode: string }) => void;
  onReadyToClose?: () => void;
  className?: string;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export function JitsiMeetComponent({
  roomName, displayName, email, subject, isHost = false,
  startAudioMuted = false, startVideoMuted = false,
  onJoined, onLeft, onParticipantJoined, onParticipantLeft,
  onRecordingStatusChanged, onReadyToClose, className = 'w-full h-full',
}: JitsiMeetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const user = useAuthStore(s => s.user);

  const resolvedName = displayName || (user ? `${(user as any).firstName} ${(user as any).lastName}` : 'MaxHub User');
  const resolvedEmail = email || (user as any)?.email || '';

  useEffect(() => {
    let mounted = true;

    const initJitsi = () => {
      if (!mounted || !containerRef.current || !window.JitsiMeetExternalAPI) return;

      // Dispose previous instance
      if (apiRef.current) { try { apiRef.current.dispose(); } catch {} apiRef.current = null; }

      const api = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName: roomName.replace(/[^a-zA-Z0-9-_]/g, '-'),
        width: '100%',
        height: '100%',
        parentNode: containerRef.current,
        userInfo: { displayName: resolvedName, email: resolvedEmail },
        configOverwrite: {
          startWithAudioMuted: startAudioMuted,
          startWithVideoMuted: startVideoMuted,
          enableWelcomePage: false,
          disableDeepLinking: true,
          prejoinPageEnabled: false,
          disableInviteFunctions: false,
          defaultLanguage: 'en',
          // Recording
          fileRecordingsEnabled: true,
          liveStreamingEnabled: false,
          // Whiteboard / Etherpad
          etherpad_base: 'https://board.net.io/',
          // Background
          virtualBackgrounds: [
            { id: 'maxhub-office', name: 'MaxHub Office', type: 'image', src: '/images/vbg-office.jpg' },
          ],
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_POWERED_BY: false,
          HIDE_INVITE_MORE_HEADER: false,
          MOBILE_APP_PROMO: false,
          TOOLBAR_ALWAYS_VISIBLE: false,
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'desktop',      // Audio, Video, Screen share
            'fullscreen',                             // Fullscreen
            'fodeviceselection',                      // Device settings
            'hangup',                                 // Leave
            'profile',                                // Profile
            'chat',                                   // In-meeting chat
            'recording',                              // Record meeting
            'etherpad',                               // Whiteboard / notes
            'sharedvideo',                            // YouTube share
            'settings',                               // Settings
            'raisehand',                              // Raise hand
            'videoquality',                           // Video quality
            'filmstrip',                              // Tile view toggle
            'invite',                                 // Invite
            'tileview',                               // Tile view
            'select-background',                      // Virtual background / blur
            'mute-everyone',                          // Host: mute all
            'whiteboard',                             // Whiteboard
            'breakoutrooms',                          // Breakout rooms
            'participants-pane',                      // Participants panel
            'security',                               // Lock meeting
            ...(isHost ? ['kick', 'remote-video-menu'] : []),
          ],
          DEFAULT_BACKGROUND: '#1a1a2e',
          DEFAULT_LOCAL_DISPLAY_NAME: resolvedName,
          DEFAULT_REMOTE_DISPLAY_NAME: 'MaxHub User',
          SUPPORT_URL: 'https://maxhub.app/support',
          APP_NAME: 'MaxHub Video',
        },
      });

      // Wire events
      if (onJoined) api.addEventListener('videoConferenceJoined', onJoined);
      if (onLeft) api.addEventListener('videoConferenceLeft', onLeft);
      if (onParticipantJoined) api.addEventListener('participantJoined', onParticipantJoined);
      if (onParticipantLeft) api.addEventListener('participantLeft', onParticipantLeft);
      if (onRecordingStatusChanged) api.addEventListener('recordingStatusChanged', onRecordingStatusChanged);
      if (onReadyToClose) api.addEventListener('readyToClose', onReadyToClose);

      if (subject) {
        api.executeCommand('subject', subject);
      }

      apiRef.current = api;
    };

    if (window.JitsiMeetExternalAPI) {
      initJitsi();
    } else {
      const existing = document.getElementById('jitsi-external-api');
      if (existing) {
        existing.addEventListener('load', initJitsi);
      } else {
        const script = document.createElement('script');
        script.id = 'jitsi-external-api';
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = initJitsi;
        document.head.appendChild(script);
      }
    }

    return () => {
      mounted = false;
      if (apiRef.current) {
        try { apiRef.current.dispose(); } catch {}
        apiRef.current = null;
      }
    };
  }, [roomName]);

  return <div ref={containerRef} className={className} />;
}
