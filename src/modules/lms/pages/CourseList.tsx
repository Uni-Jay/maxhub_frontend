import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BookOpen, Search, Users, Clock, Play,
  Plus, Award, BookMarked, Loader2,
} from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { useAuth } from '@/contexts/AuthContext';

const COURSE_COLORS = [
  'from-indigo-500 to-violet-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-purple-500 to-indigo-600',
  'from-cyan-500 to-blue-600',
];

const STATUS_STYLES: Record<string, string> = {
  Ongoing: 'bg-emerald-100 text-emerald-700',
  Published: 'bg-indigo-100 text-indigo-700',
  Draft: 'bg-gray-100 text-gray-600',
  Completed: 'bg-violet-100 text-violet-700',
  Archived: 'bg-amber-100 text-amber-700',
};

export function CourseList() {
  const { hasPermission } = useAuth();
  const canCreateCourse = hasPermission('lms.course.create.all') || hasPermission('lms.course.create.own_department');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const { data: coursesData, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => apiClient.getRaw('/courses', { page: 1, limit: 100 }),
  });

  const { data: stats } = useQuery({
    queryKey: ['courses', 'stats'],
    queryFn: () => apiClient.get<{ total: number; totalEnrollments: number; ongoing: number; completed: number }>('/courses/stats/overview'),
  });

  const courses: any[] = (coursesData as any)?.data ?? [];

  const categories = ['All', ...Array.from(new Set(courses.map(c => c.department?.name ?? 'General').filter(Boolean)))];

  const filtered = courses.filter((c) => {
    const u = c.instructor?.user;
    const instructorName = u ? `${u.firstName} ${u.lastName}` : '';
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      instructorName.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === 'All' || (c.department?.name ?? 'General') === category;
    return matchesSearch && matchesCat;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Courses</h1>
          <p className="text-sm text-gray-500 mt-0.5">Kurios SAT — Learning Management System</p>
        </div>
        {canCreateCourse && (
          <Link
            to="/lms/courses/create"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
          >
            <Plus className="w-4 h-4" /> New Course
          </Link>
        )}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Courses', value: stats?.total?.toString() ?? '—', icon: BookOpen, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Total Enrollments', value: stats?.totalEnrollments?.toString() ?? '—', icon: Users, color: 'text-violet-600 bg-violet-50' },
          { label: 'Ongoing', value: stats?.ongoing?.toString() ?? '—', icon: Clock, color: 'text-amber-600 bg-amber-50' },
          { label: 'Completed', value: stats?.completed?.toString() ?? '—', icon: Award, color: 'text-emerald-600 bg-emerald-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${s.color}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses or instructors..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition ${
                category === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((course, i) => {
          const color = COURSE_COLORS[i % COURSE_COLORS.length];
          const u = course.instructor?.user;
          const instructor = u
            ? `${u.firstName} ${u.lastName}`
            : course.instructor
              ? `${course.instructor.firstName ?? ''} ${course.instructor.lastName ?? ''}`.trim()
              : 'Unknown Instructor';
          const initials = instructor.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
          const deptName = course.department?.name ?? 'General';

          return (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/lms/courses/${course.uuid ?? course.id}`}>
                <div className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-lg transition">
                  <div className={`h-3 w-full bg-gradient-to-r ${color}`} />
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-400 font-medium">{deptName}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[course.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {course.status}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 transition text-sm leading-snug mb-1">
                      {course.title}
                    </h3>
                    <p className="text-xs text-gray-500 mb-4 line-clamp-2">
                      {course.description || 'No description available.'}
                    </p>
                    <div className="flex items-center gap-2 mb-4">
                      <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                        {initials}
                      </div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{instructor}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {course.enrollmentCount ?? 0} students
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {course.duration ?? 'TBD'}
                      </span>
                      <span>{Number(course.fee) > 0 ? `₦${Number(course.fee).toLocaleString()}` : 'Free'}</span>
                    </div>
                    {(course.status === 'Published' || course.status === 'Draft') && (
                      <button className={`w-full mt-3 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r ${color} flex items-center justify-center gap-2 hover:opacity-90 transition`}>
                        <Play className="w-3.5 h-3.5" />
                        {course.status === 'Draft' ? 'Preview' : 'Enroll Now'}
                      </button>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <BookMarked className="w-12 h-12 mb-3" />
          <p className="font-medium">{courses.length === 0 ? 'No courses yet' : 'No courses found'}</p>
          <p className="text-sm mt-1">
            {courses.length === 0 ? 'Create your first course to get started' : 'Try a different search or category'}
          </p>
        </div>
      )}
    </div>
  );
}

export default CourseList;
