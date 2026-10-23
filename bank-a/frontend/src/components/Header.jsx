import React from 'react';
import { Shield, Building2, User, LogOut, Radio, RefreshCw } from 'lucide-react';

export default function Header({ user, onLogout, health, onRefresh }) {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Bank Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-inner font-bold text-xl tracking-wider">
            A
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-slate-100 tracking-tight">HDFC Retail Bank</span>
              <span className="text-xs bg-blue-500/20 text-blue-300 font-semibold px-2 py-0.5 rounded border border-blue-500/30">
                Bank A Node
              </span>
            </div>
            <p className="text-xs text-slate-400">FedCredit Federated Risk & Fraud Intelligence</p>
          </div>
        </div>

        {/* Live Network Indicators */}
        <div className="hidden md:flex items-center space-x-6 text-xs">
          <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-slate-300">Local Port:</span>
            <span className="font-mono font-medium text-emerald-400">8001</span>
          </div>

          <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-300">Tailscale Mesh:</span>
            <span className="font-mono font-medium text-blue-400">Connected</span>
          </div>

          <button 
            onClick={onRefresh}
            title="Refresh Node Data"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* User Profile & Logout */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-right">
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-slate-200 capitalize">{user?.username || 'Officer'}</p>
              <p className="text-xs text-slate-400 font-mono">{user?.role || 'LOAN_OFFICER'}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <User className="w-4 h-4" />
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-rose-800 transition text-xs font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

      </div>
    </header>
  );
}
