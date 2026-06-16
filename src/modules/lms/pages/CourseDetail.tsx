import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, BookOpen, Users, Clock, Star, Play, CheckCircle2,
  Lock, Award, FileText, ChevronDown, ChevronRight, Download,
} from 'lucide-react';

const COURSE = {
  id: 1,
  title: 'SAT Mathematics Prep',
  code: 'KS-MATH-01',
  instructor: { name: 'Mr. James Eke', title: 'Senior Math Instructor', avatar: 'JE', courses: 4, students: 164 },
  category: 'Mathematics',
  students: 48,
  duration: '12 weeks',
  rating: 4.8,
  reviews: 124,
  progress: 72,
  status: 'Ongoing',
  description: 'Comprehensive SAT Math preparation covering algebra, geometry, and advanced problem-solving. This course is designed for students targeting 650+ in the Math section. You will work through hundreds of practice problems and receive detailed explanations for every concept.',
  objectives: [
    'Master all SAT Math topics including algebra, geometry, and data analysis',
    'Develop problem-solving speed for time-pressured exam conditions',
    'Complete 5 full-length practice exams with score reports',
    'Learn score-maximizing strategies for different question types',
  ],
  color: 'from-indigo-500 to-violet-600',
  modules: [
    {
      id: 1, title: 'Heart of Algebra', lessons: [
        { id: 1, title: 'Linear Equations & Inequalities', duration: '45 min', type: 'video', done: true },
        { id: 2, title: 'Systems of Equations', duration: '40 min', type: 'video', done: true },
        { id: 3, title: 'Linear Functions & Graphs', duration: '35 min', type: 'video', done: true },
        { id: 4, title: 'Algebra Practice Quiz', duration: '20 min', type: 'quiz', done: false },
      ],
    },
    {
      id: 2, title: 'Problem Solving & Data Analysis', lessons: [
        { id: 5, title: 'Ratios, Rates & Proportions', duration: '40 min', type: 'video', done: false },
        { id: 6, title: 'Percentages & Statistics', duration: '45 min', type: 'video', done: false },
        { id: 7, title: 'Scatterplots & Tables', duration: '35 min', type: 'video', done: false },
      ],
    },
    {
      id: 3, title: 'Passport to Advanced Math', locked: true, lessons: [
        { id: 8, title: 'Quadratic Equations', duration: '50 min', type: 'video', done: false },
        { id: 9, title: 'Polynomial Operations', duration: '45 min', type: 'video', done: false },
        { id: 10, title: 'Exponential Functions', duration: '40 min', type: 'video', done: false },
      ],
    },
    {
      id: 4, title: 'Additional Topics in Math', locked: true, lessons: [
        { id: 11, title: 'Geometry Fundamentals', duration: '55 min', type: 'video', done: false },
        { id: 12, title: 'Trigonometry Basics', duration: '40 min', type: 'video', done: false },
        { id: 13, title: 'Final Practice Exam', duration: '90 min', type: 'exam', done: false },
      ],
    },
  ],
};

const LESSON_ICON: Record<string, React.ElementType> = {
  video: Play,
  quiz: FileText,
  exam: FileText,
  document: Download,
};

export function CourseDetail() {
  useParams();
  const [openModules, setOpenModules] = useState<Set<number>>(new Set([1, 2]));
  const [enrolled] = useState(true);

  const toggleModule = (modId: number) => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      next.has(modId) ? next.delete(modId) : next.add(modId);
      return next;
    });
  };

  const allLessons = COURSE.modules.flatMap((m) => m.lessons);
  const doneLessons = allLessons.filter((l) => l.done).length;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link to="/lms/courses" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition">
        <ArrowLeft className="w-4 h-4" /> Back to Courses
      </Link>

      {/* Hero */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${COURSE.color} p-6 text-white`}>
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full" />
        <div className="absolute -right-4 top-16 w-32 h-32 bg-white/5 rounded-full" />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded-full">{COURSE.category}</span>
              <h1 className="text-2xl font-bold mt-2 mb-1">{COURSE.title}</h1>
              <p className="text-sm text-white/80 mb-4 max-w-lg">{COURSE.description.slice(0, 140)}...</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/90">
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{COURSE.students} students</span>
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{COURSE.duration}</span>
                <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-300" />{COURSE.rating} ({COURSE.reviews} reviews)</span>
              </div>
            </div>
          </div>
          {enrolled && (
            <div className="mt-5">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-white/80">Your Progress</span>
                <span className="font-semibold">{doneLessons}/{allLessons.length} lessons • {COURSE.progress}%</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-2 bg-white rounded-full" style={{ width: `${COURSE.progress}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Curriculum */}
        <div className="lg:col-span-2 space-y-4">
          {/* What you'll learn */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-500" />
              What you'll learn
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COURSE.objectives.map((obj, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">{obj}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Curriculum modules */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-violet-500" />
              Course Curriculum
              <span className="ml-auto text-xs text-gray-400 font-normal">{allLessons.length} lessons</span>
            </h2>
            <div className="space-y-2">
              {COURSE.modules.map((mod) => (
                <div key={mod.id} className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleModule(mod.id)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-left"
                  >
                    <div className="flex items-center gap-2">
                      {mod.locked ? (
                        <Lock className="w-4 h-4 text-gray-400" />
                      ) : (
                        <BookOpen className="w-4 h-4 text-indigo-500" />
                      )}
                      <span className={`text-sm font-medium ${mod.locked ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                        {mod.title}
                      </span>
                      <span className="text-xs text-gray-400">{mod.lessons.length} lessons</span>
                    </div>
                    {openModules.has(mod.id) ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  {openModules.has(mod.id) && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="divide-y divide-gray-50 dark:divide-gray-700"
                    >
                      {mod.lessons.map((lesson) => {
                        const LIcon = LESSON_ICON[lesson.type] ?? Play;
                        return (
                          <div
                            key={lesson.id}
                            className={`flex items-center gap-3 px-4 py-3 ${mod.locked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer'}`}
                          >
                            {lesson.done ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            ) : mod.locked ? (
                              <Lock className="w-4 h-4 text-gray-300 flex-shrink-0" />
                            ) : (
                              <LIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                            )}
                            <span className={`text-sm flex-1 ${lesson.done ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300'}`}>
                              {lesson.title}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                lesson.type === 'exam' ? 'bg-rose-100 text-rose-600' :
                                lesson.type === 'quiz' ? 'bg-amber-100 text-amber-600' :
                                'bg-indigo-50 text-indigo-500'
                              }`}>{lesson.type}</span>
                              <span className="text-xs text-gray-400">{lesson.duration}</span>
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Instructor card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Instructor</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${COURSE.color} flex items-center justify-center text-white font-bold`}>
                {COURSE.instructor.avatar}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{COURSE.instructor.name}</p>
                <p className="text-xs text-gray-500">{COURSE.instructor.title}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <p className="text-xl font-bold text-gray-900 dark:text-white">{COURSE.instructor.courses}</p>
                <p className="text-xs text-gray-500">Courses</p>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <p className="text-xl font-bold text-gray-900 dark:text-white">{COURSE.instructor.students}</p>
                <p className="text-xs text-gray-500">Students</p>
              </div>
            </div>
          </div>

          {/* Enroll / continue card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">Free</p>
              <p className="text-xs text-gray-400 mt-0.5">Included in your plan</p>
            </div>
            {enrolled ? (
              <button className={`w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r ${COURSE.color} flex items-center justify-center gap-2 hover:opacity-90 transition`}>
                <Play className="w-4 h-4" /> Continue Learning
              </button>
            ) : (
              <button className={`w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r ${COURSE.color} hover:opacity-90 transition`}>
                Enroll Now
              </button>
            )}
            <Link to="/lms/my-enrollments" className="mt-3 flex items-center justify-center gap-1 text-xs text-indigo-600 hover:text-indigo-700">
              View my enrollments
            </Link>
          </div>

          {/* Course info */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Course Details</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Duration', value: COURSE.duration },
                { label: 'Lessons', value: `${allLessons.length} lessons` },
                { label: 'Students', value: COURSE.students },
                { label: 'Rating', value: `${COURSE.rating} ⭐ (${COURSE.reviews} reviews)` },
                { label: 'Certificate', value: 'Yes — upon completion' },
                { label: 'Language', value: 'English' },
              ].map((d) => (
                <div key={d.label} className="flex justify-between">
                  <span className="text-gray-500">{d.label}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CourseDetail;
