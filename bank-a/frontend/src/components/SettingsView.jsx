import React, { useState } from 'react';
import { Settings, Shield, Radio, Server, CheckCircle2, XCircle, Key } from 'lucide-react';
import { api } from '../api';

export default function SettingsView({ health, onRefreshHealth }) {
  const [testing, setTesting] = useState(false);
  const [pingResult, setPingResult] = useState(null);

  async function handleTestHealth() {
    try {
      setTesting(true);
      const res = await api.getHealth();
      setPingResult({ success: true, data: res });
      onRefreshHealth();
    } catch (err) {
      setPingResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Bank A Node Configuration</h1>
        <p className="text-xs text-slate-500">
          Environment variables and encrypted mesh parameters (read from .env)
        </p>
      </div>

      {/* Connectivity & Node Status Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
            <Radio className="w-4 h-4 text-emerald-600" />
            <span>Local Node Health</span>
          </div>
          <button
            onClick={handleTestHealth}
            disabled={testing}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium px-3 py-1.5 rounded-lg transition disabled:opacity-50"
          >
            {testing ? 'Testing...' : 'Test Local API Health'}
          </button>
        </div>

        {pingResult && (
          <div className={`p-3 rounded-xl text-xs ${
            pingResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {pingResult.success ? (
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>API Node Healthy • Bank ID: {pingResult.data.bank_id} • Status: {pingResult.data.status}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Health check failed: {pingResult.error}</span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg space-y-1">
            <span className="text-slate-400 block text-[10px]">BANK NODE IDENTIFIER</span>
            <span className="font-mono font-bold text-slate-800">BANK_A (HDFC Retail Bank)</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg space-y-1">
            <span className="text-slate-400 block text-[10px]">LOCAL FASTAPI PORT</span>
            <span className="font-mono font-bold text-emerald-700">8001 (Inbound & Employee)</span>
          </div>
        </div>
      </div>

      {/* Network & Tailscale Specifications */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
          <Server className="w-4 h-4 text-blue-600" />
          <span>Head Office Mesh Endpoints (Tailnet)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg space-y-1">
            <span className="text-slate-400 block text-[10px]">HEAD OFFICE REST API</span>
            <span className="font-mono text-slate-800">http://$SERVER_IP:8000/api/v1</span>
            <p className="text-[10px] text-slate-400">Heartbeats, Fraud Check, Status Pushes</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg space-y-1">
            <span className="text-slate-400 block text-[10px]">FLOWER FL SERVER</span>
            <span className="font-mono text-slate-800">$SERVER_IP:8080 (gRPC)</span>
            <p className="text-[10px] text-slate-400">FedAvg federated rounds aggregation</p>
          </div>
        </div>
      </div>

      {/* Security & Cryptographic Keys Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
          <Key className="w-4 h-4 text-amber-600" />
          <span>Cryptographic Keys & Privacy Controls</span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-800 block">Bank-to-Head-Office API Key</span>
              <span className="text-[10px] text-slate-400 font-mono">X-API-Key header validated via SHA-256</span>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
              Configured
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-800 block">Shared Fraud Secret (FRAUD_SECRET)</span>
              <span className="text-[10px] text-slate-400 font-mono">HMAC-SHA256 fingerprint hashing (Never given to Head Office)</span>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
              Protected
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
            <div>
              <span className="font-semibold text-slate-800 block">Customer JWT Secret</span>
              <span className="text-[10px] text-slate-400 font-mono">HS256 shared token verification for inbound portal applications</span>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
              Validated
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
