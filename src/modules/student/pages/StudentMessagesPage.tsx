import React, { useState } from 'react';
import { MessageSquare, Send, Search, Bell, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

interface MockMessage {
  id: number;
  from: string;
  avatar: string;
  subject: string;
  preview: string;
  time: string;
  unread: boolean;
  type: 'announcement' | 'message';
}

const MOCK_MESSAGES: MockMessage[] = [
  {
    id: 1,
    from: 'Administration',
    avatar: 'A',
    subject: 'Welcome to Beadmax Vocational School',
    preview: 'We are pleased to welcome you to the new academic session. Please ensure your fees are paid before the end of the month.',
    time: 'Today',
    unread: true,
    type: 'announcement',
  },
  {
    id: 2,
    from: 'Course Instructor',
    avatar: 'I',
    subject: 'Assignment Due Reminder',
    preview: 'This is a reminder that your assignment is due by Friday, 5:00 PM. Please submit via the student portal.',
    time: 'Yesterday',
    unread: true,
    type: 'message',
  },
  {
    id: 3,
    from: 'Accounts Department',
    avatar: 'AC',
    subject: 'Fee Payment Confirmation',
    preview: 'Your fee payment for this semester has been confirmed. Your receipt number is RCP-2026-00123.',
    time: '3 days ago',
    unread: false,
    type: 'message',
  },
];

export const StudentMessagesPage: React.FC = () => {
  useAuth();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<MockMessage | null>(null);

  const messages = MOCK_MESSAGES.filter(
    (m) =>
      !search ||
      m.subject.toLowerCase().includes(search.toLowerCase()) ||
      m.from.toLowerCase().includes(search.toLowerCase())
  );

  const unreadCount = MOCK_MESSAGES.filter((m) => m.unread).length;

  if (selected) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1.5 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 font-medium"
        >
          ← Back to Messages
        </button>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6"
        >
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-bold">
              {selected.avatar}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{selected.from}</p>
              <p className="text-xs text-gray-500">{selected.time}</p>
            </div>
            {selected.type === 'announcement' && (
              <span className="ml-auto text-xs px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-full font-medium">
                Announcement
              </span>
            )}
          </div>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white mt-4 mb-3">
            {selected.subject}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {selected.preview}
          </p>

          {selected.type === 'message' && (
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-500 mb-2">Reply</p>
              <textarea
                rows={3}
                placeholder="Write your reply..."
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
              <button className="mt-2 flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors">
                <Send className="h-3.5 w-3.5" />
                Send Reply
              </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} unread messages` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <span className="w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search messages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {/* Message list */}
      {messages.length === 0 ? (
        <div className="text-center py-14 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No messages found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
          {messages.map((msg, i) => (
            <motion.button
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelected(msg)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                msg.type === 'announcement'
                  ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              }`}>
                {msg.type === 'announcement' ? <Bell className="h-4 w-4" /> : msg.avatar}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm truncate ${msg.unread ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>
                    {msg.from}
                  </p>
                  <span className="text-xs text-gray-400 shrink-0">{msg.time}</span>
                </div>
                <p className={`text-sm truncate mt-0.5 ${msg.unread ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                  {msg.subject}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{msg.preview}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {msg.unread && (
                  <span className="w-2.5 h-2.5 bg-violet-600 rounded-full" />
                )}
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Compose note */}
      <div className="flex items-center justify-center">
        <p className="text-xs text-gray-400 text-center">
          To send a message to an instructor or admin, please visit the school's front office or use the communication panel provided by your instructor.
        </p>
      </div>
    </div>
  );
};

export default StudentMessagesPage;
