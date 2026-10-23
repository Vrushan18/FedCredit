import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { getApplicationDetails, extractErrorMessage } from '../services/api';
import type { ApplicationDetail } from '../types/contracts';
import { StatusBadge } from '../components/common/StatusBadge';
import { ApplicationTimeline } from '../components/dashboard/ApplicationTimeline';
import { ReceiptModal } from '../components/dashboard/ReceiptModal';
import {
  ArrowLeft,
  Receipt,
  RefreshCw,
  Landmark,
  ShieldCheck,
  CreditCard,
  User,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

export const ApplicationDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isNewlyCreated = (location.state as any)?.newlyCreated;

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getApplicationDetails(id);
      setApplication(data);
      setError(null);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetails();

    // Contract mandate: Auto-poll application status updates every 15 seconds
    const interval = setInterval(fetchDetails, 15000);
    return () => clearInterval(interval);
  }, [fetchDetails]);

  const formatINR = (val?: number) => {
    if (val === undefined || val === null) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsReceiptOpen(true)}
            disabled={!application}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition"
          >
            <Receipt className="w-3.5 h-3.5 text-slate-500" />
            <span>Official Receipt</span>
          </button>

          <button
            onClick={() => fetchDetails()}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-blue-600 transition"
            title="Refresh Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Success banner if arrived directly after submission */}
      {isNewlyCreated && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center space-x-3 shadow-sm">
          <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <strong>Application Successfully Dispatched to Partner Bank Node!</strong> Your records are securely stored at the local branch. Track live status updates below.
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {isLoading && !application ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Retrieving application record #{id}...</p>
        </div>
      ) : !application ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <h3 className="font-bold text-slate-900 text-base">Application Not Found</h3>
          <p className="text-xs text-slate-500 mt-1">Unable to locate record reference {id}.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Main Status & Header Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 bank-card-shadow space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">
                  Application Tracking Reference
                </span>
                <h1 className="text-2xl font-mono font-extrabold text-slate-900 mt-0.5">
                  {application.application_id}
                </h1>
                <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                  <Landmark className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-semibold text-slate-700">
                    {application.bank_name || application.bank_id}
                  </span>
                  <span>•</span>
                  <span>
                    Submitted{' '}
                    {new Date(application.created_at).toLocaleDateString('en-IN', {
                      dateStyle: 'long',
                    })}
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <StatusBadge status={application.status} size="lg" />
                {lastRefreshed && (
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">
                    Auto-polled: {lastRefreshed.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>

            {/* Visual Step Timeline */}
            <div>
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-6">
                Lifecycle Progression
              </h3>
              <ApplicationTimeline
                currentStatus={application.status}
                timeline={application.timeline}
                createdAt={application.created_at}
              />
            </div>
          </div>

          {/* Application Details Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Loan Terms Summary */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 bank-card-shadow space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h4 className="font-bold text-sm text-slate-900">Loan Particulars</h4>
              </div>

              <div className="divide-y text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Requested Amount</span>
                  <span className="font-bold text-slate-900">
                    {formatINR(application.loan?.amount || application.loan_amount)}
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Loan Purpose</span>
                  <span className="font-semibold text-slate-800">
                    {(application.loan?.purpose || application.loan_purpose || 'N/A').replace('_', ' ')}
                  </span>
                </div>
                {application.loan?.duration_months && (
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-500">Tenure</span>
                    <span className="font-semibold text-slate-800">
                      {application.loan.duration_months} Months
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Privacy & Branch Guarantee */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 bank-card-shadow space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h4 className="font-bold text-sm text-slate-900">Privacy & Security Audit</h4>
              </div>

              <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
                <p>
                  <strong>Data Residency:</strong> Full KYC, salary history, and documents are stored exclusively inside the local node storage of {application.bank_name || application.bank_id}.
                </p>
                <p>
                  <strong>Biometric Protection:</strong> Fingerprint was hashed locally into a 64-character token. Raw biometric image was deleted immediately after cryptographic hashing.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Printable Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        application={application}
      />
    </div>
  );
};
