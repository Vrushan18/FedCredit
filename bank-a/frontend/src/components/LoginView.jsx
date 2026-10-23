import React, { useState } from 'react';
import { Shield, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../api';

export default function LoginView({ onLoginSuccess }) {
  const [username, setUsername] = useState('officer');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      const data = await api.login(username, password);
      onLoginSuccess(data.employee);
    } catch (err) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 p-8 text-white text-center space-y-2">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto border border-white/20 shadow-inner">
            <span className="font-extrabold text-2xl tracking-wider">A</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">HDFC Retail Bank</h1>
          <p className="text-blue-100 text-xs">Bank A • Branch Employee Portal</p>
        </div>

        {/* Login Form */}
        <div className="p-8 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-base font-bold text-slate-900">Sign in to Local Node</h2>
            <p className="text-xs text-slate-500">
              Access localized credit applications and privacy-preserving AI models
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1.5 uppercase text-[10px] tracking-wider">
                Staff Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
                  placeholder="Enter username"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1.5 uppercase text-[10px] tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none transition"
                  placeholder="Enter password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center space-x-2 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Access Employee Dashboard</span>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Fill */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Demo Staff Login:</span>
            <button
              onClick={() => {
                setUsername('officer');
                setPassword('password123');
              }}
              className="font-mono text-blue-600 hover:underline font-semibold"
            >
              officer / password123
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
