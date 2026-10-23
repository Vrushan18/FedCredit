import React from 'react';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { Printer, Download, ShieldCheck, Landmark } from 'lucide-react';
import type { ApplicationDetail } from '../../types/contracts';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: ApplicationDetail | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  application,
}) => {
  if (!application) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatINR = (val?: number) => {
    if (val === undefined || val === null) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Application Acknowledgment Receipt"
      subtitle="Official FedCredit Federated Banking System Record"
      maxWidth="xl"
    >
      <div id="printable-receipt" className="space-y-6 text-slate-800">
        {/* Receipt Header */}
        <div className="flex items-center justify-between border-b pb-4 border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-base text-slate-900">FedCredit System</h4>
              <p className="text-xs text-slate-500">Decentralized Credit Architecture</p>
            </div>
          </div>
          <div className="text-right">
            <StatusBadge status={application.status} size="md" />
            <div className="text-[11px] text-slate-400 mt-1">Status as of receipt issuance</div>
          </div>
        </div>

        {/* Reference Numbers */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 block">Application Reference ID:</span>
            <span className="font-mono font-bold text-sm text-blue-700">
              {application.application_id}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Target Bank Node:</span>
            <span className="font-semibold text-slate-900 flex items-center space-x-1">
              <Landmark className="w-3.5 h-3.5 text-blue-600" />
              <span>{application.bank_name || application.bank_id}</span>
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Date of Application:</span>
            <span className="font-semibold text-slate-800">
              {new Date(application.created_at).toLocaleDateString('en-IN', {
                dateStyle: 'long',
              })}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Processing Protocol:</span>
            <span className="font-semibold text-slate-800">Private Bank Local Review</span>
          </div>
        </div>

        {/* Loan Particulars */}
        <div>
          <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">
            Loan Particulars
          </h5>
          <div className="border border-slate-200 rounded-xl divide-y text-xs">
            <div className="flex justify-between p-3">
              <span className="text-slate-500">Loan Amount Requested</span>
              <span className="font-bold text-slate-900">
                {formatINR(application.loan?.amount || application.loan_amount)}
              </span>
            </div>
            <div className="flex justify-between p-3">
              <span className="text-slate-500">Loan Purpose</span>
              <span className="font-semibold text-slate-900">
                {(application.loan?.purpose || application.loan_purpose || 'N/A').replace('_', ' ')}
              </span>
            </div>
            {application.loan?.duration_months && (
              <div className="flex justify-between p-3">
                <span className="text-slate-500">Tenure Requested</span>
                <span className="font-semibold text-slate-900">
                  {application.loan.duration_months} Months
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Applicant Verification Details */}
        {application.applicant && (
          <div>
            <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">
              Applicant Details
            </h5>
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Full Legal Name:</span>
                <span className="font-semibold text-slate-900">{application.applicant.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phone:</span>
                <span className="font-semibold text-slate-900">{application.applicant.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Employment Type:</span>
                <span className="font-semibold text-slate-900">
                  {application.applicant.employment_type.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Regulatory & Privacy Note */}
        <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-[11px] text-blue-900 leading-relaxed">
          <strong>Privacy Guarantee:</strong> This application and associated verification documents remain exclusively within the local repository of {application.bank_name || application.bank_id}. No raw biometric or personal financial data is shared with the central registry or competing banks.
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
