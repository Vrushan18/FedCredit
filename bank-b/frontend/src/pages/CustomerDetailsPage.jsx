import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { 
  User, 
  Phone, 
  MapPin, 
  Briefcase, 
  FileText, 
  ArrowLeft, 
  Plus, 
  AlertCircle, 
  Calendar,
  ShieldCheck,
  CreditCard,
  TrendingUp,
  Clock,
  Copy,
  Check,
  ChevronRight,
  IndianRupee,
  BadgePercent,
  CheckCircle2,
  XCircle,
  HelpCircle,
  X
} from 'lucide-react';

const CustomerDetailsPage = () => {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  // Create Application Modal State
  const [showAppModal, setShowAppModal] = useState(false);
  const [appForm, setAppForm] = useState({
    income: 600000,
    employment_length_years: 3,
    debt: 50000,
    credit_score: 720,
    loan_amount: 250000,
    loan_purpose: 'PERSONAL',
    home_ownership: 'RENT',
    previous_default: 0
  });
  const [submittingApp, setSubmittingApp] = useState(false);
  const [appError, setAppError] = useState('');

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/customers/${id}`);
      setCustomer(res.data.customer);
      setApplications(res.data.applications || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load customer profile from Bank B database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCreateApplication = async (e) => {
    e.preventDefault();
    setAppError('');
    setSubmittingApp(true);
    try {
      await api.post('/applications', {
        customer_id: id,
        ...appForm
      });
      setShowAppModal(false);
      fetchCustomerDetails();
    } catch (err) {
      setAppError(err.message || 'Failed to submit loan application for customer.');
    } finally {
      setSubmittingApp(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center space-x-1.5 whitespace-nowrap bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1 rounded-full font-semibold shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Approved</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center space-x-1.5 whitespace-nowrap bg-rose-500/10 text-rose-400 border border-rose-500/30 text-xs px-3 py-1 rounded-full font-semibold shadow-sm">
            <XCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Rejected</span>
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center space-x-1.5 whitespace-nowrap bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs px-3 py-1 rounded-full font-semibold shadow-sm">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>Under Review</span>
          </span>
        );
      case 'VERIFICATION_REQUIRED':
        return (
          <span className="inline-flex items-center space-x-1.5 whitespace-nowrap bg-purple-500/10 text-purple-400 border border-purple-500/30 text-xs px-3 py-1 rounded-full font-semibold shadow-sm">
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Verification Required</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 whitespace-nowrap bg-slate-800 text-slate-300 border border-slate-700 text-xs px-3 py-1 rounded-full font-semibold">
            <span>{status || 'Submitted'}</span>
          </span>
        );
    }
  };

  const getInitials = (name) => {
    if (!name) return 'CU';
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Calculations for quick financial overview
  const totalLoanAmount = applications.reduce((acc, app) => acc + (parseFloat(app.loan_amount) || 0), 0);
  const approvedLoans = applications.filter(app => app.status === 'APPROVED');
  const pendingLoans = applications.filter(app => app.status === 'UNDER_REVIEW' || app.status === 'VERIFICATION_REQUIRED');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 space-y-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <User className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
        </div>
        <p className="text-sm font-medium text-slate-300 tracking-wide">Retrieving Customer Dossier...</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Link 
          to="/customers" 
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Customer Directory
        </Link>
        <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-rose-300 flex items-start space-x-4 shadow-xl">
          <AlertCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-base text-rose-200">Customer Profile Unavailable</h3>
            <p className="text-sm text-rose-300/80 mt-1">{error || 'The requested customer profile could not be located in Bank B local records.'}</p>
            <Link 
              to="/customers"
              className="inline-block mt-4 text-xs font-semibold text-rose-300 underline hover:text-white"
            >
              Return to KYC Directory
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link 
          to="/customers" 
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-indigo-400 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5 group-hover:-translate-x-0.5 transition-transform" /> 
          Back to Customer Directory
        </Link>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAppModal(true)}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold px-4 py-2.5 rounded-2xl shadow-lg shadow-indigo-600/30 transition-all text-sm cursor-pointer border border-indigo-400/30"
          >
            <Plus className="w-4 h-4" />
            <span>New Loan Application</span>
          </button>
        </div>
      </div>

      {/* Hero Customer Profile Dossier Card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c1022]/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/[0.08]">
          <div className="flex items-start sm:items-center space-x-5">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-indigo-600/30 to-purple-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-extrabold text-xl sm:text-2xl shadow-inner">
                {getInitials(customer.name)}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#0c1022] flex items-center justify-center text-slate-950" title="KYC Verified">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {customer.name}
                </h1>
                <span className="inline-flex items-center space-x-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified KYC</span>
                </span>
                <span className="text-[11px] font-semibold text-slate-400 bg-white/[0.04] border border-white/10 px-2.5 py-0.5 rounded-full">
                  Node Bank-B Client
                </span>
              </div>

              <div className="flex items-center space-x-3 text-xs text-slate-400">
                <span className="font-mono bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 text-indigo-400 flex items-center space-x-1.5">
                  <span>ID: {customer.customer_id}</span>
                  <button 
                    onClick={() => copyToClipboard(customer.customer_id)}
                    className="hover:text-white transition-colors"
                    title="Copy Customer ID"
                  >
                    {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </span>
                <span className="hidden sm:inline-block text-slate-600">•</span>
                <span className="hidden sm:inline-block text-slate-400 font-medium">Co-operative Bank Member</span>
              </div>
            </div>
          </div>

          {/* Quick Portfolio Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#080b18]/80 p-3.5 rounded-2xl border border-white/[0.05]">
            <div className="text-center px-3 py-1">
              <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Loans</span>
              <span className="text-lg font-bold text-white">{applications.length}</span>
            </div>
            <div className="text-center px-3 py-1 border-l border-white/[0.08]">
              <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">Approved</span>
              <span className="text-lg font-bold text-emerald-400">{approvedLoans.length}</span>
            </div>
            <div className="text-center px-3 py-1 border-l border-white/[0.08] col-span-2 sm:col-span-1">
              <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">Requested Vol</span>
              <span className="text-lg font-bold text-indigo-400">₹{(totalLoanAmount / 100000).toFixed(1)}L</span>
            </div>
          </div>
        </div>

        {/* Demographics & Verified Attributes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/[0.06] hover:border-indigo-500/30 transition-colors">
            <div className="flex items-center space-x-2.5 text-slate-400 text-xs font-semibold mb-1.5">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                <User className="w-4 h-4" />
              </div>
              <span>Demographics</span>
            </div>
            <p className="text-sm font-bold text-slate-100">{customer.age} Years Old</p>
            <p className="text-xs text-slate-400 mt-0.5">Gender: {customer.gender || 'Not Specified'}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/[0.06] hover:border-indigo-500/30 transition-colors">
            <div className="flex items-center space-x-2.5 text-slate-400 text-xs font-semibold mb-1.5">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Phone className="w-4 h-4" />
              </div>
              <span>Contact Telephony</span>
            </div>
            <p className="text-sm font-bold text-slate-100 font-mono">{customer.phone}</p>
            <p className="text-xs text-emerald-400 mt-0.5 flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>SMS 2FA Enabled</span>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/[0.06] hover:border-indigo-500/30 transition-colors">
            <div className="flex items-center space-x-2.5 text-slate-400 text-xs font-semibold mb-1.5">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <span>Employment Profile</span>
            </div>
            <p className="text-sm font-bold text-slate-100 truncate">{customer.occupation || 'Professional'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{customer.employment_type || 'Salaried'} Tier</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/[0.06] hover:border-indigo-500/30 transition-colors">
            <div className="flex items-center space-x-2.5 text-slate-400 text-xs font-semibold mb-1.5">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                <MapPin className="w-4 h-4" />
              </div>
              <span>Registered Address</span>
            </div>
            <p className="text-sm font-bold text-slate-100 truncate" title={customer.address}>
              {customer.address}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Physical KYC Audited</p>
          </div>
        </div>
      </div>

      {/* Customer's Loan Applications Dossier */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-lg font-bold text-white tracking-tight">Loan Application History</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {applications.length} {applications.length === 1 ? 'Record' : 'Records'}
                </span>
              </div>
              <p className="text-xs text-slate-400">All credit evaluations and underwriting records for {customer.name}</p>
            </div>
          </div>

          {applications.length > 0 && (
            <button
              onClick={() => setShowAppModal(true)}
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 rounded-xl transition-all self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Apply Another Loan</span>
            </button>
          )}
        </div>

        {applications.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1022]/60 p-12 text-center backdrop-blur-xl">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white">No Loan Applications on Record</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-6">
              This customer currently has no active or past loan applications submitted under Bank B node.
            </p>
            <button
              onClick={() => setShowAppModal(true)}
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-indigo-600/30"
            >
              <Plus className="w-4 h-4" />
              <span>Create Initial Loan Application</span>
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c1022]/90 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-slate-950/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-4 px-6">Application ID</th>
                    <th className="py-4 px-6">Requested Amount</th>
                    <th className="py-4 px-6">Purpose</th>
                    <th className="py-4 px-6">Evaluation Status</th>
                    <th className="py-4 px-6">Submission Date</th>
                    <th className="py-4 px-6 text-right">Audit Dossier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {applications.map((app) => (
                    <tr 
                      key={app.application_id} 
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="py-4 px-6">
                        <Link 
                          to={`/applications/${app.application_id}`}
                          className="font-mono text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center space-x-1"
                        >
                          <span>{app.application_id}</span>
                        </Link>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-white text-sm">
                          ₹{Number(app.loan_amount || 0).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center text-xs font-medium text-slate-300 capitalize bg-white/[0.03] px-2.5 py-1 rounded-lg border border-white/[0.06]">
                          {app.loan_purpose ? app.loan_purpose.toLowerCase().replace('_', ' ') : 'General'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {getStatusBadge(app.status)}
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-400">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {app.created_at ? new Date(app.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            }) : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link
                          to={`/applications/${app.application_id}`}
                          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] px-3.5 py-1.5 rounded-xl border border-white/[0.08] transition-all group-hover:border-indigo-500/40"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Loan Application Modal */}
      {showAppModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#0c1022] border border-white/10 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-center justify-between border-b border-white/[0.08] pb-5">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Submit Loan Request</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Origination under {customer.name} ({customer.customer_id})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAppModal(false)}
                className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {appError && (
              <div className="bg-rose-950/60 border border-rose-800/80 text-rose-300 p-3.5 rounded-2xl text-xs flex items-center space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{appError}</span>
              </div>
            )}

            <form onSubmit={handleCreateApplication} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Requested Loan Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min="1000"
                      value={appForm.loan_amount}
                      onChange={(e) => setAppForm({ ...appForm, loan_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#070a16] border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Annual Income (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min="0"
                      value={appForm.income}
                      onChange={(e) => setAppForm({ ...appForm, income: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-[#070a16] border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Loan Purpose
                  </label>
                  <select
                    value={appForm.loan_purpose}
                    onChange={(e) => setAppForm({ ...appForm, loan_purpose: e.target.value })}
                    className="w-full bg-[#070a16] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 cursor-pointer"
                  >
                    <option value="PERSONAL">Personal</option>
                    <option value="EDUCATION">Education</option>
                    <option value="MEDICAL">Medical</option>
                    <option value="VENTURE">Venture / Business</option>
                    <option value="DEBT_CONSOLIDATION">Debt Consolidation</option>
                    <option value="HOME_IMPROVEMENT">Home Improvement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Home Ownership
                  </label>
                  <select
                    value={appForm.home_ownership}
                    onChange={(e) => setAppForm({ ...appForm, home_ownership: e.target.value })}
                    className="w-full bg-[#070a16] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50 cursor-pointer"
                  >
                    <option value="RENT">Rent</option>
                    <option value="OWN">Own</option>
                    <option value="MORTGAGE">Mortgage</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Current Debt (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={appForm.debt}
                    onChange={(e) => setAppForm({ ...appForm, debt: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#070a16] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Credit Score (300-850)
                  </label>
                  <input
                    type="number"
                    required
                    min="300"
                    max="850"
                    value={appForm.credit_score}
                    onChange={(e) => setAppForm({ ...appForm, credit_score: parseInt(e.target.value) || 300 })}
                    className="w-full bg-[#070a16] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Work Exp (Years)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.5"
                    value={appForm.employment_length_years}
                    onChange={(e) => setAppForm({ ...appForm, employment_length_years: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#070a16] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  The application will be evaluated through Bank B's local federated model checkpoint and logged directly to local bank storage.
                </span>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowAppModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingApp}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-60 border border-indigo-400/30"
                >
                  {submittingApp ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Evaluating & Filing...</span>
                    </>
                  ) : (
                    <span>Submit Application</span>
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

export default CustomerDetailsPage;
