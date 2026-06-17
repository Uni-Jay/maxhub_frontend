import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Award, Download, Share2, Calendar, BookOpen, Loader2, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '@services/apiClient';

const GRADIENT_COLORS = [
  'from-indigo-500 to-violet-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-sky-500 to-cyan-600',
  'from-purple-500 to-fuchsia-600',
];

interface CertificateItem {
  id: number;
  credentialId: string;
  title: string;
  course: string;
  instructor: string;
  issueDate: string;
  status: string;
  certificateUrl: string | null;
  verificationCode: string;
}

export function CertificateList() {
  const { data, isLoading } = useQuery({
    queryKey: ['student-certificates'],
    queryFn: async () => {
      try { return await apiClient.get<CertificateItem[]>('/courses/student/certificates') as any; }
      catch { return []; }
    },
  });

  const certs: CertificateItem[] = Array.isArray(data) ? data : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Certificates</h1>
        <p className="text-sm text-gray-500 mt-0.5">Credentials earned from completed courses</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Certificates', value: certs.length.toString(), color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Issued', value: certs.filter(c => c.status === 'Issued').length.toString(), color: 'text-emerald-600 bg-emerald-50' },
          { label: 'This Year', value: certs.filter(c => c.issueDate?.startsWith(String(new Date().getFullYear()))).length.toString(), color: 'text-amber-600 bg-amber-50' },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-1 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {certs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Award className="w-16 h-16 mb-4" />
          <p className="text-lg font-semibold text-gray-600 dark:text-gray-400">No certificates yet</p>
          <p className="text-sm mt-1">Complete a course to earn your first certificate</p>
          <Link to="/lms/courses"
            className="mt-5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition">
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {certs.map((cert, i) => {
            const color = GRADIENT_COLORS[i % GRADIENT_COLORS.length];
            return (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition">
                  {/* Top banner */}
                  <div className={`bg-gradient-to-r ${color} p-6 text-white relative overflow-hidden`}>
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
                    <div className="absolute right-8 bottom-0 w-16 h-16 bg-white/5 rounded-full" />
                    <div className="relative flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="w-5 h-5 text-white/90" />
                          <span className="text-sm font-medium text-white/90">MaxHub Academy</span>
                        </div>
                        <p className="text-xs text-white/70 uppercase tracking-widest mb-1">{cert.title}</p>
                        <h2 className="text-xl font-bold">{cert.course}</h2>
                      </div>
                      <div className="text-right">
                        <div className="inline-block px-3 py-1 rounded-full bg-white/20 text-sm font-semibold">
                          Issued
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Issued</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {cert.issueDate ? new Date(cert.issueDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                          </p>
                        </div>
                      </div>
                      {cert.instructor && (
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Instructor</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{cert.instructor}</p>
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-500">Credential ID</p>
                        <p className="text-sm font-mono font-medium text-indigo-600">{cert.credentialId}</p>
                      </div>
                    </div>

                    {cert.verificationCode && (
                      <div className="mb-5 flex items-center gap-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-900 rounded-xl px-3 py-2">
                        <LinkIcon className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        <span>Verification code: <span className="font-mono text-indigo-600">{cert.verificationCode}</span></span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                      {cert.certificateUrl ? (
                        <a
                          href={cert.certificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r ${color} hover:opacity-90 transition`}
                        >
                          <Download className="w-4 h-4" /> Download PDF
                        </a>
                      ) : (
                        <button disabled className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-gray-400 cursor-not-allowed">
                          <Download className="w-4 h-4" /> No PDF Available
                        </button>
                      )}
                      <button
                        onClick={() => navigator.clipboard.writeText(cert.credentialId).catch(() => {})}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      >
                        <Share2 className="w-4 h-4" /> Share
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CertificateList;
