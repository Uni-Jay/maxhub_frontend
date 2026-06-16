import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentPortalApi, StudentEnrollment } from '@/services/studentService';
import { BookOpen, PlayCircle, Search } from 'lucide-react';
import { motion } from 'framer-motion';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    Active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    Completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    Dropped: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

const CourseCard: React.FC<{ enrollment: StudentEnrollment; delay: number }> = ({ enrollment, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay }}
    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
  >
    {/* Thumbnail */}
    <div className="h-36 bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center relative">
      {enrollment.course?.thumbnail ? (
        <img src={enrollment.course.thumbnail} alt="" className="w-full h-full object-cover" />
      ) : (
        <BookOpen className="h-12 w-12 text-white/60" />
      )}
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <PlayCircle className="h-12 w-12 text-white" />
      </div>
    </div>

    {/* Content */}
    <div className="p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug line-clamp-2">
          {enrollment.course?.title || 'Course'}
        </h3>
        <StatusBadge status={enrollment.status} />
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
        {enrollment.course?.description || ''}
      </p>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Progress</span>
          <span className="font-semibold text-violet-600 dark:text-violet-400">
            {enrollment.progressPercentage}%
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all"
            style={{ width: `${enrollment.progressPercentage}%` }}
          />
        </div>
      </div>

      {enrollment.grade && (
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Grade</span>
          <span className="font-bold text-gray-900 dark:text-white">{enrollment.grade}</span>
        </div>
      )}
    </div>
  </motion.div>
);

export const StudentCoursesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['student-portal-enrollments'],
    queryFn: () => studentPortalApi.getEnrollments().then((r: any) => r.data?.data as StudentEnrollment[]),
  });

  const enrollments = data || [];
  const filtered = enrollments.filter((e) => {
    const matchSearch = !search || e.course?.title?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || e.status.toLowerCase() === filter;
    return matchSearch && matchFilter;
  });

  const FILTERS = ['all', 'Active', 'Completed', 'Pending'];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Courses</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {enrollments.length} enrolled · {enrollments.filter((e) => e.status === 'Active').length} active
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-violet-300'
              }`}
            >
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No courses found</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((enrollment, i) => (
            <CourseCard key={enrollment.id} enrollment={enrollment} delay={i * 0.05} />
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentCoursesPage;
