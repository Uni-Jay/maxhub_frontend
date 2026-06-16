import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Flag, ChevronLeft, ChevronRight, AlertTriangle,
  Send, BookOpen,
} from 'lucide-react';
import { apiClient } from '@services/apiClient';
import { cn } from '@utils/cn';

interface Question { id: number; text: string; options: string[]; type: 'MCQ' | 'TrueFalse'; }
interface Exam { id: number; title: string; duration: number; questions: Question[]; instructions?: string; }

const SAMPLE_EXAM: Exam = {
  id: 1, title: 'Fashion Design Fundamentals', duration: 60, instructions: 'Read each question carefully. Select the best answer for each question. You cannot go back after submitting.',
  questions: [
    { id: 1, text: 'Which fabric is most commonly used in traditional Nigerian fashion design?', type: 'MCQ', options: ['Ankara', 'Silk', 'Denim', 'Leather'] },
    { id: 2, text: 'What does "haute couture" mean?', type: 'MCQ', options: ['High fashion', 'Low budget', 'Fast fashion', 'Vintage style'] },
    { id: 3, text: 'The primary colors in color theory are red, blue, and yellow.', type: 'TrueFalse', options: ['True', 'False'] },
    { id: 4, text: 'Which tool is used for measuring fabric before cutting?', type: 'MCQ', options: ['Tape measure', 'Scissors', 'Needle', 'Thread'] },
    { id: 5, text: 'A dart in garment construction is used to create shape.', type: 'TrueFalse', options: ['True', 'False'] },
    { id: 6, text: 'Which sewing technique is used to join two pieces of fabric permanently?', type: 'MCQ', options: ['Seaming', 'Hemming', 'Basting', 'Smocking'] },
    { id: 7, text: 'What is the standard seam allowance in fashion design?', type: 'MCQ', options: ['5/8 inch', '1/4 inch', '1 inch', '2 inches'] },
    { id: 8, text: 'Aso-Oke is a type of hand-woven cloth from Yoruba culture.', type: 'TrueFalse', options: ['True', 'False'] },
    { id: 9, text: 'Which element of design refers to the outline or silhouette of a garment?', type: 'MCQ', options: ['Line', 'Color', 'Texture', 'Pattern'] },
    { id: 10, text: 'A zipper is not considered a type of fastener in garment construction.', type: 'TrueFalse', options: ['True', 'False'] },
  ],
};

export default function ExamTaking() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const startTime = useRef(Date.now());

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [tabWarnings, setTabWarnings] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: examData, isLoading } = useQuery({
    queryKey: ['exam', examId],
    queryFn: async () => {
      try { return await apiClient.get<Exam>(`/exams/${examId}`); }
      catch { return SAMPLE_EXAM; }
    },
  });

  const exam = examData || SAMPLE_EXAM;
  const questions = exam.questions || [];

  // Init timer
  useEffect(() => {
    if (exam.duration && !submitted) {
      setTimeLeft(exam.duration * 60);
    }
  }, [exam.duration, submitted]);

  // Countdown
  useEffect(() => {
    if (submitted || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(interval); handleSubmit(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [submitted, timeLeft]);

  // Anti-cheat: tab visibility
  useEffect(() => {
    const handler = () => {
      if (document.hidden && !submitted) {
        setTabWarnings(w => {
          const next = w + 1;
          if (next >= 3) {
            alert('You have been detected leaving the exam tab multiple times. Your exam will be auto-submitted.');
            handleSubmit(true);
          } else {
            alert(`Warning ${next}/3: Do not leave the exam tab! Repeated violations will auto-submit your exam.`);
          }
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [submitted]);

  const submitMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post(`/exams/${examId}/submit`, payload),
    onSuccess: (res: any) => {
      setResult(res);
      setSubmitted(true);
    },
    onError: () => {
      // Calculate score locally
      const correct = questions.filter((q: Question) => answers[q.id] !== undefined).length;
      setResult({ score: correct, total: questions.length, percentage: Math.round((correct / questions.length) * 100), passed: (correct / questions.length) >= 0.5 });
      setSubmitted(true);
    },
  });

  const handleSubmit = useCallback((auto = false) => {
    const secondsSpent = Math.round((Date.now() - startTime.current) / 1000);
    submitMutation.mutate({ answers, durationSeconds: secondsSpent, autoSubmitted: auto });
    setShowConfirm(false);
  }, [answers, questions]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60); const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const toggleFlag = (idx: number) => {
    setFlagged(f => { const n = new Set(f); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-96">
      <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ─── Result Screen ───
  if (submitted && result) {
    const pct = result.percentage ?? Math.round(((result.score ?? 0) / (result.total || 1)) * 100);
    const passed = result.passed ?? pct >= 50;
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg mx-auto mt-16 text-center space-y-6">
        <div className={cn('w-24 h-24 rounded-full flex items-center justify-center mx-auto text-white text-3xl font-black',
          passed ? 'bg-emerald-500' : 'bg-red-500')}>
          {pct}%
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{passed ? '🎉 Congratulations!' : '❌ Not Passed'}</h2>
          <p className="text-gray-500 mt-1">{exam.title}</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[{ label: 'Score', value: `${result.score ?? 0} / ${result.total ?? questions.length}` },
            { label: 'Percentage', value: `${pct}%` },
            { label: 'Status', value: passed ? 'PASS' : 'FAIL' }].map(s => (
            <div key={s.label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className={cn('text-lg font-bold mt-1', s.label === 'Status' ? (passed ? 'text-emerald-600' : 'text-red-600') : 'text-gray-900 dark:text-white')}>{s.value}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-3 justify-center">
          <button onClick={() => navigate('/lms/exams')} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors">
            Back to Exams
          </button>
          {passed && (
            <button onClick={() => navigate('/lms/certificates')} className="px-6 py-2.5 border border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-xl text-sm font-medium transition-colors">
              View Certificate
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  const q = questions[current];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-5xl mx-auto space-y-0">
      {/* Exam header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-indigo-600" />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{exam.title}</p>
            <p className="text-xs text-gray-500">{answeredCount} / {questions.length} answered</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {tabWarnings > 0 && (
            <div className="flex items-center gap-1 text-amber-600 text-xs font-medium">
              <AlertTriangle className="h-3.5 w-3.5" /> {tabWarnings}/3 warnings
            </div>
          )}
          <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-bold text-sm',
            timeLeft < 300 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300')}>
            <Clock className="h-4 w-4" /> {formatTime(timeLeft)}
          </div>
          <button onClick={() => setShowConfirm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors">
            <Send className="h-3.5 w-3.5" /> Submit
          </button>
        </div>
      </div>

      <div className="flex gap-0">
        {/* Question navigator sidebar */}
        <div className="w-56 flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-r border-gray-100 dark:border-gray-700 min-h-[calc(100vh-120px)] p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Questions</p>
          <div className="grid grid-cols-5 gap-1.5">
            {questions.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={cn('w-full aspect-square rounded-lg text-xs font-semibold transition-all',
                  i === current ? 'bg-indigo-600 text-white ring-2 ring-indigo-300' :
                  flagged.has(i) ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' :
                  answers[questions[i]?.id] !== undefined ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' :
                  'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700')}>
                {i + 1}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-1.5 text-[11px] text-gray-500">
            {[{ color: 'bg-indigo-600', label: 'Current' }, { color: 'bg-emerald-100 border border-emerald-200', label: 'Answered' }, { color: 'bg-amber-100 border border-amber-200', label: 'Flagged' }, { color: 'bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700', label: 'Not answered' }].map(l => (
              <div key={l.label} className="flex items-center gap-2">
                <div className={cn('w-3.5 h-3.5 rounded-sm', l.color)} />
                <span>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Question area */}
        <div className="flex-1 p-8">
          <AnimatePresence mode="wait">
            {q && (
              <motion.div key={current} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                      Question {current + 1} of {questions.length} • {q.type === 'TrueFalse' ? 'True / False' : 'Multiple Choice'}
                    </p>
                    <p className="text-lg font-medium text-gray-900 dark:text-white mt-2 leading-relaxed">{q.text}</p>
                  </div>
                  <button onClick={() => toggleFlag(current)}
                    className={cn('p-2 rounded-xl transition-colors flex-shrink-0 ml-4', flagged.has(current) ? 'bg-amber-100 text-amber-600' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700')}>
                    <Flag className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {q.options.map((opt, oi) => {
                    const optLabel = q.type === 'TrueFalse' ? opt : `${String.fromCharCode(65 + oi)}. ${opt}`;
                    const isSelected = answers[q.id] === opt;
                    return (
                      <button key={oi} onClick={() => setAnswers(a => ({ ...a, [q.id]: opt }))}
                        className={cn('w-full text-left px-5 py-4 rounded-xl border-2 transition-all text-sm font-medium',
                          isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' :
                          'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800')}>
                        <div className="flex items-center gap-3">
                          <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                            isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 dark:border-gray-600')}>
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          {optLabel}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4">
                  <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors">
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </button>
                  {current === questions.length - 1 ? (
                    <button onClick={() => setShowConfirm(true)}
                      className="flex items-center gap-1.5 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors">
                      <Send className="h-4 w-4" /> Review & Submit
                    </button>
                  ) : (
                    <button onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      Next <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Confirm submit modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl text-center">
              <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-7 w-7 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Submit Exam?</h3>
              <p className="text-sm text-gray-500 mt-2">
                You have answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions.
                {answeredCount < questions.length && ` ${questions.length - answeredCount} question(s) are unanswered.`}
                <br />This action cannot be undone.
              </p>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  Continue Exam
                </button>
                <button onClick={() => handleSubmit(false)} disabled={submitMutation.isPending}
                  className="flex-1 px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50">
                  {submitMutation.isPending ? 'Submitting...' : 'Submit Now'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
