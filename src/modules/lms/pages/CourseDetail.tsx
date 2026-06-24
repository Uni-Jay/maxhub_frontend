import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft, BookOpen, Users, Clock, CheckCircle2,
  Lock, Award, ChevronDown, ChevronRight, Plus, Loader2,
  GraduationCap, FileText, Trash2, X, Pencil,
} from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { useAuth } from '@/contexts/AuthContext';

type Tab = 'curriculum' | 'exams' | 'students' | 'certificates';

const STATUS_STYLES: Record<string, string> = {
  Ongoing: 'bg-emerald-100 text-emerald-700',
  Published: 'bg-indigo-100 text-indigo-700',
  Draft: 'bg-gray-100 text-gray-600',
  Completed: 'bg-violet-100 text-violet-700',
  Archived: 'bg-amber-100 text-amber-700',
  Cancelled: 'bg-rose-100 text-rose-700',
};

export function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuth();
  const [tab, setTab] = useState<Tab>('curriculum');
  const [openModules, setOpenModules] = useState<Set<number>>(new Set());

  const { data: course, isLoading } = useQuery({
    queryKey: ['courses', id],
    queryFn: () => apiClient.get<any>(`/courses/${id}`),
    enabled: !!id,
  });

  const inOwnDept = !!course && !!user?.departmentId && String(course.departmentId) === String(user.departmentId);
  const canManageCourse = hasPermission('lms.course.update.all') || (hasPermission('lms.course.update.own_department') && inOwnDept);
  const canDeleteCourse = hasPermission('lms.course.delete.all') || (hasPermission('lms.course.delete.own_department') && inOwnDept);
  const canManageExams = hasPermission('lms.exam.update.all') || (hasPermission('lms.exam.update.own_department') && inOwnDept);
  const canManageEnrollments = hasPermission('lms.enrollment.create.all') || (hasPermission('lms.enrollment.create.own_department') && inOwnDept);
  const canIssueCertificates = hasPermission('lms.certificate.issue.all') || (hasPermission('lms.certificate.issue.own_department') && inOwnDept);
  const isAdminView = canManageCourse || canManageExams || canManageEnrollments || canIssueCertificates;

  const deleteCourse = useMutation({
    mutationFn: () => apiClient.delete(`/courses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      navigate('/lms/courses', { replace: true });
    },
  });

  if (isLoading || !course) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const modules = course.modules ?? [];
  const instructorUser = course.instructor?.user;
  const instructorName = course.instructorName
    || (instructorUser
      ? `${instructorUser.firstName} ${instructorUser.lastName}`
      : course.instructor
        ? `${course.instructor.firstName ?? ''} ${course.instructor.lastName ?? ''}`.trim()
        : 'Unassigned');
  const initials = instructorName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '—';

  const toggleModule = (modId: number) => {
    setOpenModules(prev => {
      const next = new Set(prev);
      next.has(modId) ? next.delete(modId) : next.add(modId);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <Link to="/lms/courses" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition">
        <ArrowLeft className="w-4 h-4" /> Back to Courses
      </Link>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-6 text-white">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium bg-white/20 px-2 py-0.5 rounded-full">{course.department?.name ?? 'General'}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[course.status] ?? 'bg-white/20'}`}>{course.status}</span>
              </div>
              <h1 className="text-2xl font-bold mt-2 mb-1">{course.title}</h1>
              <p className="text-sm text-white/80 mb-4 max-w-lg">{course.description || 'No description available.'}</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/90">
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{course.enrollmentCount ?? 0} enrolled</span>
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{course.duration} hrs</span>
                <span>{Number(course.fee) > 0 ? `₦${Number(course.fee).toLocaleString()}` : 'Free'}</span>
              </div>
            </div>
            {(canManageCourse || canDeleteCourse) && (
              <div className="flex items-center gap-2 flex-shrink-0">
                {canManageCourse && (
                  <Link
                    to={`/lms/courses/${id}/edit`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-sm font-medium transition"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Link>
                )}
                {canDeleteCourse && (
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this course? This cannot be undone.')) deleteCourse.mutate();
                    }}
                    disabled={deleteCourse.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-rose-500/80 text-sm font-medium transition disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {deleteCourse.isPending ? 'Deleting…' : 'Delete'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-100 dark:border-gray-700">
        {([
          { key: 'curriculum', label: 'Curriculum', icon: BookOpen },
          ...(isAdminView ? [{ key: 'exams' as Tab, label: 'Exams', icon: FileText }] : []),
          ...(isAdminView ? [{ key: 'students' as Tab, label: 'Students', icon: Users }] : []),
          ...(isAdminView ? [{ key: 'certificates' as Tab, label: 'Certificates', icon: Award }] : []),
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as Tab)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {tab === 'curriculum' && (
            <CurriculumTab
              courseId={course.id}
              modules={modules}
              canManage={canManageCourse}
              openModules={openModules}
              toggleModule={toggleModule}
            />
          )}
          {tab === 'exams' && isAdminView && (
            <ExamsTab courseId={course.id} canManage={canManageExams} />
          )}
          {tab === 'students' && isAdminView && (
            <StudentsTab courseId={course.id} canManage={canManageEnrollments} />
          )}
          {tab === 'certificates' && isAdminView && (
            <CertificatesTab courseId={course.id} canIssue={canIssueCertificates} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Instructor</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold">
                {initials}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{instructorName}</p>
                {instructorUser?.email && <p className="text-xs text-gray-500">{instructorUser.email}</p>}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Course Details</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Course Code', value: course.courseCode },
                { label: 'Duration', value: `${course.duration} hrs` },
                { label: 'Enrolled', value: course.enrollmentCount ?? 0 },
                { label: 'Passing Score', value: course.passingScore ? `${course.passingScore}%` : '—' },
                { label: 'Certificate', value: course.certificateRequired ? 'Yes — upon completion' : 'No' },
                { label: 'Start Date', value: course.startDate?.slice(0, 10) ?? '—' },
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

// ─── Curriculum ───────────────────────────────────────────────────────────────

function CurriculumTab({ courseId, modules, canManage, openModules, toggleModule }: {
  courseId: number; modules: any[]; canManage: boolean;
  openModules: Set<number>; toggleModule: (id: number) => void;
}) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('');

  const addModule = useMutation({
    mutationFn: () => apiClient.post(`/courses/${courseId}/modules`, { title, duration: Number(duration) || 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses', String(courseId)] });
      setAdding(false); setTitle(''); setDuration('');
    },
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-violet-500" /> Course Curriculum
        </h2>
        {canManage && (
          <button onClick={() => setAdding(a => !a)} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
            <Plus className="w-3.5 h-3.5" /> Add Module
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-2">
          <input
            value={title} onChange={e => setTitle(e.target.value)} placeholder="Module title"
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900"
          />
          <input
            value={duration} onChange={e => setDuration(e.target.value)} placeholder="Duration (hours)" type="number"
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900"
          />
          <div className="flex gap-2">
            <button
              onClick={() => addModule.mutate()}
              disabled={!title || addModule.isPending}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium disabled:opacity-50"
            >
              {addModule.isPending ? 'Adding…' : 'Save'}
            </button>
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {modules.map((mod: any) => (
          <div key={mod.id} className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleModule(mod.id)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-left"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">{mod.moduleName}</span>
                <span className="text-xs text-gray-400">{mod.duration} hrs</span>
              </div>
              {openModules.has(mod.id) ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>
            {openModules.has(mod.id) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {mod.description || 'No description for this module yet.'}
                {(mod.contents ?? []).length === 0 && <p className="text-xs text-gray-400 mt-1">No content items added.</p>}
              </motion.div>
            )}
          </div>
        ))}
        {modules.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <Lock className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">No modules added yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Exams ────────────────────────────────────────────────────────────────────

function ExamsTab({ courseId, canManage }: { courseId: number; canManage: boolean }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [activeExamId, setActiveExamId] = useState<number | null>(null);
  const [form, setForm] = useState({ examCode: '', examName: '', totalQuestions: '', passingScore: '70', duration: '30', attempts: '1' });

  const { data: exams, isLoading } = useQuery({
    queryKey: ['courses', String(courseId), 'exams'],
    queryFn: () => apiClient.get<any[]>(`/courses/${courseId}/exams`),
  });

  const createExam = useMutation({
    mutationFn: () => apiClient.post(`/courses/${courseId}/exams`, {
      examCode: form.examCode, examName: form.examName,
      totalQuestions: Number(form.totalQuestions), passingScore: Number(form.passingScore),
      duration: Number(form.duration), attempts: Number(form.attempts),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses', String(courseId), 'exams'] });
      setAdding(false); setForm({ examCode: '', examName: '', totalQuestions: '', passingScore: '70', duration: '30', attempts: '1' });
    },
  });

  const publishExam = useMutation({
    mutationFn: (examId: number) => apiClient.put(`/courses/${courseId}/exams/${examId}`, { status: 'Published' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', String(courseId), 'exams'] }),
  });

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-rose-500" /> Exams
          </h2>
          {canManage && (
            <button onClick={() => setAdding(a => !a)} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              <Plus className="w-3.5 h-3.5" /> New Exam
            </button>
          )}
        </div>

        {adding && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl grid grid-cols-2 gap-2">
            <input value={form.examName} onChange={e => setForm(f => ({ ...f, examName: e.target.value }))} placeholder="Exam name"
              className="col-span-2 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900" />
            <input value={form.examCode} onChange={e => setForm(f => ({ ...f, examCode: e.target.value.toUpperCase() }))} placeholder="Exam code"
              className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900" />
            <input value={form.totalQuestions} onChange={e => setForm(f => ({ ...f, totalQuestions: e.target.value }))} placeholder="Total questions" type="number"
              className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900" />
            <input value={form.passingScore} onChange={e => setForm(f => ({ ...f, passingScore: e.target.value }))} placeholder="Passing score %" type="number"
              className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900" />
            <input value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="Duration (min)" type="number"
              className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900" />
            <div className="col-span-2 flex gap-2">
              <button
                onClick={() => createExam.mutate()}
                disabled={!form.examName || !form.examCode || !form.totalQuestions || createExam.isPending}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium disabled:opacity-50"
              >
                {createExam.isPending ? 'Creating…' : 'Create Exam'}
              </button>
              <button onClick={() => setAdding(false)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs">Cancel</button>
            </div>
          </div>
        )}

        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mx-auto" />
        ) : (
          <div className="space-y-2">
            {(exams ?? []).map((exam: any) => (
              <div key={exam.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{exam.examName}</p>
                    <p className="text-xs text-gray-500">{exam.examCode} • {exam.totalQuestions} questions • {exam.duration} min • Pass {exam.passingScore}%</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${exam.status === 'Published' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                      {exam.status}
                    </span>
                    {canManage && (
                      <button
                        onClick={() => setActiveExamId(activeExamId === exam.id ? null : exam.id)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        {activeExamId === exam.id ? 'Close' : 'Manage Questions'}
                      </button>
                    )}
                    {canManage && exam.status === 'Draft' && (
                      <button
                        onClick={() => publishExam.mutate(exam.id)}
                        disabled={publishExam.isPending}
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        Publish
                      </button>
                    )}
                  </div>
                </div>
                {activeExamId === exam.id && (
                  <QuestionBuilder courseId={courseId} examId={exam.id} />
                )}
              </div>
            ))}
            {(exams ?? []).length === 0 && (
              <div className="text-center py-10 text-gray-400">
                <FileText className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">No exams created yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionBuilder({ courseId, examId }: { courseId: number; examId: number }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    questionText: '', questionType: 'MultipleChoice', points: '1',
    optionsText: '', correctAnswer: '', difficulty: 'Medium',
  });

  const { data: questions } = useQuery({
    queryKey: ['courses', String(courseId), 'exams', String(examId), 'questions'],
    queryFn: () => apiClient.get<any[]>(`/courses/${courseId}/exams/${examId}/questions`),
  });

  const addQuestion = useMutation({
    mutationFn: () => apiClient.post(`/courses/${courseId}/exams/${examId}/questions`, {
      questionText: form.questionText, questionType: form.questionType, points: Number(form.points) || 1,
      options: form.questionType === 'MultipleChoice' ? form.optionsText.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      correctAnswer: form.correctAnswer, difficulty: form.difficulty,
      sequence: (questions?.length ?? 0) + 1,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses', String(courseId), 'exams', String(examId), 'questions'] });
      setForm({ questionText: '', questionType: 'MultipleChoice', points: '1', optionsText: '', correctAnswer: '', difficulty: 'Medium' });
    },
  });

  const removeQuestion = useMutation({
    mutationFn: (questionId: number) => apiClient.delete(`/courses/${courseId}/exams/${examId}/questions/${questionId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', String(courseId), 'exams', String(examId), 'questions'] }),
  });

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3">
      <div className="space-y-2">
        {(questions ?? []).map((q: any, i: number) => (
          <div key={q.id} className="flex items-start justify-between gap-2 p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-200">{i + 1}. {q.questionText}</p>
              <p className="text-xs text-gray-500">{q.questionType} • {q.points} pt(s) • {q.difficulty}</p>
            </div>
            <button onClick={() => removeQuestion.mutate(q.id)} className="text-gray-400 hover:text-rose-600 flex-shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {(questions ?? []).length === 0 && <p className="text-xs text-gray-400">No questions added yet.</p>}
      </div>

      <div className="p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl space-y-2">
        <textarea
          value={form.questionText} onChange={e => setForm(f => ({ ...f, questionText: e.target.value }))}
          placeholder="Question text" rows={2}
          className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900"
        />
        <div className="grid grid-cols-2 gap-2">
          <select value={form.questionType} onChange={e => setForm(f => ({ ...f, questionType: e.target.value }))}
            className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900">
            <option value="MultipleChoice">Multiple Choice</option>
            <option value="TrueFalse">True / False</option>
            <option value="ShortAnswer">Short Answer</option>
            <option value="Essay">Essay</option>
          </select>
          <input value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))} placeholder="Points" type="number"
            className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900" />
        </div>
        {form.questionType === 'MultipleChoice' && (
          <input
            value={form.optionsText} onChange={e => setForm(f => ({ ...f, optionsText: e.target.value }))}
            placeholder="Options, comma separated (e.g. A, B, C, D)"
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900"
          />
        )}
        <input
          value={form.correctAnswer} onChange={e => setForm(f => ({ ...f, correctAnswer: e.target.value }))}
          placeholder="Correct answer"
          className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900"
        />
        <button
          onClick={() => addQuestion.mutate()}
          disabled={!form.questionText || !form.correctAnswer || addQuestion.isPending}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium disabled:opacity-50"
        >
          {addQuestion.isPending ? 'Adding…' : 'Add Question'}
        </button>
      </div>
    </div>
  );
}

// ─── Students / Enrollments ───────────────────────────────────────────────────

function StudentsTab({ courseId, canManage }: { courseId: number; canManage: boolean }) {
  const queryClient = useQueryClient();
  const [picking, setPicking] = useState(false);
  const [studentId, setStudentId] = useState('');

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['courses', String(courseId), 'enrollments'],
    queryFn: () => apiClient.get<any[]>(`/courses/${courseId}/enrollments`),
  });

  const { data: studentData } = useQuery({
    queryKey: ['students', 'for-enrollment-pick'],
    queryFn: () => apiClient.getRaw('/students', { page: 1, limit: 200 }),
    enabled: picking,
  });
  const studentOptions: any[] = (studentData as any)?.data?.students ?? [];
  const enrolledStudentIds = new Set((enrollments ?? []).map((e: any) => e.studentId));

  const enroll = useMutation({
    mutationFn: () => apiClient.post('/enrollments', { courseId, studentId: Number(studentId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses', String(courseId), 'enrollments'] });
      setPicking(false); setStudentId('');
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ enrollmentId, status }: { enrollmentId: number; status: string }) =>
      apiClient.patch(`/enrollments/${enrollmentId}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', String(courseId), 'enrollments'] }),
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-500" /> Enrolled Students
        </h2>
        {canManage && (
          <button onClick={() => setPicking(p => !p)} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
            <Plus className="w-3.5 h-3.5" /> Enroll Student
          </button>
        )}
      </div>

      {picking && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl flex gap-2">
          <select value={studentId} onChange={e => setStudentId(e.target.value)}
            className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900">
            <option value="">Select a student</option>
            {studentOptions.filter(s => !enrolledStudentIds.has(s.id)).map(s => (
              <option key={s.id} value={s.id}>{s.user?.firstName} {s.user?.lastName}{s.studentNumber ? ` — ${s.studentNumber}` : ''}</option>
            ))}
          </select>
          <button
            onClick={() => enroll.mutate()}
            disabled={!studentId || enroll.isPending}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium disabled:opacity-50"
          >
            {enroll.isPending ? 'Enrolling…' : 'Enroll'}
          </button>
          <button onClick={() => setPicking(false)} className="p-2 rounded-lg border border-gray-200"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mx-auto" />
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-700">
          {(enrollments ?? []).map((e: any) => {
            const u = e.student?.user ?? e.staff?.user;
            const name = u ? `${u.firstName} ${u.lastName}` : `${e.staff?.firstName ?? ''} ${e.staff?.lastName ?? ''}`.trim() || 'Unknown';
            return (
              <div key={e.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{name}</p>
                  <p className="text-xs text-gray-500">{e.progressPercentage ?? 0}% complete • Enrolled {e.enrollmentDate?.slice(0, 10)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[e.status] ?? 'bg-gray-100 text-gray-600'}`}>{e.status}</span>
                  {canManage && e.status !== 'Completed' && (
                    <button
                      onClick={() => updateStatus.mutate({ enrollmentId: e.id, status: 'Completed' })}
                      disabled={updateStatus.isPending}
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      Mark Completed
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {(enrollments ?? []).length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No students enrolled yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Certificates ──────────────────────────────────────────────────────────────

function CertificatesTab({ courseId, canIssue }: { courseId: number; canIssue: boolean }) {
  const queryClient = useQueryClient();

  const { data: enrollments, isLoading: loadingEnrollments } = useQuery({
    queryKey: ['courses', String(courseId), 'enrollments'],
    queryFn: () => apiClient.get<any[]>(`/courses/${courseId}/enrollments`),
  });

  const { data: certificates, isLoading: loadingCerts } = useQuery({
    queryKey: ['courses', String(courseId), 'certificates'],
    queryFn: () => apiClient.get<any[]>(`/courses/${courseId}/certificates`),
  });

  const issue = useMutation({
    mutationFn: (enrollmentId: number) => apiClient.post(`/courses/enrollments/${enrollmentId}/certificate`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses', String(courseId), 'certificates'] }),
  });

  const certByEnrollment = new Map((certificates ?? []).map((c: any) => [c.enrollmentId, c]));
  const completed = (enrollments ?? []).filter((e: any) => e.status === 'Completed');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
      <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
        <GraduationCap className="w-5 h-5 text-amber-500" /> Certificates
      </h2>

      {(loadingEnrollments || loadingCerts) ? (
        <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mx-auto" />
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-700">
          {completed.map((e: any) => {
            const u = e.student?.user ?? e.staff?.user;
            const name = u ? `${u.firstName} ${u.lastName}` : `${e.staff?.firstName ?? ''} ${e.staff?.lastName ?? ''}`.trim() || 'Unknown';
            const cert = certByEnrollment.get(e.id);
            return (
              <div key={e.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{name}</p>
                  {cert ? (
                    <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Issued {cert.certificateCode}</p>
                  ) : (
                    <p className="text-xs text-gray-500">Completed — no certificate issued yet</p>
                  )}
                </div>
                {canIssue && !cert && (
                  <button
                    onClick={() => issue.mutate(e.id)}
                    disabled={issue.isPending}
                    className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    <Award className="w-3.5 h-3.5" /> Issue Certificate
                  </button>
                )}
              </div>
            );
          })}
          {completed.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <Award className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No students have completed this course yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CourseDetail;
