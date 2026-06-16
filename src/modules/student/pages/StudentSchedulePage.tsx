import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentPortalApi } from '@/services/studentService';
import { Calendar, Clock, MapPin, Video, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

interface ClassScheduleItem {
  id: string;
  courseId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room?: string;
  isOnline: boolean;
  meetingLink?: string;
  course?: { title: string; code?: string };
  instructor?: { firstName: string; lastName: string };
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const dayColors: Record<string, string> = {
  Monday:    'bg-violet-500',
  Tuesday:   'bg-blue-500',
  Wednesday: 'bg-emerald-500',
  Thursday:  'bg-amber-500',
  Friday:    'bg-rose-500',
  Saturday:  'bg-purple-500',
  Sunday:    'bg-slate-500',
};

export const StudentSchedulePage: React.FC = () => {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const [activeDay, setActiveDay] = useState<string>(DAYS.includes(today) ? today : 'Monday');

  const { data, isLoading } = useQuery({
    queryKey: ['student-portal-schedule'],
    queryFn: () => studentPortalApi.getSchedule().then((r: any) => r.data?.data as ClassScheduleItem[]),
  });

  const schedule = data || [];
  const grouped = DAYS.reduce<Record<string, ClassScheduleItem[]>>((acc, day) => {
    acc[day] = schedule
      .filter((s) => s.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    return acc;
  }, {});

  const activeDayClasses = grouped[activeDay] || [];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Class Schedule</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Your weekly timetable
        </p>
      </div>

      {/* Day selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {DAYS.map((day) => {
          const count = grouped[day]?.length || 0;
          const isToday = day === today;
          const isActive = day === activeDay;
          return (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`flex-none flex flex-col items-center px-4 py-2.5 rounded-xl text-sm transition-all ${
                isActive
                  ? `${dayColors[day]} text-white shadow-sm`
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-violet-300'
              }`}
            >
              <span className="font-medium text-xs">{day.slice(0, 3).toUpperCase()}</span>
              <span className={`text-lg font-bold mt-0.5 ${isActive ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                {count}
              </span>
              {isToday && (
                <span className={`text-xs mt-0.5 ${isActive ? 'text-white/70' : 'text-violet-500'}`}>
                  Today
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Classes for selected day */}
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          {activeDay}{activeDay === today ? ' (Today)' : ''}
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : activeDayClasses.length === 0 ? (
          <div className="text-center py-14 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <Calendar className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No classes scheduled for {activeDay}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeDayClasses.map((cls, i) => (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 flex gap-4"
              >
                {/* Time column */}
                <div className="shrink-0 text-right w-16">
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{cls.startTime}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{cls.endTime}</p>
                </div>

                {/* Divider */}
                <div className="w-px bg-violet-200 dark:bg-violet-800 shrink-0" />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                      {cls.course?.title || 'Class'}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium shrink-0 ${
                      cls.isOnline
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {cls.isOnline ? 'Online' : 'In-Person'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {cls.startTime} – {cls.endTime}
                    </span>
                    {cls.isOnline && cls.meetingLink ? (
                      <a
                        href={cls.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 dark:text-violet-400 font-medium"
                      >
                        <Video className="h-3 w-3" />
                        Join Online
                      </a>
                    ) : cls.room ? (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" />
                        {cls.room}
                      </span>
                    ) : null}
                    {cls.instructor && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <BookOpen className="h-3 w-3" />
                        {cls.instructor.firstName} {cls.instructor.lastName}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly summary */}
      {schedule.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Weekly Overview</h3>
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((day) => {
              const count = grouped[day]?.length || 0;
              return (
                <div key={day} className="text-center">
                  <p className="text-xs text-gray-500 mb-1">{day.slice(0, 3)}</p>
                  <div
                    className={`mx-auto w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold cursor-pointer transition-colors ${
                      count > 0
                        ? activeDay === day
                          ? `${dayColors[day]} text-white`
                          : 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-400'
                    }`}
                    onClick={() => setActiveDay(day)}
                  >
                    {count || '–'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentSchedulePage;
