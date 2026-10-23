import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBankNetwork } from '../context/BankNetworkContext';
import {
  ShieldCheck,
  Lock,
  Cpu,
  Layers,
  ArrowRight,
  Landmark,
  CheckCircle,
  FileCheck2,
  Clock,
  Sparkles,
  Users,
  ChevronRight,
} from 'lucide-react';

export const Home: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { banks, isHeadOfficeOnline } = useBankNetwork();

  return (
    <div className="space-y-20 pb-20">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 text-white pt-16 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.2),transparent_50%)]" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Hero Text */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center space-x-2 bg-blue-500/10 border border-blue-400/30 px-3 py-1.5 rounded-full text-xs font-semibold text-blue-300">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>Next-Generation Privacy-Preserving Banking</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15]">
                Smart Credit Approval. <br />
                <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
                  Zero Privacy Compromise.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                Apply for personal and commercial loans directly with our partner bank network. 
                Powered by decentralized <strong>Federated Learning</strong>, your confidential financial and biometric data never leaves your chosen bank branch.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 pt-2">
                <Link
                  to={isAuthenticated ? '/apply' : '/register'}
                  className="inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/30 transition transform hover:-translate-y-0.5"
                >
                  <span>Apply for Loan</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/services"
                  className="inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold transition"
                >
                  <span>Explore Loan Products & EMI</span>
                </Link>
              </div>

              {/* Live Network Trust Pill */}
              <div className="pt-4 flex items-center space-x-6 text-xs text-slate-400 border-t border-slate-800/80">
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isHeadOfficeOnline ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span>
                    Head Office {isHeadOfficeOnline ? 'Connected' : 'Syncing'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Landmark className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    {banks.length > 0 ? `${banks.length} Partner Banks Available` : 'Dual-Bank Mesh Ready'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Lock className="w-3.5 h-3.5 text-purple-400" />
                  <span>HMAC-SHA256 Protected Biometrics</span>
                </div>
              </div>
            </div>

            {/* Right Card / Interactive Preview */}
            <div className="lg:col-span-5">
              <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-6 shadow-2xl relative">
                <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    FedCredit Distributed Core v1.0
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  {/* Step visual */}
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 flex items-start space-x-3">
                    <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 shrink-0">
                      <FileCheck2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">1. Direct Bank Routing</div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Choose Bank A (Retail) or Bank B (Co-op). KYC & documents go strictly to their branch port.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 flex items-start space-x-3">
                    <div className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 shrink-0">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">2. Local Machine Learning Evaluation</div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Credit risk predicted on-premise using 17 verified features and explainable factors.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 flex items-start space-x-3">
                    <div className="p-2 rounded-lg bg-purple-600/20 text-purple-400 shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">3. Zero-Knowledge Cross-Bank Fraud Defense</div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Fingerprint hashed into anonymous 64-char token. Multi-bank fraud detected without revealing identity.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Ready to start?</span>
                  <Link to="/about" className="text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1">
                    <span>Learn how privacy works</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Privacy Architecture Diagram */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-xs uppercase font-bold tracking-widest text-blue-600 mb-2">
            Architectural Innovation
          </h2>
          <h3 className="text-3xl font-extrabold text-slate-900">
            Why Federated Learning Protects Your Privacy
          </h3>
          <p className="text-slate-600 text-sm mt-3 leading-relaxed">
            Unlike legacy centralized banking where customer databases are pooled on a single vulnerable cloud server, FedCredit utilizes local edge intelligence and Flower FedAvg weight aggregation.
          </p>
        </div>

        {/* Visual Architecture Comparison Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Legacy Centralized Card (Red warning) */}
          <div className="p-8 rounded-3xl bg-rose-50/50 border border-rose-200">
            <div className="flex items-center space-x-2 text-rose-600 text-xs font-bold uppercase tracking-wider mb-3">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Traditional Centralized Banking (High Risk)</span>
            </div>
            <h4 className="text-xl font-bold text-slate-900 mb-3">
              All Customer Data Transferred to One Cloud
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Banks export raw financial statements, PAN, Aadhaar, salary records, and biometric data to a centralized third-party server for model training. A single breach compromises all participating institutions.
            </p>
            <div className="space-y-3 font-mono text-xs bg-white p-4 rounded-2xl border border-rose-200">
              <div className="flex items-center text-rose-700">
                <span className="w-5">✕</span>
                <span>Customer Data leaves local branch</span>
              </div>
              <div className="flex items-center text-rose-700">
                <span className="w-5">✕</span>
                <span>Raw Biometrics & Financials stored centrally</span>
              </div>
              <div className="flex items-center text-rose-700">
                <span className="w-5">✕</span>
                <span>Violation of strict banking data residency policies</span>
              </div>
            </div>
          </div>

          {/* FedCredit Federated Card (Green/Blue success) */}
          <div className="p-8 rounded-3xl bg-emerald-50/50 border border-emerald-200 relative overflow-hidden">
            <div className="flex items-center space-x-2 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>FedCredit Federated Architecture (Privacy Preserved)</span>
            </div>
            <h4 className="text-xl font-bold text-slate-900 mb-3">
              Data Stays at the Bank — Only Model Weights Move
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Bank A and Bank B independently train models inside their private perimeter. Only mathematical weight gradients are shared with the Flower coordinator for FedAvg consensus.
            </p>
            <div className="space-y-3 font-mono text-xs bg-white p-4 rounded-2xl border border-emerald-200">
              <div className="flex items-center text-emerald-700">
                <span className="w-5">✓</span>
                <span>Zero raw customer data shared across banks</span>
              </div>
              <div className="flex items-center text-emerald-700">
                <span className="w-5">✓</span>
                <span>HMAC-SHA256 protected biometric token registry</span>
              </div>
              <div className="flex items-center text-emerald-700">
                <span className="w-5">✓</span>
                <span>Human officer retains final loan decision control</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Product Offerings */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
          <div>
            <h2 className="text-xs uppercase font-bold tracking-widest text-blue-600 mb-1">
              Loan Products
            </h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Tailored Financing for Every Life Milestone
            </h3>
          </div>
          <Link
            to="/services"
            className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1 mt-2 md:mt-0"
          >
            <span>View all products & calculators</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 bank-card-shadow bank-card-shadow-hover transition">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-4">
              <Landmark className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-lg">Personal Loans</h4>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Quick liquidity for emergency medical needs, travel, or debt consolidation with competitive fixed interest rates.
            </p>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Up to ₹15,00,000</span>
              <Link to="/apply" className="font-semibold text-blue-600 hover:underline">
                Apply Now →
              </Link>
            </div>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 bank-card-shadow bank-card-shadow-hover transition">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-4">
              <Cpu className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-lg">Education & Venture</h4>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Empowering students and entrepreneurial ventures with customized moratorium periods and flexible repayment plans.
            </p>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Up to ₹50,00,000</span>
              <Link to="/apply" className="font-semibold text-blue-600 hover:underline">
                Apply Now →
              </Link>
            </div>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 bank-card-shadow bank-card-shadow-hover transition">
            <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold mb-4">
              <Layers className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900 text-lg">Home Improvement</h4>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Finance home renovations, structural expansions, or clean energy solar upgrades with streamlined verification.
            </p>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Up to ₹25,00,000</span>
              <Link to="/apply" className="font-semibold text-blue-600 hover:underline">
                Apply Now →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Real-time Bank Partner Directory */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="max-w-2xl mb-8">
              <h3 className="text-2xl sm:text-3xl font-extrabold">
                Participating Bank Nodes in the Tailnet Mesh
              </h3>
              <p className="text-slate-400 text-xs sm:text-sm mt-2">
                As a customer, you choose which partner bank receives your full application. All nodes are connected over our encrypted Tailscale network.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {banks.length > 0 ? (
                banks.map((b) => (
                  <div
                    key={b.bank_id}
                    className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white text-sm">{b.name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{b.bank_id}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-1">{b.api_base_url}</div>
                    </div>
                    <div>
                      {b.online ? (
                        <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Online</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          <span className="w-2 h-2 rounded-full bg-rose-400" />
                          <span>Offline</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">Bank A — HDFC Retail Bank Node</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">BANK_A</div>
                      <div className="text-[11px] text-slate-500 mt-1">Gopal's Branch Node (:8001)</div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Configured
                    </span>
                  </div>
                  <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">Bank B — State Co-op Bank Node</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">BANK_B</div>
                      <div className="text-[11px] text-slate-500 mt-1">Nidhi's Branch Node (:8002)</div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Configured
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Call To Action Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-10 rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white text-center sm:text-left flex flex-col sm:flex-row items-center justify-between shadow-xl shadow-blue-900/20">
          <div className="max-w-xl mb-6 sm:mb-0">
            <h3 className="text-2xl sm:text-3xl font-extrabold">Ready to secure your loan?</h3>
            <p className="text-blue-100 text-xs sm:text-sm mt-2">
              Registration takes less than 2 minutes. Complete your digital KYC and track your application status in real-time.
            </p>
          </div>
          <Link
            to={isAuthenticated ? '/apply' : '/register'}
            className="px-8 py-4 rounded-xl bg-white text-blue-900 hover:bg-blue-50 font-bold text-sm shadow-md transition transform hover:-translate-y-0.5 shrink-0"
          >
            Start Digital Application
          </Link>
        </div>
      </section>
    </div>
  );
};
