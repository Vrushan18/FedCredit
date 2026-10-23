import React from 'react';
import type { ApplicationStatus, TimelineEntry } from '../../types/contracts';
import { CheckCircle2, Clock, AlertTriangle, XCircle, FileText } from 'lucide-react';

interface ApplicationTimelineProps {
  currentStatus: ApplicationStatus;
  timeline?: TimelineEntry[];
  createdAt?: string;
}

export const ApplicationTimeline: React.FC<ApplicationTimelineProps> = ({
  currentStatus,
  timeline = [],
  createdAt,
}) => {
  // Steps in the customer journey:
  // 1. SUBMITTED
  // 2. UNDER_REVIEW (Everything between submit and final decision)
  // 3. FINAL OUTCOME: APPROVED, REJECTED, or VERIFICATION_REQUIRED

  const isSubmitted = true;
  const isUnderReview =
    currentStatus === 'UNDER_REVIEW' ||
    currentStatus === 'APPROVED' ||
    currentStatus === 'REJECTED' ||
    currentStatus === 'VERIFICATION_REQUIRED';

  const isCompleted =
    currentStatus === 'APPROVED' ||
    currentStatus === 'REJECTED' ||
    currentStatus === 'VERIFICATION_REQUIRED';

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Visual Step Progress Bar */}
      <div className="relative">
        <div className="absolute top-1/2 left-6 right-6 -translate-y-1/2 h-1 bg-slate-200 z-0">
          <div
            className={`h-full transition-all duration-500 ${
              isCompleted
                ? currentStatus === 'APPROVED'
                  ? 'bg-emerald-500 w-full'
                  : currentStatus === 'REJECTED'
                  ? 'bg-rose-500 w-full'
                  : 'bg-amber-500 w-full'
                : isUnderReview
                ? 'bg-blue-600 w-1/2'
                : 'bg-blue-600 w-0'
            }`}
          />
        </div>

        <div className="relative z-10 flex justify-between items-start">
          {/* Step 1: Submitted */}
          <div className="flex flex-col items-center text-center w-1/3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition ${
                isSubmitted
                  ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 mt-2">Application Submitted</span>
            <span className="text-[11px] text-slate-500">
              {createdAt ? formatTimestamp(createdAt) : 'Registered'}
            </span>
          </div>

          {/* Step 2: Under Review */}
          <div className="flex flex-col items-center text-center w-1/3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition ${
                isUnderReview
                  ? currentStatus === 'UNDER_REVIEW'
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                    : 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-400'
              }`}
            >
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 mt-2">Under Review</span>
            <span className="text-[11px] text-slate-500">Partner Branch Evaluation</span>
          </div>

          {/* Step 3: Final Decision */}
          <div className="flex flex-col items-center text-center w-1/3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition ${
                !isCompleted
                  ? 'bg-slate-200 text-slate-400'
                  : currentStatus === 'APPROVED'
                  ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                  : currentStatus === 'REJECTED'
                  ? 'bg-rose-600 text-white ring-4 ring-rose-100'
                  : 'bg-amber-500 text-white ring-4 ring-amber-100'
              }`}
            >
              {currentStatus === 'APPROVED' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : currentStatus === 'REJECTED' ? (
                <XCircle className="w-5 h-5" />
              ) : currentStatus === 'VERIFICATION_REQUIRED' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </div>
            <span className="text-xs font-bold text-slate-800 mt-2">
              {currentStatus === 'APPROVED'
                ? 'Approved'
                : currentStatus === 'REJECTED'
                ? 'Rejected'
                : currentStatus === 'VERIFICATION_REQUIRED'
                ? 'Manual Verification Required'
                : 'Final Decision'}
            </span>
            <span className="text-[11px] text-slate-500">
              {isCompleted ? 'Decision Finalized' : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline Event Log */}
      {timeline && timeline.length > 0 && (
        <div className="mt-8 border-t border-slate-100 pt-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            Audit Trail & History
          </h4>
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {timeline.map((entry, idx) => (
              <div key={idx} className="relative">
                <span className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      {entry.status === 'VERIFICATION_REQUIRED'
                        ? 'Manual Verification Required'
                        : entry.status.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatTimestamp(entry.at)}
                    </span>
                  </div>
                  {entry.message && (
                    <p className="text-xs text-slate-600 mt-1">{entry.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
