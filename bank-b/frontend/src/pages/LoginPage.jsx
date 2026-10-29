import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, Lock, User, AlertCircle, ShieldCheck, KeyRound, Sparkles, ArrowRight } from 'lucide-react';

const LoginPage = () => {
  const [username, setUsername] = useState('admin_b');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid employee username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = () => {
    setUsername('admin_b');
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-[#060813] relative flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Background Decorative Ambient Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-indigo-500/[0.04] rounded-full blur-[160px] pointer-events-none"></div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0a_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

      <div className="w-full max-w-lg relative z-10">
        {/* Top Floating Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-700/60 shadow-lg backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">Node Active • Port 8002</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="glass-panel rounded-3xl p-8 sm:p-10 shadow-2xl relative border border-white/[0.09]">
          {/* Bank Crest & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-indigo-600/10 to-transparent border border-indigo-500/30 shadow-inner mb-4 glow-indigo">
              <Building2 className="w-10 h-10 text-indigo-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              State Co-op Bank
            </h1>
            <p className="text-xs sm:text-sm text-indigo-300 font-medium mt-1">
              Bank B • Privacy-Preserving Core Banking Node
            </p>
            <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto">
              Secure employee authentication for credit risk assessment, loan approvals, and federated model telemetry.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 bg-rose-950/70 border border-rose-800 text-rose-200 px-4 py-3 rounded-2xl flex items-start space-x-3 text-sm animate-shake">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Employee Officer Username
              </label>
              <div className="relative group">
                <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5 transition-colors group-focus-within:text-indigo-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-2xl pl-11 pr-4 py-3.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm transition-all shadow-inner"
                  placeholder="e.g. admin_b"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleQuickFill}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Autofill Demo</span>
                </button>
              </div>
              <div className="relative group">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5 transition-colors group-focus-within:text-indigo-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-2xl pl-11 pr-4 py-3.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm transition-all shadow-inner"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 text-white font-semibold py-3.5 px-5 rounded-2xl shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/40 transition-all text-sm flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Credit Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Privacy & Security Features Pills */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-[11px]">
            <div className="flex items-center space-x-2 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Zero PII Network Egress</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-400">
              <KeyRound className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>HMAC Biometric Hashing</span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-slate-500 mt-6">
          FedCredit Privacy-Preserving System • State Co-op Bank Ltd.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
