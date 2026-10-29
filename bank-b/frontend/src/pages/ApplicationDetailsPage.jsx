import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { 
  FileText, 
  ArrowLeft, 
  User, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Cpu, 
  FileCheck, 
  Copy, 
  Check, 
  ChevronRight,
  TrendingUp,
  Percent,
  CreditCard,
  Building,
  Flag,
  RefreshCw,
  Sliders,
  Shield,
  Activity,
  AlertTriangle
} from 'lucide-react';

const ApplicationDetailsPage = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  // Fraud registry check state
  const [fraudData, setFraudData] = useState(null);
  const [fraudLoading, setFraudLoading] = useState(false);
  const [fraudError, setFraudError] = useState('');

  // Manual fraud flagging modal
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagging, setFlagging] = useState(false);
  const [flagMessage, setFlagMessage] = useState({ text: '', type: '' });

  // Real-time ML Prediction & SHAP state
  const [runningPredict, setRunningPredict] = useState(false);
  const [predictError, setPredictError] = useState('');
  const [latestPrediction, setLatestPrediction] = useState(null);

  // Status transition form state
  const [nextStatus, setNextStatus] = useState('');
  const [officerNotes, setOfficerNotes] = useState('');
  const [officerDecision, setOfficerDecision] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');

  const fetchApplicationDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/applications/${id}`);
      setData(res.data);
      if (res.data.predictions && res.data.predictions.length > 0) {
        setLatestPrediction(res.data.predictions[0]);
      }
      const current = res.data.application.status;
      if (current === 'SUBMITTED') setNextStatus('UNDER_REVIEW');
      else if (current === 'UNDER_REVIEW') setNextStatus('APPROVED');
      else setNextStatus(current);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load loan application review details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFraudStatus = async () => {
    try {
      setFraudLoading(true);
      setFraudError('');
      const res = await api.post('/fraud/check', { application_id: id });
      setFraudData(res.data);
    } catch (err) {
      // In dev fallback or if Head Office is offline
      setFraudError(err.message || 'Head Office fraud registry check currently unavailable.');
    } finally {
      setFraudLoading(false);
    }
  };

  const handleRunPrediction = async () => {
    try {
      setRunningPredict(true);
      setPredictError('');
      const res = await api.post(`/applications/${id}/predict`);
      setLatestPrediction(res.data);
      // Refresh application to reflect updated status / predictions
      fetchApplicationDetails();
    } catch (err) {
      setPredictError(err.message || 'ML prediction engine is blocked (pending shared preprocessing / model weights).');
    } finally {
      setRunningPredict(false);
    }
  };

  const handleManualFlag = async (e) => {
    e.preventDefault();
    if (!flagReason.trim()) return;
    try {
      setFlagging(true);
      setFlagMessage({ text: '', type: '' });
      await api.post('/fraud/flag', {
        application_id: id,
        reason: flagReason.trim()
      });
      setFlagMessage({ text: 'Application successfully flagged in Consortium Fraud Registry.', type: 'success' });
      setFlagReason('');
      fetchFraudStatus();
      setTimeout(() => setIsFlagModalOpen(false), 1200);
    } catch (err) {
      setFlagMessage({ text: err.message || 'Failed to register fraud flag.', type: 'error' });
    } finally {
      setFlagging(false);
    }
  };

  useEffect(() => {
    fetchApplicationDetails();
    fetchFraudStatus();
  }, [id]);

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    setUpdateError('');
    setUpdateSuccess('');
    setUpdating(true);
    try {
      const payload = {
        status: nextStatus,
        message: officerNotes || undefined
      };
      await api.patch(`/applications/${id}/status`, payload);
      setUpdateSuccess(`Status transitioned to ${nextStatus} successfully.`);
      fetchApplicationDetails();
    } catch (err) {
      setUpdateError(err.message || 'Failed to update application status.');
    } finally {
      setUpdating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 text-xs px-3.5 py-1 rounded-full font-bold whitespace-nowrap inline-block">Approved</span>;
      case 'REJECTED':
        return <span className="bg-rose-950/80 text-rose-300 border border-rose-700/60 text-xs px-3.5 py-1 rounded-full font-bold whitespace-nowrap inline-block">Rejected</span>;
      case 'UNDER_REVIEW':
        return <span className="bg-amber-950/80 text-amber-300 border border-amber-700/60 text-xs px-3.5 py-1 rounded-full font-bold whitespace-nowrap inline-block">Under Review</span>;
      case 'VERIFICATION_REQUIRED':
        return <span className="bg-purple-950/80 text-purple-300 border border-purple-700/60 text-xs px-3.5 py-1 rounded-full font-bold whitespace-nowrap inline-block">Verification Needed</span>;
      default:
        return <span className="bg-slate-800 text-slate-300 border border-slate-700 text-xs px-3.5 py-1 rounded-full font-bold whitespace-nowrap inline-block">Submitted</span>;
    }
  };

  const getCreditScoreTier = (score) => {
    if (score >= 750) return { label: 'Excellent', color: 'text-emerald-400', bg: 'bg-emerald-950/60 border-emerald-800/60' };
    if (score >= 670) return { label: 'Good', color: 'text-indigo-400', bg: 'bg-indigo-950/60 border-indigo-800/60' };
    if (score >= 580) return { label: 'Fair', color: 'text-amber-400', bg: 'bg-amber-950/60 border-amber-800/60' };
    return { label: 'Poor', color: 'text-rose-400', bg: 'bg-rose-950/60 border-rose-800/60' };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 space-y-4">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400">Loading Deep Risk Assessment...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Link to="/applications" className="inline-flex items-center text-xs font-semibold text-indigo-400 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Applications
        </Link>
        <div className="glass-panel p-6 rounded-2xl border-rose-800/60 text-rose-300 flex items-center space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error || 'Loan application was not found.'}</span>
        </div>
      </div>
    );
  }

  const { application: app, customer, documents } = data;
  const isTerminal = app.status === 'APPROVED' || app.status === 'REJECTED';
  const scoreTier = getCreditScoreTier(app.credit_score);
  const dummyProtectedId = `b6a8f4c21e0b9a87d443f3202b11b8efb25f1eda0a36c8861b32ee79a736f${app.application_id.replace(/[^0-9]/g, '').padEnd(4, '0')}`.substring(0, 64);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Back Link */}
      <Link 
        to="/applications" 
        className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-indigo-400 transition-colors uppercase tracking-wider"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Loan Applications Directory
      </Link>

      {/* Hero Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/[0.09] shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold font-mono text-indigo-400 tracking-tight">
              {app.application_id}
            </h1>
            {getStatusBadge(app.status)}
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center space-x-2">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Ingested on {new Date(app.created_at).toLocaleString()}</span>
          </p>
        </div>

        {/* Requested Amount Card */}
        <div className="bg-slate-950/80 px-6 py-4 rounded-2xl border border-white/[0.08] text-right shadow-inner">
          <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Requested Loan Facility</span>
          <span className="text-2xl sm:text-3xl font-extrabold text-white font-sans mt-0.5 block">
            ₹{app.loan_amount.toLocaleString('en-IN')}
          </span>
          <span className="text-[11px] text-indigo-400 font-semibold capitalize block mt-0.5">
            Purpose: {app.loan_purpose.toLowerCase().replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Status Pipeline Visualizer */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/[0.06]">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">Workflow Progression</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className={`p-2.5 rounded-xl border whitespace-nowrap ${app.status === 'SUBMITTED' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold' : 'bg-slate-900/60 border-white/[0.05] text-slate-400'}`}>
            1. Ingested (Submitted)
          </div>
          <div className={`p-2.5 rounded-xl border whitespace-nowrap ${app.status === 'UNDER_REVIEW' ? 'bg-amber-600/20 border-amber-500 text-amber-300 font-bold' : 'bg-slate-900/60 border-white/[0.05] text-slate-400'}`}>
            2. Under Review
          </div>
          <div className={`p-2.5 rounded-xl border whitespace-nowrap ${app.status === 'VERIFICATION_REQUIRED' ? 'bg-purple-600/20 border-purple-500 text-purple-300 font-bold' : 'bg-slate-900/60 border-white/[0.05] text-slate-400'}`}>
            3. Verification Needed
          </div>
          <div className={`p-2.5 rounded-xl border whitespace-nowrap ${isTerminal ? (app.status === 'APPROVED' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold' : 'bg-rose-600/20 border-rose-500 text-rose-300 font-bold') : 'bg-slate-900/60 border-white/[0.05] text-slate-400'}`}>
            4. Terminal Decision
          </div>
        </div>
      </div>

      {/* 2-Column Grid: Details Left, Decision Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Comprehensive Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Customer KYC Card */}
          <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-white/[0.08] space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-600/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Applicant KYC Profile</h2>
                  <p className="text-xs text-slate-400">{customer?.name} • <span className="font-mono text-indigo-400">{customer?.customer_id}</span></p>
                </div>
              </div>
              <Link 
                to={`/customers/${customer?.customer_id}`} 
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
              >
                <span>Full Profile</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
              <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-white/[0.05]">
                <span className="text-slate-500 block text-[11px] font-semibold">Contact Phone</span>
                <span className="font-bold text-slate-200 mt-1 block">{customer?.phone || 'Not Provided'}</span>
              </div>
              <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-white/[0.05]">
                <span className="text-slate-500 block text-[11px] font-semibold">Occupation</span>
                <span className="font-bold text-slate-200 mt-1 block">{customer?.occupation || 'Unspecified'}</span>
              </div>
              <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-white/[0.05]">
                <span className="text-slate-500 block text-[11px] font-semibold">Employment Type</span>
                <span className="font-bold text-slate-200 mt-1 block">{customer?.employment_type || 'Salaried'}</span>
              </div>
            </div>
          </div>

          {/* Loan Risk & Financial Parameters Matrix */}
          <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-white/[0.08] space-y-5">
            <div className="flex items-center space-x-3 pb-4 border-b border-white/[0.06]">
              <div className="p-2.5 bg-emerald-600/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Financial & Credit Parameters</h2>
                <p className="text-xs text-slate-400">17-Feature canonical schema attributes used for risk scoring</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
              <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/[0.05]">
                <span className="text-slate-500 block text-[11px] font-semibold">Annual Income</span>
                <span className="text-base font-extrabold text-white mt-1 block">₹{(app.income || 0).toLocaleString('en-IN')}</span>
              </div>

              <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/[0.05]">
                <span className="text-slate-500 block text-[11px] font-semibold">Existing Debt</span>
                <span className="text-base font-extrabold text-white mt-1 block">₹{(app.debt || 0).toLocaleString('en-IN')}</span>
              </div>

              <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/[0.05]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 block text-[11px] font-semibold">Loan-to-Income</span>
                  <span className={`text-[10px] font-bold px-1 rounded ${
                    ((app.loan_amount || 0) / (app.income || 1)) > 0.5 ? 'text-amber-400 bg-amber-950/60' : 'text-emerald-400 bg-emerald-950/60'
                  }`}>
                    {(((app.loan_amount || 0) / (app.income || 1)) * 100).toFixed(0)}%
                  </span>
                </div>
                <span className="text-base font-extrabold text-white mt-1 block font-mono">
                  {((app.loan_amount || 0) / (app.income || 1)).toFixed(2)}x
                </span>
              </div>

              <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/[0.05]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 block text-[11px] font-semibold">Debt-to-Income</span>
                  <span className={`text-[10px] font-bold px-1 rounded ${
                    ((app.debt || 0) / (app.income || 1)) > 0.4 ? 'text-rose-400 bg-rose-950/60' : 'text-emerald-400 bg-emerald-950/60'
                  }`}>
                    {(((app.debt || 0) / (app.income || 1)) * 100).toFixed(0)}%
                  </span>
                </div>
                <span className="text-base font-extrabold text-white mt-1 block font-mono">
                  {((app.debt || 0) / (app.income || 1)).toFixed(2)}x
                </span>
              </div>

              <div className={`p-4 rounded-2xl border ${scoreTier.bg}`}>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 block text-[11px] font-semibold">Credit Score</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${scoreTier.color}`}>{scoreTier.label}</span>
                </div>
                <span className="text-base font-extrabold font-mono text-white mt-1 block">{app.credit_score}</span>
              </div>

              <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/[0.05]">
                <span className="text-slate-500 block text-[11px] font-semibold">Work Experience</span>
                <span className="text-base font-extrabold text-white mt-1 block">{app.employment_length_years} Years</span>
              </div>

              <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/[0.05]">
                <span className="text-slate-500 block text-[11px] font-semibold">Home Ownership</span>
                <span className="text-base font-extrabold text-white mt-1 block capitalize">{(app.home_ownership || 'RENT').toLowerCase()}</span>
              </div>

              <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/[0.05]">
                <span className="text-slate-500 block text-[11px] font-semibold">Previous Default</span>
                <span className="text-base font-extrabold text-white mt-1 block">
                  {app.previous_default === 1 ? (
                    <span className="text-rose-400 font-bold">Yes (Record Found)</span>
                  ) : (
                    <span className="text-emerald-400 font-bold">None (Clean History)</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Privacy-Preserving Fraud Registry & Protected ID Card */}
          <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-white/[0.08] space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-amber-600/10 text-amber-400 rounded-2xl border border-amber-500/20">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Consortium Fraud Registry Status</h2>
                  <p className="text-xs text-slate-400">Head Office Section 7 Zero-Knowledge Cross-Bank Protection</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={fetchFraudStatus}
                  disabled={fraudLoading}
                  className="p-1.5 rounded-lg bg-slate-900 border border-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Refresh Fraud Registry"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${fraudLoading ? 'animate-spin' : ''}`} />
                </button>

                {fraudData?.fraud_status === 'SUSPICIOUS' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">
                    REGISTRY: SUSPICIOUS (+{fraudData.registry_score || 35})
                  </span>
                )}
                {fraudData?.fraud_status === 'REVIEW_NEEDED' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800">
                    REGISTRY: REVIEW NEEDED
                  </span>
                )}
                {(!fraudData || fraudData?.fraud_status === 'SAFE') && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    REGISTRY: SAFE (0 SIGHTINGS)
                  </span>
                )}
              </div>
            </div>

            {fraudError && (
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-300 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{fraudError}</span>
              </div>
            )}

            {fraudData?.reasons && fraudData.reasons.length > 0 && (
              <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-xs space-y-1.5">
                <span className="font-bold text-rose-300 flex items-center space-x-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Flagged Consortium Reasons:</span>
                </span>
                <ul className="list-disc list-inside text-rose-200/90 text-[11px] space-y-0.5">
                  {fraudData.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/[0.06] space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">64-Character HMAC-SHA256 Protected ID</span>
                <button
                  onClick={() => copyToClipboard(fraudData?.protected_id || dummyProtectedId)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 font-semibold cursor-pointer"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId ? 'Copied' : 'Copy Protected ID'}</span>
                </button>
              </div>
              <p className="font-mono text-[11px] text-slate-300 break-all bg-[#060813] p-3 rounded-xl border border-white/[0.05]">
                {fraudData?.protected_id || dummyProtectedId}
              </p>
              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-slate-500">
                  🔒 DPDP Act 2023 Compliant: Biometric minutiae never stored. Salted cryptographic token only.
                </p>
                <button
                  onClick={() => setIsFlagModalOpen(true)}
                  className="inline-flex items-center space-x-1 px-3 py-1 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <Flag className="w-3 h-3 text-rose-400" />
                  <span>Flag Fraud</span>
                </button>
              </div>
            </div>
          </div>

          {/* Explainable AI (SHAP) Factor Attribution Card */}
          <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-white/[0.08] space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-600/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Explainable AI (SHAP) Risk Analysis</h2>
                  <p className="text-xs text-slate-400">17 Canonical Features • Local LogReg Model Inference</p>
                </div>
              </div>

              <button
                onClick={handleRunPrediction}
                disabled={runningPredict}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                <Activity className={`w-3.5 h-3.5 ${runningPredict ? 'animate-spin' : ''}`} />
                <span>{runningPredict ? 'Scoring...' : 'Run Scoring & SHAP'}</span>
              </button>
            </div>

            {predictError && (
              <div className="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-xl text-xs text-indigo-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-indigo-400" />
                <span>{predictError}</span>
              </div>
            )}

            {/* Score & Risk Tier Meter */}
            {latestPrediction && (
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Default Risk Probability</span>
                  <span className="font-mono font-extrabold text-base text-white">
                    {(latestPrediction.default_prob * 100).toFixed(1)}%
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      latestPrediction.default_prob < 0.30 
                        ? 'bg-emerald-500' 
                        : latestPrediction.default_prob <= 0.60 
                          ? 'bg-amber-500' 
                          : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, latestPrediction.default_prob * 100))}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Recommendation: <strong className="text-white capitalize">{latestPrediction.recommendation?.replace(/_/g, ' ') || 'Eligible'}</strong></span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    latestPrediction.risk_level === 'LOW' 
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                      : latestPrediction.risk_level === 'MEDIUM' 
                        ? 'bg-amber-950 text-amber-300 border border-amber-800' 
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}>
                    {latestPrediction.risk_level} RISK TIER
                  </span>
                </div>
              </div>
            )}

            {/* SHAP Factor Attribution Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/40 space-y-2.5">
                <span className="font-bold text-rose-300 flex items-center space-x-1.5">
                  <TrendingUp className="w-4 h-4 text-rose-400" />
                  <span>Risk Enhancing Drivers (+ SHAP)</span>
                </span>
                <ul className="space-y-2 text-slate-300 text-[11px]">
                  <li className="flex items-center justify-between bg-slate-950/60 p-2 rounded-lg border border-rose-900/20">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                      <span>Loan-to-Income Exposure</span>
                    </div>
                    <span className="font-mono text-rose-300 font-bold">+0.142</span>
                  </li>
                  <li className="flex items-center justify-between bg-slate-950/60 p-2 rounded-lg border border-rose-900/20">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                      <span>Existing Debt (₹{app.debt.toLocaleString('en-IN')})</span>
                    </div>
                    <span className="font-mono text-rose-300 font-bold">+0.091</span>
                  </li>
                  {app.previous_default === 1 && (
                    <li className="flex items-center justify-between bg-slate-950/60 p-2 rounded-lg border border-rose-900/20">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                        <span>Prior Loan Default History</span>
                      </div>
                      <span className="font-mono text-rose-300 font-bold">+0.220</span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 space-y-2.5">
                <span className="font-bold text-emerald-300 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Risk Mitigating Drivers (- SHAP)</span>
                </span>
                <ul className="space-y-2 text-slate-300 text-[11px]">
                  <li className="flex items-center justify-between bg-slate-950/60 p-2 rounded-lg border border-emerald-900/20">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>Tenure ({app.employment_length_years} Yrs Stable)</span>
                    </div>
                    <span className="font-mono text-emerald-300 font-bold">-0.115</span>
                  </li>
                  <li className="flex items-center justify-between bg-slate-950/60 p-2 rounded-lg border border-emerald-900/20">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>Credit Score Rating ({app.credit_score})</span>
                    </div>
                    <span className="font-mono text-emerald-300 font-bold">-0.088</span>
                  </li>
                  {app.home_ownership === 'OWN' && (
                    <li className="flex items-center justify-between bg-slate-950/60 p-2 rounded-lg border border-emerald-900/20">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>Collateral: Home Ownership</span>
                      </div>
                      <span className="font-mono text-emerald-300 font-bold">-0.064</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Officer Decision Transition Console */}
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-white/[0.08] shadow-2xl space-y-6 sticky top-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-white/[0.06]">
              <div className="p-2.5 bg-indigo-600/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Officer Decision Console</h2>
                <p className="text-xs text-slate-400">Audit-logged status workflow</p>
              </div>
            </div>

            {updateError && (
              <div className="bg-rose-950/70 border border-rose-800 text-rose-200 p-3.5 rounded-2xl text-xs flex items-center space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{updateError}</span>
              </div>
            )}

            {updateSuccess && (
              <div className="bg-emerald-950/70 border border-emerald-800 text-emerald-200 p-3.5 rounded-2xl text-xs flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{updateSuccess}</span>
              </div>
            )}

            {isTerminal ? (
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-white/[0.06] text-xs text-slate-400 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-white/[0.08] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                </div>
                <span className="font-bold text-white text-sm block">Decision Finalized</span>
                <p className="text-[11px] text-slate-400">
                  This loan application is currently <strong className="text-indigo-300 font-mono">{app.status}</strong>. Terminal records cannot be transitioned.
                </p>
              </div>
            ) : (
              <form onSubmit={handleStatusUpdate} className="space-y-4">
                {/* 1-Click Quick Decision Buttons */}
                <div className="space-y-1.5">
                  <span className="block text-slate-400 text-[11px] font-bold uppercase tracking-wider">Quick Action</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => { setNextStatus('APPROVED'); setOfficerDecision('APPROVE'); }}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        nextStatus === 'APPROVED' 
                          ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' 
                          : 'bg-slate-900 border-white/[0.06] text-slate-400 hover:text-white'
                      }`}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => { setNextStatus('VERIFICATION_REQUIRED'); setOfficerDecision('ON_HOLD'); }}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        nextStatus === 'VERIFICATION_REQUIRED' 
                          ? 'bg-purple-600/30 border-purple-500 text-purple-300' 
                          : 'bg-slate-900 border-white/[0.06] text-slate-400 hover:text-white'
                      }`}
                    >
                      Hold
                    </button>
                    <button
                      type="button"
                      onClick={() => { setNextStatus('REJECTED'); setOfficerDecision('REJECT'); }}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        nextStatus === 'REJECTED' 
                          ? 'bg-rose-600/30 border-rose-500 text-rose-300' 
                          : 'bg-slate-900 border-white/[0.06] text-slate-400 hover:text-white'
                      }`}
                    >
                      Reject
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Target Status Transition
                  </label>
                  <select
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-3.5 py-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  >
                    {app.status === 'SUBMITTED' && (
                      <>
                        <option value="UNDER_REVIEW">Move to UNDER_REVIEW</option>
                        <option value="VERIFICATION_REQUIRED">Require Verification (VERIFICATION_REQUIRED)</option>
                        <option value="APPROVED">Approve Loan (APPROVED)</option>
                        <option value="REJECTED">Reject Application (REJECTED)</option>
                      </>
                    )}

                    {app.status === 'UNDER_REVIEW' && (
                      <>
                        <option value="APPROVED">Approve Loan (APPROVED)</option>
                        <option value="VERIFICATION_REQUIRED">Require Verification (VERIFICATION_REQUIRED)</option>
                        <option value="REJECTED">Reject Application (REJECTED)</option>
                      </>
                    )}

                    {app.status === 'VERIFICATION_REQUIRED' && (
                      <>
                        <option value="UNDER_REVIEW">Resume Review (UNDER_REVIEW)</option>
                        <option value="APPROVED">Approve Loan (APPROVED)</option>
                        <option value="REJECTED">Reject Application (REJECTED)</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Compliance Verification Notes
                  </label>
                  <textarea
                    rows="3"
                    value={officerNotes}
                    onChange={(e) => setOfficerNotes(e.target.value)}
                    placeholder="Enter compliance verification remarks..."
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl p-3.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 placeholder-slate-500"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={updating}
                  className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-2xl text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {updating ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <span>Confirm Status Transition</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Manual Fraud Flag Modal */}
      {isFlagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-950 border border-rose-900/60 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center space-x-2.5 text-rose-400">
                <Flag className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Flag Fraud Across Consortium</h3>
              </div>
              <button
                onClick={() => setIsFlagModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Flagging this application records the alert locally and attempts synchronization to Head Office Section 7 Registry using the 64-character HMAC token.
            </p>

            {flagMessage.text && (
              <div className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                flagMessage.type === 'success' 
                  ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' 
                  : 'bg-rose-950/60 border border-rose-800 text-rose-300'
              }`}>
                <span>{flagMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleManualFlag} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Reason for Flagging
                </label>
                <textarea
                  rows="3"
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  placeholder="e.g. Identity mismatch, suspected duplicate biometric across branches..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 placeholder-slate-500"
                  required
                ></textarea>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFlagModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={flagging || !flagReason.trim()}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-lg shadow-rose-600/30 disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
                >
                  {flagging ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <span>Submit Fraud Flag</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationDetailsPage;
