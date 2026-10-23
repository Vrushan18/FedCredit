import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApplications } from '../hooks/useApplications';
import { StatusBadge } from '../components/common/StatusBadge';
import { BankStatusWidget } from '../components/dashboard/BankStatusWidget';
import { ReceiptModal } from '../components/dashboard/ReceiptModal';
import type { ApplicationDetail } from '../types/contracts';
import {
  CreditCard,
  FileCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Plus,
  Landmark,
  ShieldCheck,
  Receipt,
  FileText,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { applications, isLoading, error, refreshApplications } = useApplications();
  const navigate = useNavigate();
  const [selectedReceipt, setSelectedReceipt] = useState<ApplicationDetail | null>(null);

  // Status counters matching contract statuses
  const totalCount = applications.length;
  const approvedCount = applications.filter((a) => a.status === 'APPROVED').length;
  const underReviewCount = applications.filter((a) => a.status === 'UNDER_REVIEW' || a.status === 'SUBMITTED').length;
  const verificationCount = applications.filter((a) => a.status === 'VERIFICATION_REQUIRED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Customer Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {user?.name || 'Valued Customer'}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
              <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg font-mono">
                ID: {user?.customer_id}
              </span>
              <span>•</span>
              <span>{user?.email}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <Link
              to="/apply"
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-bold text-xs shadow-lg shadow-blue-600/30 transition transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              <span>Apply for New Loan</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 bank-card-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Applications</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalCount}</div>
          <span className="text-[11px] text-slate-400">All participating banks</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 bank-card-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Under Review</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2">{underReviewCount}</div>
          <span className="text-[11px] text-slate-400">In branch processing queue</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 bank-card-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Approved Loans</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2">{approvedCount}</div>
          <span className="text-[11px] text-slate-400">Credit sanctioned</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 bank-card-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Action Required</span>
            <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-orange-700 mt-2">{verificationCount}</div>
          <span className="text-[11px] text-slate-400">Manual verification needed</span>
        </div>
      </div>

      {/* 3. Main Split View: Applications List + Bank Network Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left (8 cols): Applications List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-slate-900 text-base">My Loan Applications</h2>
            </div>
            <button
              onClick={() => refreshApplications()}
              disabled={isLoading}
              className="text-xs text-slate-500 hover:text-blue-600 flex items-center space-x-1 p-1.5 rounded-lg hover:bg-slate-100 transition"
              title="Refresh application status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Auto-polled (15s)</span>
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {error}
            </div>
          )}

          {isLoading && applications.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Fetching applications from Head Office index...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">No Applications Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  You haven't submitted any loan requests yet. Choose an available partner bank and submit your digital application in minutes.
                </p>
              </div>
              <Link
                to="/apply"
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Submit First Loan Application</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div
                  key={app.application_id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 bank-card-shadow bank-card-shadow-hover transition space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-blue-700 text-sm">
                          {app.application_id}
                        </span>
                        <StatusBadge status={app.status} size="sm" />
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center space-x-2">
                        <Landmark className="w-3.5 h-3.5 text-slate-400" />
                        <span>{app.bank_name || app.bank_id}</span>
                        <span>•</span>
                        <span>
                          Applied {new Date(app.created_at).toLocaleDateString('en-IN', {
                            dateStyle: 'medium',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-end sm:self-auto">
                      <button
                        onClick={() =>
                          setSelectedReceipt({
                            application_id: app.application_id,
                            bank_id: app.bank_id,
                            bank_name: app.bank_name,
                            status: app.status,
                            created_at: app.created_at,
                            timeline: [{ status: app.status, at: app.created_at }],
                          })
                        }
                        className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1"
                        title="Download or Print Receipt"
                      >
                        <Receipt className="w-3.5 h-3.5 text-slate-500" />
                        <span>Receipt</span>
                      </button>

                      <Link
                        to={`/applications/${app.application_id}`}
                        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center space-x-1 shadow-sm"
                      >
                        <span>Track</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Summary row */}
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Processing Entity</span>
                      <span className="font-semibold text-slate-800">
                        {app.bank_name || (app.bank_id === 'BANK_A' ? 'Bank A (HDFC Retail)' : 'Bank B (State Co-op)')}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Current Status</span>
                      <span className="font-semibold text-slate-800">
                        {app.status === 'VERIFICATION_REQUIRED'
                          ? 'Manual Verification Required'
                          : app.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right (4 cols): Bank Network Status Widget */}
        <div className="lg:col-span-4 space-y-6">
          <BankStatusWidget />

          {/* Quick Help Box */}
          <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200/80 text-xs space-y-2">
            <h4 className="font-bold text-blue-900">Application Status Guide</h4>
            <ul className="space-y-1.5 text-blue-800">
              <li>
                <strong>Submitted:</strong> Received by bank branch queue.
              </li>
              <li>
                <strong>Under Review:</strong> Local credit evaluation & officer check in progress.
              </li>
              <li>
                <strong>Approved:</strong> Loan sanction letter prepared.
              </li>
              <li>
                <strong>Manual Verification:</strong> Physical or document verification requested.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      <ReceiptModal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        application={selectedReceipt}
      />
    </div>
  );
};
