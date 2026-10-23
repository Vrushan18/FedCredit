import React from 'react';
import {
  ShieldCheck,
  Lock,
  Cpu,
  Layers,
  Server,
  FileText,
  UserCheck,
  Fingerprint,
  Code2,
  CheckCircle2,
} from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto">
        <span className="text-xs uppercase font-bold tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
          Under the Hood
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-4">
          Privacy-Preserving Federated Architecture
        </h1>
        <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
          How modern fintech enables collaborative machine learning across independent banking institutions without compromising customer data sovereignty or regulatory compliance.
        </p>
      </div>

      {/* 1. The Core Banking Privacy Challenge */}
      <section className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 bank-card-shadow">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">
              The Fundamental Privacy Paradox in Credit Underwriting
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              To accurately estimate credit default probability, machine learning models require large, diverse financial datasets. However, commercial banks are bound by strict statutory regulations (such as Reserve Bank of India data localization norms and GDPR privacy principles).
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Institutions cannot legally share or pool customer databases with one another. When each bank trains models exclusively on its own limited customer pool, predictions are skewed and vulnerable to blind spots.
            </p>
            <div className="pt-2 flex items-center space-x-2 text-xs font-semibold text-blue-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>FedCredit resolves this paradox through Federated Learning.</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-xs space-y-4">
            <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
              Regulatory & Architectural Tenets
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block">1. Local Data Residency</span>
                <span className="text-slate-500 text-[11px] mt-0.5 block">
                  All customer KYC data, salary statements, and employment records remain exclusively inside the respective bank's storage.
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block">2. Mathematical Weight Exchange</span>
                <span className="text-slate-500 text-[11px] mt-0.5 block">
                  Only anonymized 17-feature model weights (coefficients and intercepts) traverse the network to the central coordinator.
                </span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block">3. Cryptographic Protected Identifiers</span>
                <span className="text-slate-500 text-[11px] mt-0.5 block">
                  Biometrics are converted into 64-character irreversibly hashed tokens for cross-bank fraud checks, then immediately deleted.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Federated Learning with Flower (FL) & FedAvg */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xs uppercase font-bold tracking-widest text-blue-600">
            Machine Learning Engine
          </h2>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">
            Distributed Training via Federated Averaging (FedAvg)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 bank-card-shadow">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">Local Model Training</h4>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Bank A (HDFC Retail) and Bank B (State Co-op) run local Flower NumPyClients on their partitioned datasets using a standardized 17-feature scikit-learn Logistic Regression pipeline.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 bank-card-shadow">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <Server className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">Central Flower Coordinator</h4>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              The Head Office Flower server aggregates model weights from connected bank nodes using weighted FedAvg, where weights are proportional to training sample count.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 bank-card-shadow">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">Global Model Deployment</h4>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              After each training round, the updated global model is pushed back to all branch nodes, giving every bank high-accuracy credit risk prediction without sharing data.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Fraud Registry & Biometric Protection */}
      <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 relative overflow-hidden">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs font-semibold">
            <Fingerprint className="w-4 h-4" />
            <span>Biometric Privacy Framework</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold">
            Cross-Bank Fraud Alerts Without Centralized Biometrics
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            In standard banking, catching synthetic identity fraudsters who submit simultaneous loan applications across multiple banks requires sharing national IDs or photo repositories. 
            FedCredit solves this through a zero-knowledge protected identifier mechanism:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
              <span className="font-semibold text-white block mb-1">Bank-Local Processing</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                When a customer uploads a fingerprint image, the receiving bank generates an irreversible 64-character hash token using HMAC-SHA256 and discards the image immediately.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
              <span className="font-semibold text-white block mb-1">Central Registry Sighting Log</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                The central fraud registry checks sightings of this protected identifier across multiple banks within 30 days. No names, PAN, or biometrics are ever stored centrally.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Team Integration & Modular Architecture */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xs uppercase font-bold tracking-widest text-blue-600">
            System Implementation
          </h2>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">
            4-Node Autonomous Team Architecture
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 text-xs space-y-2">
            <div className="font-bold text-blue-600 text-sm">Laptop 1: Head Office</div>
            <div className="font-semibold text-slate-800">Vrushan (Tech Lead)</div>
            <p className="text-slate-500 text-[11px]">
              Flower FL Server (:8080), FastAPI backend (:8000), central application index, fraud registry.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 text-xs space-y-2">
            <div className="font-bold text-blue-600 text-sm">Laptop 2: Bank A Node</div>
            <div className="font-semibold text-slate-800">Gopal (HDFC Retail Bank)</div>
            <p className="text-slate-500 text-[11px]">
              FastAPI port :8001, Flower NumPyClient, 17-feature local model training, SHAP explainability.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 text-xs space-y-2">
            <div className="font-bold text-blue-600 text-sm">Laptop 3: Bank B Node</div>
            <div className="font-semibold text-slate-800">Nidhi (State Co-op Bank)</div>
            <p className="text-slate-500 text-[11px]">
              FastAPI port :8002, Flower NumPyClient, skewed co-op dataset training, local officer portal.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-blue-300 ring-2 ring-blue-100 text-xs space-y-2">
            <div className="font-bold text-blue-600 text-sm">Laptop 4: Customer Portal</div>
            <div className="font-semibold text-slate-800">Aditya (UI/UX Lead)</div>
            <p className="text-slate-500 text-[11px]">
              Vite React dev server (:5173), customer authentication, dynamic loan application router, real-time status tracker.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
