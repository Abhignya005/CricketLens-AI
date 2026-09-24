import React, { useState } from 'react';
import { Upload, X, Film, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { uploadAndAnalyzeVideo, getJobStatus } from '../services/api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisFinished?: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onAnalysisFinished,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sampleStride, setSampleStride] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobStatusText, setJobStatusText] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleStartAnalysis = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setErrorMessage('');
    setJobProgress(5);
    setJobStatusText('Uploading broadcast footage to server...');

    try {
      const resp = await uploadAndAnalyzeVideo(selectedFile, sampleStride);
      const jobId = resp.job_id;

      // Poll job status
      const interval = setInterval(async () => {
        try {
          const statusResp = await getJobStatus(jobId);
          setJobProgress(statusResp.progress || 10);
          setJobStatusText(statusResp.message || 'Processing frames...');

          if (statusResp.status === 'completed') {
            clearInterval(interval);
            setIsCompleted(true);
            setIsUploading(false);
            setTimeout(() => {
              onAnalysisFinished?.();
              onClose();
            }, 1200);
          } else if (statusResp.status === 'error') {
            clearInterval(interval);
            setIsUploading(false);
            setErrorMessage(statusResp.error || 'Video analysis encountered an issue.');
          }
        } catch (err) {
          // Keep polling or simulate complete for demo uploads
        }
      }, 1500);

    } catch (err: any) {
      setIsUploading(false);
      setErrorMessage(err.message || 'Upload failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-cricket-panel border border-cricket-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cricket-border bg-gray-900/60">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Upload Broadcast Footage (.mp4 / .avi / .mov)
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          {!isUploading && !isCompleted ? (
            <>
              {/* Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className="border-2 border-dashed border-gray-700 hover:border-emerald-500/80 rounded-xl p-6 text-center cursor-pointer bg-gray-900/40 transition-all flex flex-col items-center justify-center gap-2"
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <Upload className="w-8 h-8 text-emerald-400 mb-1" />
                <div className="text-sm font-semibold text-white">
                  {selectedFile ? selectedFile.name : 'Click to browse or drop cricket video here'}
                </div>
                <div className="text-xs text-gray-400">
                  Supports 1080p / 720p 30/60fps MP4, AVI, MOV broadcast clips
                </div>
                <input
                  id="file-input"
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])}
                />
              </div>

              {/* Sample Stride option */}
              <div className="flex items-center justify-between p-3 bg-gray-900/80 rounded-lg border border-gray-800 text-xs">
                <span className="text-gray-300">Processing Frame Rate:</span>
                <select
                  value={sampleStride}
                  onChange={(e) => setSampleStride(parseInt(e.target.value))}
                  className="bg-gray-800 text-white rounded px-2 py-1 border border-gray-700 text-xs font-mono focus:outline-none"
                >
                  <option value={1}>Full 30/60 FPS (High Precision)</option>
                  <option value={2}>Sample 1/2 Frames (2x Faster)</option>
                  <option value={3}>Sample 1/3 Frames (Fastest)</option>
                </select>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center gap-4 text-center">
              {isCompleted ? (
                <>
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                  <div className="text-sm font-bold text-white">Analysis Complete!</div>
                  <div className="text-xs text-gray-400">Loading updated tactical telemetry...</div>
                </>
              ) : (
                <>
                  <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                  <div className="text-sm font-bold text-white">{jobStatusText}</div>
                  {/* Progress Bar */}
                  <div className="w-full max-w-xs h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${jobProgress}%` }}
                    />
                  </div>
                  <div className="text-xs font-mono text-gray-400">{jobProgress.toFixed(0)}%</div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isUploading && !isCompleted && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-cricket-border bg-gray-900/60">
            <button onClick={onClose} className="px-3 py-1.5 rounded text-xs text-gray-400 hover:text-white">
              Cancel
            </button>
            <button
              onClick={handleStartAnalysis}
              disabled={!selectedFile}
              className={`px-4 py-1.5 rounded text-xs font-semibold shadow-md ${
                selectedFile
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/40'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              Start Analysis Pipeline
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

