import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Search, Users, Clock, Star, Play,
  Plus, Award, BookMarked,
} from 'lucide-react';

const COURSES = [
  {
    id: 1, title: 'SAT Mathematics Prep', code: 'KS-MATH-01',
    instructor: 'Mr. James Eke', category: 'Mathematics',
    students: 48, duration: '12 weeks', rating: 4.8, reviews: 124,
    progress: 72, fee: 0, status: 'Ongoing',
    description: 'Comprehensive SAT Math preparation covering algebra, geometry, and data analysis.',
    color: 'from-indigo-500 to-violet-600',
    tags: ['Algebra', 'Geometry', 'Data Analysis'],
  },
  {
    id: 2, title: 'SAT English & Writing', code: 'KS-ENG-01',
    instructor: 'Ms. Grace Adeyemi', category: 'English',
    students: 35, duration: '10 weeks', rating: 4.6, reviews: 98,
    progress: 55, fee: 0, status: 'Ongoing',
    description: 'Master SAT Evidence-Based Reading and Writing with focused practice sessions.',
    color: 'from-emerald-500 to-teal-600',
    tags: ['Reading', 'Writing', 'Grammar'],
  },
  {
    id: 3, title: 'SAT Critical Reading', code: 'KS-READ-01',
    instructor: 'Dr. Ade Okonkwo', category: 'Reading',
    students: 29, duration: '8 weeks', rating: 4.9, reviews: 87,
    progress: 88, fee: 0, status: 'Ongoing',
    description: 'Develop advanced critical reading skills and passage analysis strategies.',
    color: 'from-amber-500 to-orange-600',
    tags: ['Comprehension', 'Analysis', 'Strategy'],
  },
  {
    id: 4, title: 'SAT Test Strategies', code: 'KS-STRAT-01',
    instructor: 'Prof. Fatima Yusuf', category: 'Strategy',
    students: 52, duration: '6 weeks', rating: 4.7, reviews: 156,
    progress: 40, fee: 0, status: 'Ongoing',
    description: 'Learn proven test-taking strategies, time management, and score maximization.',
    color: 'from-rose-500 to-pink-600',
    tags: ['Time Management', 'Test Tactics', 'Mock Tests'],
  },
  {
    id: 5, title: 'SAT Full Preparation', code: 'KS-FULL-01',
    instructor: 'Dr. Emeka Nwachukwu', category: 'Full Course',
    students: 65, duration: '20 weeks', rating: 4.9, reviews: 203,
    progress: 0, fee: 0, status: 'Published',
    description: 'The complete SAT preparation bundle covering all sections with full mock exams.',
    color: 'from-purple-500 to-indigo-600',
    tags: ['All Subjects', 'Mock Exams', 'Certificates'],
  },
  {
    id: 6, title: 'Advanced SAT Math', code: 'KS-MATH-02',
    instructor: 'Mr. James Eke', category: 'Mathematics',
    students: 22, duration: '8 weeks', rating: 4.5, reviews: 45,
    progress: 0, fee: 0, status: 'Draft',
    description: 'Advanced topics for students targeting 700+ in SAT Math section.',
    color: 'from-cyan-500 to-blue-600',
    tags: ['Advanced Algebra', 'Trigonometry', 'Problem Solving'],
  },
];

const CATEGORIES = ['All', 'Mathematics', 'English', 'Reading', 'Strategy', 'Full Course'];
const STATUS_STYLES: Record<string, string> = {
  Ongoing: 'bg-emerald-100 text-emerald-700',
  Published: 'bg-indigo-100 text-indigo-700',
  Draft: 'bg-gray-100 text-gray-600',
  Completed: 'bg-violet-100 text-violet-700',
  Archived: 'bg-amber-100 text-amber-700',
};

export function CourseList() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = COURSES.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.instructor.toLowerCase().includes(search.toLowerCase());
    const matchesCat = category === 'All' || c.category === category;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Courses</h1>
          <p className="text-sm text-gray-500 mt-0.5">Kurios SAT — Learning Management System</p>
        </div>
        <Link to="/lms/courses/create"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">
          <Plus className="w-4 h-4" /> New Course
        </Link>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Courses', value: COURSES.length.toString(), icon: BookOpen, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Active Students', value: '164', icon: Users, color: 'text-violet-600 bg-violet-50' },
          { label: 'Avg Rating', value: '4.7', icon: Star, color: 'text-amber-600 bg-amber-50' },
          { label: 'Certificates', value: '127', icon: Award, color: 'text-emerald-600 bg-emerald-50' },
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
          {CATEGORIES.map((cat) => (
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
        {filtered.map((course, i) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link to={`/lms/courses/${course.id}`}>
              <div className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-lg transition">
                {/* Course banner */}
                <div className={`h-3 w-full bg-gradient-to-r ${course.color}`} />

                <div className="p-5">
                  {/* Status + Category */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-400 font-medium">{course.category}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[course.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {course.status}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 transition text-sm leading-snug mb-1">
                    {course.title}
                  </h3>
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{course.description}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {course.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-md">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Instructor + meta */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${course.color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {course.instructor.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{course.instructor}</p>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{course.students} students</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{course.duration}</span>
                    <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400" />{course.rating}</span>
                  </div>

                  {/* Progress bar */}
                  {course.progress > 0 && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-400">Progress</span>
                        <span className="font-medium text-gray-600 dark:text-gray-300">{course.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full bg-gradient-to-r ${course.color}`}
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action */}
                  {course.progress === 0 && (
                    <button className={`w-full mt-2 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r ${course.color} flex items-center justify-center gap-2 hover:opacity-90 transition`}>
                      <Play className="w-3.5 h-3.5" />
                      {course.status === 'Draft' ? 'Preview' : 'Enroll Now'}
                    </button>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <BookMarked className="w-12 h-12 mb-3" />
          <p className="font-medium">No courses found</p>
          <p className="text-sm mt-1">Try a different search or category</p>
        </div>
      )}
    </div>
  );
}

export default CourseList;
