import React from 'react';
import { useBankNetwork } from '../../context/BankNetworkContext';
import { Landmark, RefreshCw, CheckCircle, XCircle, ShieldAlert } from 'lucide-react';

export const BankStatusWidget: React.FC = () => {
  const { banks, isHeadOfficeOnline, isLoading, lastChecked, refreshNetwork, error } =
    useBankNetwork();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 bank-card-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Landmark className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-900 text-sm">Partner Bank Network</h3>
        </div>
        <button
          onClick={refreshNetwork}
          disabled={isLoading}
          className="text-xs text-slate-500 hover:text-blue-600 flex items-center space-x-1 p-1 rounded hover:bg-slate-100 transition"
          title="Refresh network status"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {error && (
        <div className="mb-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Head Office Node Status */}
      <div className="mb-3 p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-800">Head Office Coordinator</div>
          <div className="text-[10px] text-slate-500">Flower Server & Central Registry</div>
        </div>
        <div className="flex items-center space-x-1.5 text-xs font-medium">
          {isHeadOfficeOnline === true ? (
            <>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-700">Online</span>
            </>
          ) : isHeadOfficeOnline === false ? (
            <>
              <XCircle className="w-4 h-4 text-rose-500" />
              <span className="text-rose-700">Offline</span>
            </>
          ) : (
            <span className="text-slate-400">Checking...</span>
          )}
        </div>
      </div>

      {/* Dynamic Bank Nodes from GET /banks */}
      <div className="space-y-2">
        {banks.length === 0 ? (
          <div className="p-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
            {isHeadOfficeOnline
              ? 'No partner bank nodes registered yet.'
              : 'Waiting for Head Office connection to load partner banks...'}
          </div>
        ) : (
          banks.map((bank) => (
            <div
              key={bank.bank_id}
              className={`p-3 rounded-xl border transition flex items-center justify-between ${
                bank.online
                  ? 'bg-slate-50 border-slate-200/80 hover:border-blue-300'
                  : 'bg-rose-50/50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-xs text-slate-900 truncate">
                    {bank.name}
                  </span>
                  <span className="px-1.5 py-0.2 text-[10px] font-mono bg-slate-200 text-slate-700 rounded">
                    {bank.bank_id}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                  {bank.api_base_url}
                </div>
              </div>

              <div className="shrink-0 flex items-center space-x-1 text-xs font-medium">
                {bank.online ? (
                  <span className="inline-flex items-center space-x-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Online</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full text-[11px] border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>Offline</span>
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {lastChecked && (
        <div className="mt-3 text-[10px] text-slate-400 text-right">
          Last polled: {lastChecked.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};
