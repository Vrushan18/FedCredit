import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Cpu, Server, ExternalLink, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-sm">
      {/* Privacy Architecture Trust Banner */}
      <div className="border-b border-slate-800 bg-slate-950/50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 rounded-lg bg-blue-900/40 text-blue-400 shrink-0 border border-blue-800/60">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">Zero Data Centralization</h4>
              <p className="text-xs text-slate-400 mt-1">
                Your private financial records, salary slips, and KYC data never leave your chosen bank. Head Office only coordinates global intelligence.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="p-2.5 rounded-lg bg-emerald-900/40 text-emerald-400 shrink-0 border border-emerald-800/60">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">Federated Learning Core</h4>
              <p className="text-xs text-slate-400 mt-1">
                Risk models train collaboratively across banks using FedAvg weight aggregation without pooling raw customer datasets.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="p-2.5 rounded-lg bg-purple-900/40 text-purple-400 shrink-0 border border-purple-800/60">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm">Protected Biometric Verification</h4>
              <p className="text-xs text-slate-400 mt-1">
                Cross-bank fraud protection operates through cryptographic protected identifiers. Raw biometrics are discarded immediately after processing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                FedCredit<span className="text-blue-500">.</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              Decentralized multi-bank credit evaluation and fraud alert ecosystem engineered with federated machine learning.
            </p>
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tailnet Private Mesh Secured</span>
            </div>
          </div>

          {/* Customer Banking Services */}
          <div>
            <h5 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Customer Services</h5>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/apply" className="hover:text-white transition">Apply for Personal Loan</Link>
              </li>
              <li>
                <Link to="/apply" className="hover:text-white transition">Education & Venture Loans</Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-white transition">Interactive EMI Calculator</Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-white transition">Loan Eligibility Guidelines</Link>
              </li>
            </ul>
          </div>

          {/* Architecture & Tech */}
          <div>
            <h5 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Architecture</h5>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/about" className="hover:text-white transition">Federated Learning Overview</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition">Privacy-Preserving Fraud Registry</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition">Explainable AI (SHAP Framework)</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition">Network Node Status</Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h5 className="text-white font-semibold text-xs uppercase tracking-wider mb-3">Security & Compliance</h5>
            <ul className="space-y-2 text-xs">
              <li className="text-slate-400">Zero Customer Data Pooling</li>
              <li className="text-slate-400">Dual-Secret JWT Authorization</li>
              <li className="text-slate-400">Statutory KYC Verification</li>
              <li>
                <Link to="/contact" className="text-blue-400 hover:text-blue-300 transition">
                  Report Suspicious Incident →
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Disclaimer */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
          <p>
            © {new Date().getFullYear()} FedCredit Federated Banking System. Developed by Aditya Tambe (Customer Portal UI/UX Lead).
          </p>
          <p className="mt-2 md:mt-0 flex items-center space-x-1">
            <span>Engineering Partner of Vrushan (Head Office), Gopal (Bank A), & Nidhi (Bank B)</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
