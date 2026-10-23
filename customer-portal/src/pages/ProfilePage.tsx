import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useBankNetwork } from '../context/BankNetworkContext';
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Server,
  LogOut,
  Landmark,
  KeyRound,
} from 'lucide-react';
import { HEAD_OFFICE_BASE_URL } from '../services/api';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const { isHeadOfficeOnline, banks } = useBankNetwork();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Customer Security Profile</h1>
        <p className="text-xs text-slate-500 mt-1">
          Decentralized credentials, authentication tokens, and network mesh diagnostic status
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="md:col-span-1 bg-white rounded-3xl p-6 border border-slate-200 bank-card-shadow space-y-5 text-center">
          <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-700 font-extrabold text-2xl flex items-center justify-center mx-auto shadow-inner">
            {user?.name ? user.name[0].toUpperCase() : 'C'}
          </div>

          <div>
            <h2 className="font-bold text-lg text-slate-900">{user?.name}</h2>
            <div className="text-xs font-mono text-blue-600 font-bold mt-0.5">
              {user?.customer_id}
            </div>
            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              Active Customer
            </span>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <button
              onClick={logout}
              className="w-full py-2.5 px-4 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs flex items-center justify-center space-x-2 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Portal</span>
            </button>
          </div>
        </div>

        {/* Right Column: Details & Network */}
        <div className="md:col-span-2 space-y-6">
          {/* Identity details */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 bank-card-shadow space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <User className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">Identity Details</h3>
            </div>

            <div className="divide-y text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500 flex items-center space-x-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Full Legal Name</span>
                </span>
                <span className="font-semibold text-slate-900">{user?.name}</span>
              </div>

              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500 flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>Registered Email</span>
                </span>
                <span className="font-semibold text-slate-900">{user?.email || 'N/A'}</span>
              </div>

              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500 flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>Verified Phone</span>
                </span>
                <span className="font-semibold text-slate-900">{user?.phone || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Network and Cryptographic Session */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 bank-card-shadow space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Server className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">Tailnet Architecture Status</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Head Office REST API</span>
                  <span className="text-[10px] font-mono text-slate-500">{HEAD_OFFICE_BASE_URL}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isHeadOfficeOnline
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {isHeadOfficeOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-semibold text-slate-800 block">
                  Active Partner Bank Endpoints ({banks.length})
                </span>
                {banks.map((b) => (
                  <div key={b.bank_id} className="flex justify-between items-center text-[11px] font-mono">
                    <span className="text-slate-600">{b.name} ({b.bank_id})</span>
                    <span className={b.online ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                      {b.online ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/80 text-[11px] text-blue-900 flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Dual-Secret Authentication:</strong> Customer sessions use <code>CUSTOMER_JWT_SECRET</code> issued by Head Office and accepted by Bank nodes without exposing bank employee secrets.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
