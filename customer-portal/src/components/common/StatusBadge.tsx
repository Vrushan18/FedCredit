import React from 'react';
import type { ApplicationStatus } from '../../types/contracts';
import { Clock, CheckCircle2, XCircle, AlertTriangle, FileText } from 'lucide-react';

interface StatusBadgeProps {
  status: ApplicationStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
}) => {
  // STRICT CONTRACT RULES (Section 3.2):
  // 5 statuses: SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, VERIFICATION_REQUIRED
  // UI Label for VERIFICATION_REQUIRED must be "Manual Verification Required"
  switch (status) {
    case 'APPROVED':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${
            size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : size === 'lg' ? 'px-3.5 py-1.5 text-sm gap-2' : 'px-2.5 py-1 text-xs gap-1.5'
          }`}
        >
          {showIcon && <CheckCircle2 className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
          Approved
        </span>
      );

    case 'REJECTED':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${
            size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : size === 'lg' ? 'px-3.5 py-1.5 text-sm gap-2' : 'px-2.5 py-1 text-xs gap-1.5'
          }`}
        >
          {showIcon && <XCircle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
          Rejected
        </span>
      );

    case 'VERIFICATION_REQUIRED':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-amber-50 text-amber-800 border border-amber-200 ${
            size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : size === 'lg' ? 'px-3.5 py-1.5 text-sm gap-2' : 'px-2.5 py-1 text-xs gap-1.5'
          }`}
        >
          {showIcon && <AlertTriangle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
          Manual Verification Required
        </span>
      );

    case 'UNDER_REVIEW':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${
            size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : size === 'lg' ? 'px-3.5 py-1.5 text-sm gap-2' : 'px-2.5 py-1 text-xs gap-1.5'
          }`}
        >
          {showIcon && <Clock className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
          Under Review
        </span>
      );

    case 'SUBMITTED':
    default:
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${
            size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : size === 'lg' ? 'px-3.5 py-1.5 text-sm gap-2' : 'px-2.5 py-1 text-xs gap-1.5'
          }`}
        >
          {showIcon && <FileText className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
          Submitted
        </span>
      );
  }
};
