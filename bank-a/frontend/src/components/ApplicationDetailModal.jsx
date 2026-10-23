import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  PauseCircle,
  Flag,
  FileCheck,
  TrendingDown,
  TrendingUp,
  CreditCard,
  UserCheck,
  Loader2
} from 'lucide-react';
import { api } from '../api';

export default function ApplicationDetailModal({ applicationId, onClose, onRefreshData }) {
  const [appData, setAppData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [officerNote, setOfficerNote] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    loadDetail();
  }, [applicationId]);

  async function loadDetail() {
    try {
      setLoading(true);
      const data = await api.getApplicationDetail(applicationId);
      setAppData(data);
      if (data.decision_notes) {
        setOfficerNote(data.decision_notes);
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handlePredict() {
    try {
      setPredicting(true);
      setActionMessage(null);
      const pred = await api.predictApplication(applicationId);
      setActionMessage({ type: 'success', text: 'AI Credit Risk & Fraud intelligence calculated successfully!' });
      await loadDetail();
      onRefreshData();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setPredicting(false);
    }
  }

  async function handleDecision(decision) {
    try {
      setDeciding(true);
      setActionMessage(null);
      const res = await api.submitDecision(applicationId, decision, officerNote);
      setActionMessage({ type: 'success', text: res.message });
      await loadDetail();
      onRefreshData();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setDeciding(false);
    }
  }

  async function handleFlagFraud() {
    if (!flagReason) {
      alert('Please specify a reason for flagging fraud.');
      return;
    }
    try {
      setFlagging(true);
      await api.flagApplication(applicationId, flagReason);
      setShowFlagModal(false);
      setActionMessage({ type: 'warning', text: 'Application marked with manual fraud flag and transmitted to Head Office registry.' });
      setFlagReason('');
      await loadDetail();
      onRefreshData();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setFlagging(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Loading Application Dossier...</p>
        </div>
      </div>
    );
  }

  if (!appData) return null;

  const pred = appData.prediction;
  const applicant = appData.applicant || {};
  const financial = appData.financial || {};
  const loan = appData.loan || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Top Header Bar */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <span className="font-bold text-lg tracking-tight">Application Review Dossier</span>
              <span className="font-mono text-xs bg-slate-800 px-2.5 py-1 rounded text-blue-300 border border-slate-700">
                {appData.application_id}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Customer: {applicant.full_name} ({appData.customer_id}) • Biometric Protected Hash: {appData.protected_id ? `${appData.protected_id.slice(0, 12)}...` : 'N/A'}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
              appData.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
              appData.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
              appData.status === 'VERIFICATION_REQUIRED' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
              'bg-blue-500/20 text-blue-300 border border-blue-500/40'
            }`}>
              {appData.status}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback / Toast Banner */}
        {actionMessage && (
          <div className={`p-3 text-xs font-semibold shrink-0 ${
            actionMessage.type === 'error' ? 'bg-rose-50 text-rose-700 border-b border-rose-200' :
            actionMessage.type === 'warning' ? 'bg-amber-50 text-amber-700 border-b border-amber-200' :
            'bg-emerald-50 text-emerald-700 border-b border-emerald-200'
          }`}>
            {actionMessage.text}
          </div>
        )}

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          
          {/* Section 1: Customer KYC & Loan Request Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Applicant KYC Box */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm">
                <UserCheck className="w-4 h-4 text-blue-600" />
                <span>Applicant KYC Verification</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px]">FULL NAME</span>
                  <span className="font-semibold text-slate-900">{applicant.full_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">AGE / GENDER</span>
                  <span className="font-semibold text-slate-900">{applicant.age} yrs • {applicant.gender}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">OCCUPATION</span>
                  <span className="font-semibold text-slate-900">{applicant.occupation || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">EMPLOYMENT TYPE</span>
                  <span className="font-semibold text-slate-900">{applicant.employment_type}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px]">ADDRESS & PHONE</span>
                  <span className="font-medium text-slate-800">{applicant.address} • {applicant.phone}</span>
                </div>
              </div>
            </div>

            {/* Financial & Loan Request Box */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>Financial & Credit Profile</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px]">REQUESTED LOAN</span>
                  <span className="font-bold text-slate-900 text-sm">
                    ₹{Number(loan.amount).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-500 block">{loan.duration_months} Months • {loan.purpose}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">ANNUAL INCOME</span>
                  <span className="font-bold text-emerald-700 text-sm">
                    ₹{Number(financial.annual_income).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Existing Debt: ₹{Number(financial.existing_debt).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">CREDIT SCORE (CIBIL)</span>
                  <span className={`font-bold ${financial.credit_score >= 700 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {financial.credit_score}
                  </span>
                  <span className="text-[10px] text-slate-500 block">History: {financial.credit_history_length_years} yrs</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">HOUSING & DEFAULTS</span>
                  <span className="font-semibold text-slate-900">{financial.home_ownership}</span>
                  <span className={`text-[10px] font-semibold block ${financial.previous_default ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {financial.previous_default ? 'Prior Default Detected' : 'No Prior Default'}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Section 2: AI Credit Risk Prediction & XAI Console */}
          <div className="border border-blue-200 rounded-2xl p-5 bg-gradient-to-br from-blue-50/50 via-white to-slate-50 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-900">Local AI Decision & Explainability Engine</h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  17-feature Logistic Regression • SHAP LinearExplainer factors • Dual-layer Fraud Intelligence
                </p>
              </div>

              <button
                onClick={handlePredict}
                disabled={predicting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl flex items-center space-x-2 shadow-xs transition disabled:opacity-50"
              >
                {predicting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Evaluating Risk...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run AI Risk & Fraud Check</span>
                  </>
                )}
              </button>
            </div>

            {/* Prediction Results Display */}
            {pred ? (
              <div className="space-y-4 pt-2">
                
                {/* Metrics Badges Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  
                  {/* Risk Level */}
                  <div className={`p-3 rounded-xl border ${
                    pred.risk_level === 'LOW' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
                    pred.risk_level === 'MEDIUM' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                    'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">Credit Risk Level</span>
                    <span className="text-base font-extrabold">{pred.risk_level} RISK</span>
                  </div>

                  {/* Default Probability */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-white">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Default Probability</span>
                    <span className="text-base font-extrabold text-slate-900">
                      {(pred.default_probability * 100).toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-slate-400 block">Confidence: {(pred.confidence * 100).toFixed(0)}%</span>
                  </div>

                  {/* Recommendation */}
                  <div className={`p-3 rounded-xl border ${
                    pred.recommendation === 'ELIGIBLE' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
                    pred.recommendation === 'HOLD_FOR_VERIFICATION' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                    'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">AI Recommendation</span>
                    <span className="text-xs font-extrabold">{pred.recommendation.replace(/_/g, ' ')}</span>
                  </div>

                  {/* Fraud Status */}
                  <div className={`p-3 rounded-xl border ${
                    pred.fraud.status === 'SAFE' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
                    pred.fraud.status === 'REVIEW_NEEDED' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                    'bg-rose-50 border-rose-200 text-rose-900'
                  }`}>
                    <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">Fraud Intelligence</span>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-base font-extrabold">{pred.fraud.status}</span>
                      <span className="text-xs font-mono font-medium">({pred.fraud.score}/100)</span>
                    </div>
                  </div>

                </div>

                {/* SHAP Explanations Breakdown Table */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Explainable AI (SHAP) Contributing Factors
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Model: {pred.model_version}</span>
                  </div>

                  <div className="space-y-2">
                    {pred.explanation.map((factor, idx) => {
                      const isPositive = factor.direction === 'POSITIVE';
                      return (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <div className="flex items-center space-x-2.5">
                            {isPositive ? (
                              <div className="p-1 rounded bg-emerald-100 text-emerald-700">
                                <TrendingUp className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <div className="p-1 rounded bg-rose-100 text-rose-700">
                                <TrendingDown className="w-3.5 h-3.5" />
                              </div>
                            )}
                            <div>
                              <span className="font-semibold text-slate-800">{factor.label}</span>
                              <span className="text-[10px] text-slate-400 font-mono ml-2">({factor.feature})</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs font-semibold">
                              {factor.impact > 0 ? `+${factor.impact}` : factor.impact}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {isPositive ? 'HELPS APPLICANT' : 'INCREASES RISK'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Fraud Breakdown Reasons (If any flagged) */}
                {pred.fraud.reasons && pred.fraud.reasons.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                    <div className="flex items-center space-x-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Fraud Alerts Detected ({pred.fraud.reasons.length})</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px] text-amber-800">
                      {pred.fraud.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                Click "Run AI Risk & Fraud Check" to generate calibrated credit risk and SHAP explainability insights.
              </div>
            )}

          </div>

          {/* Section 3: Officer Decision Station */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-slate-700" />
                <h3 className="font-bold text-sm text-slate-900">Branch Officer Adjudication</h3>
              </div>
              <button
                onClick={() => setShowFlagModal(true)}
                className="flex items-center space-x-1.5 text-rose-600 hover:text-rose-700 font-semibold text-xs transition"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Flag as Suspicious / Fraud</span>
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Officer Review Notes
              </label>
              <textarea
                value={officerNote}
                onChange={(e) => setOfficerNote(e.target.value)}
                placeholder="Enter regulatory verification notes, income check findings, or conditions..."
                rows="2"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Decision Actions Bar */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                onClick={() => handleDecision('ON_HOLD')}
                disabled={deciding}
                className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2 rounded-xl transition shadow-xs disabled:opacity-50"
              >
                <PauseCircle className="w-4 h-4" />
                <span>Hold for Verification</span>
              </button>

              <button
                onClick={() => handleDecision('REJECTED')}
                disabled={deciding}
                className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2 rounded-xl transition shadow-xs disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Loan</span>
              </button>

              <button
                onClick={() => handleDecision('APPROVED')}
                disabled={deciding}
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2 rounded-xl transition shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Sanction / Approve Loan</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Manual Fraud Flag Modal */}
      {showFlagModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-rose-600 font-bold text-sm">
              <Flag className="w-5 h-5" />
              <span>Flag Applicant Identity in Fraud Registry</span>
            </div>
            <p className="text-xs text-slate-500">
              This will record a permanent fraud flag on this customer's biometric hash at Head Office.
            </p>
            <textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="State reason: e.g. Forged salary slip, mismatched PAN credentials, device spoofing..."
              rows="3"
              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowFlagModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleFlagFraud}
                disabled={flagging}
                className="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-xs"
              >
                {flagging ? 'Submitting...' : 'Submit Fraud Alert'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
