import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator,
  HelpCircle,
  CreditCard,
  Building,
  GraduationCap,
  HeartPulse,
  Briefcase,
  Home,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

export const Services: React.FC = () => {
  // EMI Calculator State
  const [loanAmount, setLoanAmount] = useState<number>(500000);
  const [tenureMonths, setTenureMonths] = useState<number>(36);
  const [annualRate, setAnnualRate] = useState<number>(10.5);

  // EMI Formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
  const monthlyRate = annualRate / 12 / 100;
  const emi =
    monthlyRate === 0
      ? loanAmount / tenureMonths
      : (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
        (Math.pow(1 + monthlyRate, tenureMonths) - 1);

  const totalPayment = emi * tenureMonths;
  const totalInterest = totalPayment - loanAmount;

  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);

  // Loan products matching contract enums
  const loanCategories = [
    {
      title: 'Personal Loan',
      enum: 'PERSONAL',
      icon: <CreditCard className="w-5 h-5 text-blue-600" />,
      rate: '10.5% p.a.',
      max: '₹15,00,000',
      desc: 'Immediate liquidity for domestic needs, emergency repairs, or life events without asset collateral.',
    },
    {
      title: 'Education Loan',
      enum: 'EDUCATION',
      icon: <GraduationCap className="w-5 h-5 text-indigo-600" />,
      rate: '8.75% p.a.',
      max: '₹40,00,000',
      desc: 'Competitive educational financing covering tuition, living expenses, and international university fees.',
    },
    {
      title: 'Business Venture Loan',
      enum: 'VENTURE',
      icon: <Briefcase className="w-5 h-5 text-amber-600" />,
      rate: '11.25% p.a.',
      max: '₹50,00,000',
      desc: 'Working capital and seed financing for expanding trade operations and technological ventures.',
    },
    {
      title: 'Medical Assistance Loan',
      enum: 'MEDICAL',
      icon: <HeartPulse className="w-5 h-5 text-rose-600" />,
      rate: '9.5% p.a.',
      max: '₹10,00,000',
      desc: 'Expedited processing for critical care treatments, hospital procedures, and therapeutic equipment.',
    },
    {
      title: 'Debt Consolidation',
      enum: 'DEBT_CONSOLIDATION',
      icon: <Building className="w-5 h-5 text-emerald-600" />,
      rate: '10.0% p.a.',
      max: '₹25,00,000',
      desc: 'Combine multiple credit obligations into a single manageable installment with lower aggregate interest.',
    },
    {
      title: 'Home Improvement',
      enum: 'HOME_IMPROVEMENT',
      icon: <Home className="w-5 h-5 text-cyan-600" />,
      rate: '9.0% p.a.',
      max: '₹30,00,000',
      desc: 'Structural renovations, interior redesigning, and renewable solar installations.',
    },
  ];

  const faqs = [
    {
      q: 'How does FedCredit protect my private financial documents?',
      a: 'When you submit a loan application, your files and financial data are routed directly to the specific bank node you selected (Bank A or Bank B). Your records are never uploaded to a centralized server or shared with other financial institutions.',
    },
    {
      q: 'Why am I asked to upload a fingerprint image?',
      a: 'For demonstration of cross-bank fraud detection, the receiving bank hashes the fingerprint image into a 64-character anonymous string using HMAC-SHA256 and discards the image immediately. The central registry uses this token to detect repeated fraudulent applications across institutions without storing raw biometrics.',
    },
    {
      q: 'How long does the loan evaluation process take?',
      a: 'Once submitted, your application enters the Under Review stage at the partner branch node. Bank loan officers utilize local AI predictions and review your documents to issue a decision: Approved, Rejected, or Manual Verification Required.',
    },
    {
      q: 'Can I apply to both Bank A and Bank B?',
      a: 'You can choose whichever partner institution suits your needs best. However, multiple simultaneous loan requests across partner banks will be detected by our privacy-preserving fraud alerting engine.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto">
        <span className="text-xs uppercase font-bold tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
          Financing Solutions
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-4">
          Loan Products & Smart Financial Tools
        </h1>
        <p className="text-slate-600 text-sm sm:text-base mt-3">
          Explore transparent loan products across our federated partner network and calculate your estimated monthly installments.
        </p>
      </div>

      {/* 1. Interactive EMI Calculator */}
      <section className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 bank-card-shadow">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Digital Loan EMI Calculator</h2>
            <p className="text-xs text-slate-500">Plan your finances with instant interest calculations</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Controls */}
          <div className="lg:col-span-7 space-y-6">
            {/* Amount Slider */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-2">
                <span>Loan Amount</span>
                <span className="text-sm font-bold text-blue-700">{formatINR(loanAmount)}</span>
              </div>
              <input
                type="range"
                min="50000"
                max="5000000"
                step="25000"
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>₹50,000</span>
                <span>₹50,00,000</span>
              </div>
            </div>

            {/* Tenure Slider */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-2">
                <span>Loan Duration (Tenure)</span>
                <span className="text-sm font-bold text-blue-700">{tenureMonths} Months ({Math.round(tenureMonths / 12 * 10) / 10} yrs)</span>
              </div>
              <input
                type="range"
                min="6"
                max="120"
                step="6"
                value={tenureMonths}
                onChange={(e) => setTenureMonths(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>6 Months</span>
                <span>120 Months</span>
              </div>
            </div>

            {/* Interest Rate Slider */}
            <div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700 mb-2">
                <span>Indicative Interest Rate (% p.a.)</span>
                <span className="text-sm font-bold text-blue-700">{annualRate}%</span>
              </div>
              <input
                type="range"
                min="7.0"
                max="24.0"
                step="0.25"
                value={annualRate}
                onChange={(e) => setAnnualRate(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                <span>7.0%</span>
                <span>24.0%</span>
              </div>
            </div>
          </div>

          {/* Result Card */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl p-6 shadow-xl space-y-6">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 block">
                Estimated Monthly Installment (EMI)
              </span>
              <div className="text-3xl font-extrabold text-white mt-1">
                {formatINR(emi)}
                <span className="text-xs font-normal text-slate-400"> / month</span>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Principal Loan Amount:</span>
                <span className="font-semibold">{formatINR(loanAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Interest Payable:</span>
                <span className="font-semibold text-amber-300">{formatINR(totalInterest)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 font-bold text-sm">
                <span>Total Repayment:</span>
                <span className="text-emerald-400">{formatINR(totalPayment)}</span>
              </div>
            </div>

            <Link
              to="/apply"
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition shadow-md"
            >
              <span>Apply for {formatINR(loanAmount)} Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Loan Categories Grid */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xs uppercase font-bold tracking-widest text-blue-600">
            Portfolio
          </h2>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">
            Available Credit Facilities
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loanCategories.map((prod) => (
            <div
              key={prod.enum}
              className="bg-white rounded-2xl border border-slate-200 p-6 bank-card-shadow bank-card-shadow-hover transition space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    {prod.icon}
                  </div>
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                    {prod.rate}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 text-base">{prod.title}</h4>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{prod.desc}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Maximum Limit</span>
                  <span className="font-bold text-slate-800">{prod.max}</span>
                </div>
                <Link
                  to="/apply"
                  className="font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                >
                  <span>Apply</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Comprehensive FAQs */}
      <section className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 bank-card-shadow space-y-6">
        <div className="flex items-center space-x-3 mb-4">
          <HelpCircle className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h2>
        </div>

        <div className="divide-y divide-slate-100">
          {faqs.map((faq, i) => (
            <div key={i} className="py-4">
              <h4 className="font-bold text-slate-900 text-sm">{faq.q}</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
