import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { 
  FileText, 
  Search, 
  Filter, 
  AlertCircle, 
  ArrowUpRight, 
  Calendar, 
  Clock, 
  RefreshCw, 
  X,
  CreditCard,
  Plus,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  User
} from 'lucide-react';

const ApplicationsPage = () => {
  const [applications, setApplications] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState('');

  // Modal State for New Application
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [form, setForm] = useState({
    customer_id: '',
    loan_amount: 250000,
    loan_purpose: 'PERSONAL',
    income: 650000,
    debt: 50000,
    credit_score: 720,
    employment_length_years: 3.5,
    home_ownership: 'RENT',
    previous_default: 0
  });

  const fetchApplications = async (isManual = false) => {
    try {
      if (isManual) setIsRefreshing(true);
      const url = statusFilter !== 'ALL' ? `/applications?status=${statusFilter}` : '/applications';
      const res = await api.get(url);
      setApplications(res.data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch loan applications from Bank B node.');
    } finally {
      setLoading(false);
      if (isManual) setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const fetchCustomersList = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
      if (res.data.length > 0 && !form.customer_id) {
        setForm(prev => ({ ...prev, customer_id: res.data[0].customer_id }));
      }
    } catch {
      // Non-critical, fallback to manual customer_id entry
    }
  };

  useEffect(() => {
    fetchApplications();
    fetchCustomersList();
    const interval = setInterval(() => {
      fetchApplications();
    }, 5000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const copyToClipboard = (text, idKey) => {
    navigator.clipboard.writeText(text);
    setCopiedId(idKey);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const handleCreateApplication = async (e) => {
    e.preventDefault();
    setModalError('');
    setSubmitting(true);
    try {
      await api.post('/applications', {
        customer_id: form.customer_id,
        loan_amount: parseFloat(form.loan_amount),
        loan_purpose: form.loan_purpose,
        income: parseFloat(form.income),
        debt: parseFloat(form.debt),
        credit_score: parseInt(form.credit_score, 10),
        employment_length_years: parseFloat(form.employment_length_years),
        home_ownership: form.home_ownership,
        previous_default: parseInt(form.previous_default, 10)
      });
      setShowModal(false);
      fetchApplications(true);
    } catch (err) {
      setModalError(err.message || 'Failed to register loan application.');
    } finally {
      setSubmitting(false);
    }
  };

  const customerMap = Object.fromEntries(customers.map(c => [c.customer_id, c.name]));

  const filteredApplications = applications.filter((app) => {
    if (!search) return true;
    const term = search.toLowerCase();
    const customerName = (customerMap[app.customer_id] || '').toLowerCase();
    return (
      app.application_id.toLowerCase().includes(term) ||
      app.customer_id.toLowerCase().includes(term) ||
      customerName.includes(term) ||
      (app.loan_purpose && app.loan_purpose.toLowerCase().includes(term))
    );
  });

  // Calculate summary counts
  const summaryCounts = {
    total: applications.length,
    submitted: applications.filter(a => a.status === 'SUBMITTED').length,
    under_review: applications.filter(a => a.status === 'UNDER_REVIEW').length,
    verification: applications.filter(a => a.status === 'VERIFICATION_REQUIRED').length,
    approved: applications.filter(a => a.status === 'APPROVED').length,
    rejected: applications.filter(a => a.status === 'REJECTED').length
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center space-x-1.5 whitespace-nowrap bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 text-[11px] px-2.5 py-1 rounded-full font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Approved</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center space-x-1.5 whitespace-nowrap bg-rose-950/80 text-rose-300 border border-rose-700/60 text-[11px] px-2.5 py-1 rounded-full font-bold">
            <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
            <span>Rejected</span>
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="inline-flex items-center space-x-1.5 whitespace-nowrap bg-amber-950/80 text-amber-300 border border-amber-700/60 text-[11px] px-2.5 py-1 rounded-full font-bold">
            <Clock className="w-3 h-3 text-amber-400 shrink-0" />
            <span>Under Review</span>
          </span>
        );
      case 'VERIFICATION_REQUIRED':
        return (
          <span className="inline-flex items-center space-x-1.5 whitespace-nowrap bg-purple-950/80 text-purple-300 border border-purple-700/60 text-[11px] px-2.5 py-1 rounded-full font-bold">
            <HelpCircle className="w-3 h-3 text-purple-400 shrink-0" />
            <span>Verification Needed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 whitespace-nowrap bg-slate-800 text-slate-300 border border-slate-700 text-[11px] px-2.5 py-1 rounded-full font-bold">
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
            <span>Submitted</span>
          </span>
        );
    }
  };

  const statusTabs = [
    { id: 'ALL', label: 'All', count: summaryCounts.total },
    { id: 'SUBMITTED', label: 'Submitted', count: summaryCounts.submitted },
    { id: 'UNDER_REVIEW', label: 'Under Review', count: summaryCounts.under_review },
    { id: 'VERIFICATION_REQUIRED', label: 'Verification', count: summaryCounts.verification },
    { id: 'APPROVED', label: 'Approved', count: summaryCounts.approved },
    { id: 'REJECTED', label: 'Rejected', count: summaryCounts.rejected },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Loan Application Registry
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Review, evaluate risk metrics, and process status transitions for Bank B applicants
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto">
          <button
            onClick={() => {
              fetchCustomersList();
              setShowModal(true);
            }}
            className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold px-4 py-2.5 rounded-2xl shadow-lg shadow-indigo-600/30 transition-all text-xs cursor-pointer border border-indigo-400/30"
          >
            <Plus className="w-4 h-4" />
            <span>New Loan Application</span>
          </button>

          <button
            onClick={() => fetchApplications(true)}
            className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-white/[0.08] text-slate-400 hover:text-white transition-all cursor-pointer shadow-md"
            title="Refresh application list"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/60 border border-rose-800 text-rose-300 p-4 rounded-2xl flex items-center space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1.5 bg-[#090d1c]/80 p-1.5 rounded-2xl border border-white/[0.07] overflow-x-auto">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center space-x-2 ${
                statusFilter === tab.id
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search App ID, Customer, Purpose..."
            className="w-full bg-[#090d1c]/80 border border-white/[0.08] rounded-xl pl-10 pr-9 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder-slate-500 shadow-inner"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Applications Table */}
      <div className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl">
        {loading && applications.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-slate-400 font-medium">Fetching applications from Bank B node...</p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="p-16 text-center text-slate-500 space-y-4">
            <FileText className="w-12 h-12 mx-auto text-slate-600 opacity-60" />
            <div>
              <p className="text-base font-bold text-slate-300">No Matching Loan Applications</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {search ? `No applications found matching "${search}".` : 'No applications found under this status filter.'}
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Application</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-slate-400 text-[11px] font-bold uppercase tracking-wider bg-slate-950/70">
                  <th className="py-3.5 px-4">Application ID</th>
                  <th className="py-3.5 px-4">Applicant Customer</th>
                  <th className="py-3.5 px-4">Loan Amount</th>
                  <th className="py-3.5 px-4">Purpose</th>
                  <th className="py-3.5 px-4">Credit Score</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredApplications.map((app) => (
                  <tr key={app.application_id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono font-bold text-indigo-400 text-xs">
                          {app.application_id}
                        </span>
                        <button
                          onClick={() => copyToClipboard(app.application_id, app.application_id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 transition-opacity"
                          title="Copy Application ID"
                        >
                          {copiedId === app.application_id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <Link 
                        to={`/customers/${app.customer_id}`}
                        className="group-hover/cust:text-indigo-400 block transition-colors"
                      >
                        <span className="font-semibold text-slate-100 text-xs block hover:text-indigo-400">
                          {customerMap[app.customer_id] || 'Customer'}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {app.customer_id}
                        </span>
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-100 text-xs">
                      ₹{(app.loan_amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/[0.06] text-[11px] text-slate-300 font-medium capitalize">
                        {(app.loan_purpose || 'PERSONAL').toLowerCase().replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs">
                      <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                        (app.credit_score || 0) >= 700 
                          ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                          : (app.credit_score || 0) >= 600
                            ? 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
                            : 'bg-rose-950/70 text-rose-300 border border-rose-800/60'
                      }`}>
                        {app.credit_score || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(app.status)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 font-mono">
                      {new Date(app.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/applications/${app.application_id}`}
                        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-900 hover:bg-indigo-600 px-3 py-1.5 rounded-xl border border-white/[0.08] transition-all shadow-sm"
                      >
                        <span>Review</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Loan Application Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-2xl rounded-3xl p-6 sm:p-8 border border-white/[0.1] shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-600/15 text-indigo-400 rounded-2xl border border-indigo-500/20">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Initiate Loan Application</h2>
                  <p className="text-xs text-slate-400">Register new credit risk dossier under Bank B local node</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-2xl flex items-center space-x-2 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateApplication} className="mt-6 space-y-4">
              {/* Customer Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Applicant Customer ID
                </label>
                {customers.length > 0 ? (
                  <select
                    value={form.customer_id}
                    onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                    required
                    className="w-full bg-slate-950/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {customers.map((c) => (
                      <option key={c.customer_id} value={c.customer_id}>
                        {c.customer_id} — {c.name} ({c.occupation})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={form.customer_id}
                    onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                    required
                    placeholder="e.g. CUST-000001"
                    className="w-full bg-slate-950/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                )}
              </div>

              {/* Amount & Purpose */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Requested Loan Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="10000"
                    step="5000"
                    value={form.loan_amount}
                    onChange={(e) => setForm({ ...form, loan_amount: e.target.value })}
                    required
                    className="w-full bg-slate-950/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-bold"
                  />
                  <span className="text-[10px] text-indigo-400 mt-1 block">
                    ₹{parseInt(form.loan_amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Loan Purpose
                  </label>
                  <select
                    value={form.loan_purpose}
                    onChange={(e) => setForm({ ...form, loan_purpose: e.target.value })}
                    className="w-full bg-slate-950/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="PERSONAL">Personal</option>
                    <option value="EDUCATION">Education</option>
                    <option value="MEDICAL">Medical</option>
                    <option value="VENTURE">Venture / Business</option>
                    <option value="DEBT_CONSOLIDATION">Debt Consolidation</option>
                    <option value="HOME_IMPROVEMENT">Home Improvement</option>
                  </select>
                </div>
              </div>

              {/* Income & Existing Debt */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Annual Income (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={form.income}
                    onChange={(e) => setForm({ ...form, income: e.target.value })}
                    required
                    className="w-full bg-slate-950/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Existing Debt (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={form.debt}
                    onChange={(e) => setForm({ ...form, debt: e.target.value })}
                    required
                    className="w-full bg-slate-950/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Credit Score & Work Experience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Credit Score (300 - 850)
                  </label>
                  <input
                    type="number"
                    min="300"
                    max="850"
                    value={form.credit_score}
                    onChange={(e) => setForm({ ...form, credit_score: e.target.value })}
                    required
                    className="w-full bg-slate-950/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Employment Length (Years)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.5"
                    value={form.employment_length_years}
                    onChange={(e) => setForm({ ...form, employment_length_years: e.target.value })}
                    required
                    className="w-full bg-slate-950/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Home Ownership & Previous Default */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Home Ownership
                  </label>
                  <select
                    value={form.home_ownership}
                    onChange={(e) => setForm({ ...form, home_ownership: e.target.value })}
                    className="w-full bg-slate-950/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="RENT">Rent</option>
                    <option value="OWN">Own</option>
                    <option value="MORTGAGE">Mortgage</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Previous Default Record
                  </label>
                  <select
                    value={form.previous_default}
                    onChange={(e) => setForm({ ...form, previous_default: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-950/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={0}>No Previous Default</option>
                    <option value={1}>Yes (Default History Exists)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Submitting Application...' : 'Create Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationsPage;
