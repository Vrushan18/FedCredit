import React, { useState } from 'react';
import { useBankNetwork } from '../context/BankNetworkContext';
import {
  Phone,
  Mail,
  MapPin,
  ShieldAlert,
  Server,
  RefreshCw,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { HEAD_OFFICE_BASE_URL } from '../services/api';

export const Contact: React.FC = () => {
  const { isHeadOfficeOnline, banks, refreshNetwork, isLoading } = useBankNetwork();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto">
        <span className="text-xs uppercase font-bold tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
          Support & Diagnostics
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-4">
          Customer Support & Tailnet Diagnostics
        </h1>
        <p className="text-slate-600 text-sm sm:text-base mt-3">
          Get in touch with customer care or monitor the live private Tailscale connectivity across our 4-node federated banking network.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Contact Cards & Emergency line */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 bank-card-shadow space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Head Office Helpdesk</h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-slate-800 block">Toll-Free Helpline</span>
                  <span className="text-slate-500">1800-FED-CREDIT (Toll Free 24x7)</span>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-slate-800 block">Digital Inquiries</span>
                  <span className="text-slate-500">support@fedcredit-system.internal</span>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-600 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-slate-800 block">Central Administration</span>
                  <span className="text-slate-500">
                    FedCredit Central Regulatory Node, Laptop 1 (Head Office)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Fraud Alert Card */}
          <div className="bg-gradient-to-br from-rose-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-rose-800/50 space-y-3">
            <div className="flex items-center space-x-2 text-rose-300 text-xs font-bold uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              <span>Fraud Reporting Protocol</span>
            </div>
            <h4 className="font-bold text-base">Suspect Identity Compromise?</h4>
            <p className="text-xs text-rose-200 leading-relaxed">
              If you suspect someone is attempting to apply for credit using unauthorized biometric credentials, our cryptographic registry immediately flags matching protected identifiers across all nodes.
            </p>
            <div className="pt-2 text-xs font-mono text-rose-300">
              Hotline: +91 1800-ALERT-FED
            </div>
          </div>

          {/* Tailscale Node Diagnostics Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-sm">Tailnet Connection Diagnostic</h4>
              </div>
              <button
                onClick={refreshNetwork}
                disabled={isLoading}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 flex justify-between items-center">
                <span className="text-slate-400">Target Head Office:</span>
                <span className="text-blue-300 truncate max-w-[200px]">{HEAD_OFFICE_BASE_URL}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 flex justify-between items-center">
                <span className="text-slate-400">Head Office Status:</span>
                <span className={isHeadOfficeOnline ? 'text-emerald-400' : 'text-rose-400'}>
                  {isHeadOfficeOnline ? 'ONLINE (200 OK)' : 'OFFLINE / UNREACHABLE'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 flex justify-between items-center">
                <span className="text-slate-400">Active Bank Nodes:</span>
                <span className="text-purple-300">{banks.length} Nodes</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              For demo connectivity across separate laptops, verify all machines are joined to the Tailscale Tailnet and pinging Vrushan's Tailscale IP.
            </p>
          </div>
        </div>

        {/* Right Column: Support Message Form */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 bank-card-shadow space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Send an Inquiry to Branch Desk</h3>
              <p className="text-xs text-slate-500 mt-1">
                Have questions regarding credit assessment or bank routing? Our team responds within 24 hours.
              </p>
            </div>

            {submitted ? (
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-emerald-900 text-base">Inquiry Dispatched Successfully</h4>
                <p className="text-xs text-emerald-700">
                  Your ticket has been logged with our customer service team. A support representative will follow up via your registered contact details.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Your Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Sharma"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. ramesh@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Clarification regarding loan documentation"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Message</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Provide details about your query..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center space-x-2 transition shadow-md shadow-blue-500/20"
                >
                  <Send className="w-4 h-4" />
                  <span>Transmit Inquiry</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
