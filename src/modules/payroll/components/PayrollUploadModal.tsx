import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UploadCloud, X, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { payrollService, type UploadSummary } from '@services/payrollService';

const TEMPLATE_HEADERS = [
  'employeeId', 'email', 'baseSalary', 'bonus', 'incomeTax',
  'providentFund', 'healthInsurance', 'otherDeductions', 'advanceAmount', 'bankAccountNumber',
];
const TEMPLATE_SAMPLE = ['EMP001', 'jane.doe@maxhub.com', '250000', '10000', '15000', '12500', '5000', '0', '0', '0123456789'];

function downloadTemplate() {
  const csv = `${TEMPLATE_HEADERS.join(',')}\n${TEMPLATE_SAMPLE.join(',')}\n`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'payroll-upload-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  periodId: number;
  periodLabel: string;
  onClose: () => void;
}

export default function PayrollUploadModal({ periodId, periodLabel, onClose }: Props) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<UploadSummary | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: (f: File) => payrollService.uploadSalaries(periodId, f),
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ['payroll-periods'] });
      qc.invalidateQueries({ queryKey: ['payroll-salaries'] });
      qc.invalidateQueries({ queryKey: ['payroll-overview'] });
    },
  });

  const pickFile = (f: File | null) => {
    setResult(null);
    if (f && !/\.csv$/i.test(f.name)) return;
    setFile(f);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <UploadCloud className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Upload Payroll</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{periodLabel}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <button
            onClick={downloadTemplate}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-dashed border-indigo-200 dark:border-indigo-800 rounded-xl py-2.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
          >
            <Download className="h-4 w-4" /> Download CSV Template
          </button>

          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0] ?? null); }}
            onClick={() => inputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-8 px-4 cursor-pointer transition text-center ${
              dragOver ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
            }`}
          >
            <input ref={inputRef} type="file" accept=".csv" className="hidden"
              onChange={e => pickFile(e.target.files?.[0] ?? null)} />
            <FileSpreadsheet className="h-8 w-8 text-gray-400" />
            {file ? (
              <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
            ) : (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-300">Drag & drop a .csv file, or click to browse</p>
                <p className="text-xs text-gray-400">Columns: employeeId or email, baseSalary, bonus, deductions…</p>
              </>
            )}
          </div>

          {uploadMutation.isError && (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2.5">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" /> {(uploadMutation.error as any)?.message || 'Upload failed'}
            </div>
          )}

          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> Upload complete
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div><p className="font-bold text-gray-900 dark:text-white text-base">{result.summary.created}</p><p className="text-gray-500 dark:text-gray-400">Created</p></div>
                    <div><p className="font-bold text-gray-900 dark:text-white text-base">{result.summary.updated}</p><p className="text-gray-500 dark:text-gray-400">Updated</p></div>
                    <div><p className="font-bold text-gray-900 dark:text-white text-base">{result.summary.skipped}</p><p className="text-gray-500 dark:text-gray-400">Skipped</p></div>
                  </div>
                  {result.summary.errors.length > 0 && (
                    <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800 space-y-1 max-h-32 overflow-y-auto">
                      {result.summary.errors.map((e, i) => (
                        <p key={i} className="text-xs text-red-600 dark:text-red-400">Row {e.row}: {e.reason}</p>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button
              onClick={() => file && uploadMutation.mutate(file)}
              disabled={!file || uploadMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition"
            >
              {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              Upload
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
