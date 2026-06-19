import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, FileText, File as FileIcon } from 'lucide-react';

export interface FilePreviewTarget {
  url: string;
  name: string;
  mimeType?: string;
}

function kindOf(mimeType?: string, name?: string): 'image' | 'pdf' | 'video' | 'audio' | 'other' {
  const m = (mimeType || '').toLowerCase();
  const ext = (name || '').split('.').pop()?.toLowerCase() || '';
  if (m.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  if (m === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (m.startsWith('video/') || ['mp4', 'webm', 'mov'].includes(ext)) return 'video';
  if (m.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio';
  return 'other';
}

/** Full-screen preview modal for an uploaded or pending file — image/PDF/video/audio render inline, anything else falls back to a download prompt. */
export default function FilePreviewModal({ target, onClose }: { target: FilePreviewTarget | null; onClose: () => void }) {
  if (!target) return null;
  const kind = kindOf(target.mimeType, target.name);

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate pr-4">{target.name}</p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <a href={target.url} download={target.name} target="_blank" rel="noopener noreferrer"
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                <Download className="h-4 w-4" />
              </a>
              <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
            {kind === 'image' && (
              <img src={target.url} alt={target.name} className="max-w-full max-h-full object-contain rounded-lg" />
            )}
            {kind === 'pdf' && (
              <iframe src={target.url} title={target.name} className="w-full h-[70vh] rounded-lg bg-white" />
            )}
            {kind === 'video' && (
              <video src={target.url} controls autoPlay className="max-w-full max-h-full rounded-lg" />
            )}
            {kind === 'audio' && (
              <div className="w-full max-w-md p-8 flex flex-col items-center gap-4">
                <FileText className="h-12 w-12 text-indigo-400" />
                <audio src={target.url} controls autoPlay className="w-full" />
              </div>
            )}
            {kind === 'other' && (
              <div className="flex flex-col items-center gap-3 text-center p-8">
                <FileIcon className="h-12 w-12 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No inline preview available for this file type.</p>
                <a href={target.url} download={target.name} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 mt-1">
                  <Download className="h-4 w-4" /> Download to view
                </a>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

export { kindOf as filePreviewKind };
