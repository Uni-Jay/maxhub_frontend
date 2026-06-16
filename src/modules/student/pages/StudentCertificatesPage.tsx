import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentPortalApi, StudentEnrollment } from '@/services/studentService';
import { Award, Download, Share2, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

export const StudentCertificatesPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['student-portal-enrollments'],
    queryFn: () => studentPortalApi.getEnrollments().then((r: any) => r.data?.data as StudentEnrollment[]),
  });

  const allEnrollments = data || [];
  const certificates = allEnrollments.filter((e) => e.isCertificateIssued);
  const completedCount = allEnrollments.filter((e) => e.status === 'Completed').length;
  const pendingCount = completedCount - certificates.length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Certificates</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Your earned certificates and awards
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Earned',          value: certificates.length,  color: 'text-violet-600' },
          { label: 'Courses Completed', value: completedCount,      color: 'text-emerald-600' },
          { label: 'Pending Issuance', value: Math.max(0, pendingCount), color: 'text-amber-600' },
        ].map(({ label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 text-center"
          >
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Certificates grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : certificates.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
          <Award className="h-14 w-14 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
          <p className="font-semibold text-gray-700 dark:text-gray-300">No Certificates Yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
            Complete your enrolled courses to earn certificates. You have {completedCount} completed courses pending certificate issuance.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {certificates.map((cert, i) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.07 }}
              className="bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden"
            >
              {/* Background decoration */}
              <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/5" />
              <div className="absolute -right-2 -bottom-8 w-24 h-24 rounded-full bg-white/5" />

              {/* Badge */}
              <div className="flex items-start justify-between mb-4 relative">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Award className="h-6 w-6 text-white" />
                </div>
                <span className="text-xs px-2 py-1 bg-white/20 rounded-full">Certificate</span>
              </div>

              {/* Course name */}
              <h3 className="font-bold text-lg leading-tight mb-1 relative">
                {cert.course?.title || 'Course Certificate'}
              </h3>
              <p className="text-violet-200 text-xs mb-4 relative">
                Completed · {cert.grade ? `Grade: ${cert.grade}` : 'Pass'}
              </p>

              {/* Footer */}
              {cert.enrolledAt && (
                <p className="text-violet-300 text-xs mb-4 relative">
                  Issued {new Date(cert.enrolledAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2 relative">
                <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-medium transition-colors">
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
                <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-medium transition-colors">
                  <Share2 className="h-3.5 w-3.5" />
                  Share
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* In-progress courses info */}
      {completedCount === 0 && (
        <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-4 flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-violet-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">Keep Learning!</p>
            <p className="text-xs text-violet-700 dark:text-violet-400 mt-0.5">
              Complete your active courses to earn certificates. Each completion adds a certificate to your portfolio.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCertificatesPage;
