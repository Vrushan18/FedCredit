import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  FileText, 
  ChevronRight, 
  AlertCircle, 
  ArrowUpRight, 
  ShieldCheck, 
  Activity, 
  Cpu, 
  RefreshCw,
  Plus,
  UserPlus,
  Database,
  Building2,
  TrendingUp,
  FileCheck
} from 'lucide-react';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [recentApplications, setRecentApplications] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [healthInfo, setHealthInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboardData = async (isManual = false) => {
    try {
      if (isManual) setIsRefreshing(true);
      const [statsRes, appsRes, healthRes, custRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/applications'),
        api.get('/health').catch(() => ({ data: { database_status: 'sqlite_dev_fallback', status: 'ok' } })),
        api.get('/customers').catch(() => ({ data: [] }))
      ]);
      setStats(statsRes.data);
      setRecentApplications(appsRes.data.slice(0, 6));
      setHealthInfo(healthRes.data);
      setCustomers(custRes.data || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load executive dashboard telemetry.');
    } finally {
      setLoading(false);
      if (isManual) setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => fetchDashboardData(), 5000);
    return () => clearInterval(interval);
  }, []);

  const customerMap = Object.fromEntries(customers.map(c => [c.customer_id, c.name]));

  const statCards = [
    { 
      label: 'Total Registered Customers', 
      value: stats?.total_customers ?? 0, 
      icon: Users, 
      color: 'text-indigo-400', 
      bg: 'from-indigo-600/15 via-indigo-600/5 to-transparent',
      borderColor: 'border-indigo-500/20'
    },
    { 
      label: 'Pending In Review', 
      value: stats?.pending_applications ?? 0, 
      icon: Clock, 
      color: 'text-amber-400', 
      bg: 'from-amber-600/15 via-amber-600/5 to-transparent',
      borderColor: 'border-amber-500/20'
    },
    { 
      label: 'Approved Applications', 
      value: stats?.approved_loans ?? 0, 
      icon: CheckCircle2, 
      color: 'text-emerald-400', 
      bg: 'from-emerald-600/15 via-emerald-600/5 to-transparent',
      borderColor: 'border-emerald-500/20'
    },
    { 
      label: 'Rejected Applications', 
      value: stats?.rejected_loans ?? 0, 
      icon: XCircle, 
      color: 'text-rose-400', 
      bg: 'from-rose-600/15 via-rose-600/5 to-transparent',
      borderColor: 'border-rose-500/20'
    },
    { 
      label: "Today's Inbound Stream", 
      value: stats?.todays_applications ?? 0, 
      icon: Calendar, 
      color: 'text-cyan-400', 
      bg: 'from-cyan-600/15 via-cyan-600/5 to-transparent',
      borderColor: 'border-cyan-500/20'
    },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 text-[11px] px-2.5 py-1 rounded-full font-bold whitespace-nowrap inline-block">Approved</span>;
      case 'REJECTED':
        return <span className="bg-rose-950/80 text-rose-300 border border-rose-700/60 text-[11px] px-2.5 py-1 rounded-full font-bold whitespace-nowrap inline-block">Rejected</span>;
      case 'UNDER_REVIEW':
        return <span className="bg-amber-950/80 text-amber-300 border border-amber-700/60 text-[11px] px-2.5 py-1 rounded-full font-bold whitespace-nowrap inline-block">Under Review</span>;
      case 'VERIFICATION_REQUIRED':
        return <span className="bg-purple-950/80 text-purple-300 border border-purple-700/60 text-[11px] px-2.5 py-1 rounded-full font-bold whitespace-nowrap inline-block">Verification Needed</span>;
      default:
        return <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[11px] px-2.5 py-1 rounded-full font-bold whitespace-nowrap inline-block">Submitted</span>;
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-80 space-y-4">
        <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-400">Connecting to Bank B Core Banking Telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner with Quick Actions & Live Stream */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Credit Risk Executive Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time loan applications, customer KYC registry, and federated credit telemetry
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <Link
            to="/customers"
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
            <span>New Customer</span>
          </Link>

          <Link
            to="/applications"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 border border-indigo-400/30 text-xs font-semibold text-white transition-all shadow-md shadow-indigo-600/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Application</span>
          </Link>

          <div className="inline-flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-900/80 border border-white/[0.08] text-xs font-semibold text-slate-300 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="hidden sm:inline">5s Sync</span>
          </div>

          <button
            onClick={() => fetchDashboardData(true)}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/[0.08] text-slate-400 hover:text-white transition-all cursor-pointer shadow-sm"
            title="Refresh dashboard data"
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

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={idx} 
              className={`glass-card glass-card-hover p-5 rounded-2xl border ${card.borderColor} bg-gradient-to-b ${card.bg} flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 tracking-wide">{card.label}</span>
                <div className={`p-2 rounded-xl bg-slate-950/80 border border-white/[0.05] ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-extrabold text-white tracking-tight">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Recent Applications & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Inbound Loan Applications */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-indigo-600/10 text-indigo-400 rounded-xl border border-indigo-500/20">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">Recent Loan Applications</h2>
            </div>

            <Link 
              to="/applications" 
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
            >
              <span>View All Applications</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden shadow-xl">
            {recentApplications.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <FileText className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
                <p className="text-sm font-semibold text-slate-300">No Applications In Queue</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">Incoming loan requests from Customer Portal or Officer submissions will automatically appear here.</p>
                <Link
                  to="/applications"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Initiate First Loan</span>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-slate-400 text-[11px] font-bold uppercase tracking-wider bg-slate-950/60">
                      <th className="py-3 px-4">Application ID</th>
                      <th className="py-3 px-4">Applicant Customer</th>
                      <th className="py-3 px-4">Requested Loan</th>
                      <th className="py-3 px-4">Purpose</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {recentApplications.map((app) => (
                      <tr key={app.application_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-400 text-xs">
                          {app.application_id}
                        </td>
                        <td className="py-3.5 px-4">
                          <Link 
                            to={`/customers/${app.customer_id}`}
                            className="block transition-colors group"
                          >
                            <span className="font-semibold text-slate-100 block text-xs group-hover:text-indigo-400">
                              {customerMap[app.customer_id] || 'Customer'}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500">
                              {app.customer_id}
                            </span>
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-100 text-xs">
                          ₹{(app.loan_amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-400">
                          <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-medium capitalize">
                            {(app.loan_purpose || 'PERSONAL').toLowerCase().replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getStatusBadge(app.status)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            to={`/applications/${app.application_id}`}
                            className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-indigo-600 px-2.5 py-1.5 rounded-lg border border-white/[0.08] transition-all"
                          >
                            <span>Review</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: System Telemetry & Architecture Status */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-600/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Activity className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">Node Operations & Privacy</h2>
          </div>

          <div className="glass-panel rounded-2xl p-6 border border-white/[0.08] space-y-5 shadow-xl">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between text-xs pb-3 border-b border-white/[0.05]">
                <span className="text-slate-400">Heartbeat Sync</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                  25s Active
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pb-3 border-b border-white/[0.05]">
                <span className="text-slate-400">Database Layer</span>
                <span className="font-mono text-cyan-300 text-[11px] uppercase">
                  {healthInfo?.database_status === 'postgres_active' ? 'PostgreSQL (Active)' : 'SQLite Fallback'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pb-3 border-b border-white/[0.05]">
                <span className="text-slate-400">Head Office Registry</span>
                <span className="font-mono text-slate-200 text-[11px]">100.127.141.31:8000</span>
              </div>

              <div className="flex items-center justify-between text-xs pb-3 border-b border-white/[0.05]">
                <span className="text-slate-400">Bank B Local Tailscale</span>
                <span className="font-mono text-emerald-400 text-[11px]">100.123.40.4:8002</span>
              </div>

              <div className="flex items-center justify-between text-xs pb-3 border-b border-white/[0.05]">
                <span className="text-slate-400">Fraud Identification</span>
                <span className="text-slate-200 text-[11px] font-mono">HMAC-SHA256 (64-char)</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Local ML Architecture</span>
                <span className="text-indigo-400 text-[11px] font-semibold">17-F Logistic Regression</span>
              </div>
            </div>

            <div className="pt-2">
              <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs space-y-1">
                <span className="font-bold text-indigo-300 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Privacy Isolation Guarantee</span>
                </span>
                <p className="text-slate-400 text-[11px]">
                  Customer PII and financial records remain strictly within Bank B local storage. Only weights and scalars leave the node.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
