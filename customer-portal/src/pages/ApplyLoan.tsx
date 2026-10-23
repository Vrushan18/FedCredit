import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBankNetwork } from '../context/BankNetworkContext';
import {
  createApplicationIntent,
  submitApplicationToBank,
  extractErrorMessage,
} from '../services/api';
import { OfflineWarning } from '../components/common/OfflineWarning';
import { LoanApplicationForm } from '../components/LoanApplicationForm';
import { validateAadhaar, validateCustomerForm } from '../utils/validation';
import { verifyFingerprintImage } from '../utils/biometricCheck';
import confetti from 'canvas-confetti';
import {
  User,
  CreditCard,
  Building,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  FileCheck2,
  Fingerprint,
  FileText,
  Landmark,
  ShieldCheck,
  Send,
  Loader2,
  Sparkles,
  Sliders
} from 'lucide-react';
import type {
  Gender,
  EmploymentType,
  HomeOwnership,
  LoanPurpose,
  LoanApplicationPayload,
} from '../types/contracts';

export const ApplyLoan: React.FC = () => {
  const { user } = useAuth();
  const { banks, refreshNetwork, isLoading: isNetworkLoading } = useBankNetwork();
  const navigate = useNavigate();

  const [formMode, setFormMode] = useState<'interactive' | 'wizard'>('interactive');
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionProgress, setSubmissionProgress] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- Step 1: Applicant KYC ---
  const [fullName, setFullName] = useState<string>(user?.name || '');
  const [pan, setPan] = useState<string>('ABCPE1234F');
  const [aadhaar, setAadhaar] = useState<string>('234567890124');
  const [age, setAge] = useState<number>(30);
  const [gender, setGender] = useState<Gender>('MALE');
  const [phone, setPhone] = useState<string>(user?.phone || '9876543210');
  const [address, setAddress] = useState<string>('24, Commercial Street, Bangalore');
  const [occupation, setOccupation] = useState<string>('Software Systems Engineer');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('SALARIED');

  // --- Step 2: Financial Information ---
  const [annualIncome, setAnnualIncome] = useState<number>(950000);
  const [existingDebt, setExistingDebt] = useState<number>(120000);
  const [creditScore, setCreditScore] = useState<number>(740);
  const [homeOwnership, setHomeOwnership] = useState<HomeOwnership>('RENT');
  const [employmentLengthYears, setEmploymentLengthYears] = useState<number>(5);
  const [creditHistoryLengthYears, setCreditHistoryLengthYears] = useState<number>(7);
  const [previousDefault, setPreviousDefault] = useState<boolean>(false);

  // --- Step 3: Loan Requirement ---
  const [loanAmount, setLoanAmount] = useState<number>(500000);
  const [durationMonths, setDurationMonths] = useState<number>(36);
  const [loanPurpose, setLoanPurpose] = useState<LoanPurpose>('PERSONAL');

  // --- Step 4: Bank Selection ---
  const [selectedBankId, setSelectedBankId] = useState<string>('BANK_A');

  // Auto-select first online bank when bank nodes update
  React.useEffect(() => {
    if (banks.length > 0) {
      const current = banks.find((b) => b.bank_id === selectedBankId);
      if (!current || !current.online) {
        const firstOnline = banks.find((b) => b.online);
        if (firstOnline) {
          setSelectedBankId(firstOnline.bank_id);
        }
      }
    }
  }, [banks, selectedBankId]);

  // --- Step 5: Document & Fingerprint Upload ---
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [fingerprintFile, setFingerprintFile] = useState<File | null>(null);
  const [fingerprintUploaded, setFingerprintUploaded] = useState<boolean>(false);

  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);

  const selectedBank = banks.find((b) => b.bank_id === selectedBankId);

  const [biometricFeedback, setBiometricFeedback] = useState<{
    valid: boolean;
    stdDev?: string;
    dimensions?: string;
    error?: string | null;
  } | null>(null);

  // Handle fingerprint selection with in-browser canvas ridge variance check
  const handleFingerprintChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFingerprintFile(file);
      const check = await verifyFingerprintImage(file);
      setBiometricFeedback(check);
      if (check.valid) {
        setFingerprintUploaded(true);
        setErrorMessage(null);
      } else {
        setFingerprintUploaded(false);
        setErrorMessage(`Biometric verification failed: ${check.error}`);
      }
    }
  };

  // Handle documents selection
  const handleDocumentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setDocumentFiles((prev) => [...prev, ...filesArray]);
    }
  };

  // Final Submission Handler strictly following Section 9 of Contract
  const handleFinalSubmit = async () => {
    setErrorMessage(null);

    // Validation checks
    if (!selectedBank) {
      setErrorMessage('Please select a participating partner bank.');
      return;
    }

    if (!selectedBank.online) {
      setErrorMessage(
        `${selectedBank.name} is currently offline. Please choose an active bank node or try again.`
      );
      return;
    }

    if (!fingerprintFile) {
      setErrorMessage('Biometric fingerprint image is required for fraud registry verification.');
      return;
    }

    if (biometricFeedback && !biometricFeedback.valid) {
      setErrorMessage(`Biometric verification failed: ${biometricFeedback.error}`);
      return;
    }

    // Syntactic & Semantic Form Cross-Check (Verhoeff Aadhaar, PAN 'P', Age Constraints)
    const formCheck = validateCustomerForm({
      name: fullName,
      pan,
      aadhaar,
      phone,
      age,
      annual_income: annualIncome,
      employment_length_years: employmentLengthYears,
      loan_amount: loanAmount,
      credit_history_length_years: creditHistoryLengthYears,
      previous_default: previousDefault ? 1 : 0,
      home_ownership: homeOwnership,
      loan_purpose: loanPurpose,
    });

    if (!formCheck.isValid) {
      const firstErr = Object.values(formCheck.errors)[0] as string;
      setErrorMessage(`Validation error: ${firstErr}`);
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Initiate application intent at Head Office (Section 4)
      setSubmissionProgress('Registering application with Head Office index...');
      const intentResponse = await createApplicationIntent(selectedBankId);
      const generatedAppId = intentResponse.application_id;

      // 2. Prepare Section 3.3 compliant application payload
      setSubmissionProgress(`Submitting full encrypted records to ${selectedBank.name}...`);
      const payload: LoanApplicationPayload = {
        application_id: generatedAppId,
        customer_id: user?.customer_id || 'CUST-000001',
        applicant: {
          full_name: fullName,
          age: Number(age),
          gender,
          address,
          phone,
          occupation,
          employment_type: employmentType,
        },
        financial: {
          annual_income: Number(annualIncome),
          existing_debt: Number(existingDebt),
          credit_score: Number(creditScore),
          home_ownership: homeOwnership,
          employment_length_years: Number(employmentLengthYears),
          credit_history_length_years: Number(creditHistoryLengthYears),
          previous_default: previousDefault,
        },
        loan: {
          amount: Number(loanAmount),
          duration_months: Number(durationMonths),
          purpose: loanPurpose,
        },
      };

      // 3. Post directly to bank node inbound port (Section 5)
      await submitApplicationToBank(
        selectedBank.api_base_url,
        payload,
        documentFiles,
        fingerprintFile
      );

      // 4. On success, celebrate and redirect
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
      });

      navigate(`/applications/${generatedAppId}`, {
        state: { newlyCreated: true },
      });
    } catch (err) {
      setErrorMessage(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
      setSubmissionProgress('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="text-xs uppercase font-bold tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
          Digital Loan Application
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Consortium Credit Application Portal
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
          Complete the application stages below. Your financial records and biometrics remain exclusively with your chosen partner bank.
        </p>
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 bg-slate-200/80 rounded-2xl space-x-1 shadow-inner">
          <button
            type="button"
            onClick={() => setFormMode('interactive')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              formMode === 'interactive'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Interactive Form & DTI Calculator (PDF Spec)</span>
          </button>
          <button
            type="button"
            onClick={() => setFormMode('wizard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              formMode === 'wizard'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Step-by-Step Wizard</span>
          </button>
        </div>
      </div>

      {formMode === 'interactive' ? (
        <LoanApplicationForm />
      ) : (
        <>
          {/* Step Tracker */}
          <div className="flex items-center justify-between max-w-2xl mx-auto px-2">
            {[
              { num: 1, label: 'Applicant KYC' },
              { num: 2, label: 'Financial Profile' },
              { num: 3, label: 'Loan Specs' },
              { num: 4, label: 'Select Bank' },
              { num: 5, label: 'Upload Biometric' },
              { num: 6, label: 'Review' },
            ].map((s) => (
              <div key={s.num} className="flex flex-col items-center">
                <button
                  onClick={() => s.num < step && setStep(s.num)}
                  disabled={s.num > step}
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition ${
                    step === s.num
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md'
                      : s.num < step
                      ? 'bg-emerald-600 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {s.num < step ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                </button>
                <span
                  className={`text-[10px] font-semibold mt-1.5 hidden sm:block ${
                    step === s.num ? 'text-blue-700' : 'text-slate-500'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Main Wizard Form Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 bank-card-shadow space-y-6">
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Submission Alert</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* STEP 1: Applicant Information */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <User className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base text-slate-900">Step 1: Personal & KYC Details</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">PAN Number (4th char 'P')</label>
                <input
                  type="text"
                  maxLength={10}
                  required
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono uppercase"
                  placeholder="e.g. ABCPE1234F"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Aadhaar (12-Digit Verhoeff Checksum)</label>
                <input
                  type="text"
                  maxLength={12}
                  required
                  value={aadhaar}
                  onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                  placeholder="12-digit number"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Age (Years)</label>
                <input
                  type="number"
                  min="18"
                  max="100"
                  required
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Employment Type</label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                >
                  <option value="SALARIED">Salaried Employee</option>
                  <option value="SELF_EMPLOYED">Self-Employed Professional</option>
                  <option value="BUSINESS">Business Enterprise Owner</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Current Occupation</label>
                <input
                  type="text"
                  required
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Financial Background */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Building className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base text-slate-900">Step 2: Financial Profile & Credit History</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Annual Income (₹ INR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  required
                  value={annualIncome}
                  onChange={(e) => setAnnualIncome(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">{formatINR(annualIncome)}</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Existing Total Debt (₹ INR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  required
                  value={existingDebt}
                  onChange={(e) => setExistingDebt(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">{formatINR(existingDebt)}</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Credit Score (CIBIL / Experian 300-900)
                </label>
                <input
                  type="number"
                  min="300"
                  max="900"
                  required
                  value={creditScore}
                  onChange={(e) => setCreditScore(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Home Ownership Status</label>
                <select
                  value={homeOwnership}
                  onChange={(e) => setHomeOwnership(e.target.value as HomeOwnership)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                >
                  <option value="RENT">Rent</option>
                  <option value="OWN">Own</option>
                  <option value="MORTGAGE">Mortgage</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Employment Length (Years)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  required
                  value={employmentLengthYears}
                  onChange={(e) => setEmploymentLengthYears(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Credit History Length (Years)
                </label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  required
                  value={creditHistoryLengthYears}
                  onChange={(e) => setCreditHistoryLengthYears(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="sm:col-span-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Previous Loan Default History?</span>
                  <span className="text-[11px] text-slate-500">
                    Have you ever defaulted on a past commercial or credit obligation?
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setPreviousDefault(false)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                      !previousDefault ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    No (0)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviousDefault(true)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                      previousDefault ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    Yes (1)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Loan Requirement */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base text-slate-900">Step 3: Loan Requirement</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-slate-700">Requested Loan Amount (₹ INR)</label>
                  <span className="font-bold text-sm text-blue-700">{formatINR(loanAmount)}</span>
                </div>
                <input
                  type="number"
                  min="10000"
                  max="10000000"
                  step="10000"
                  required
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Loan Tenure (Duration in Months)
                </label>
                <select
                  value={durationMonths}
                  onChange={(e) => setDurationMonths(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                >
                  <option value={12}>12 Months (1 Year)</option>
                  <option value={24}>24 Months (2 Years)</option>
                  <option value={36}>36 Months (3 Years)</option>
                  <option value={48}>48 Months (4 Years)</option>
                  <option value={60}>60 Months (5 Years)</option>
                  <option value={84}>84 Months (7 Years)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Loan Purpose</label>
                <select
                  value={loanPurpose}
                  onChange={(e) => setLoanPurpose(e.target.value as LoanPurpose)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                >
                  <option value="PERSONAL">Personal Financing</option>
                  <option value="EDUCATION">Education / Academic</option>
                  <option value="VENTURE">Commercial Venture / Seed</option>
                  <option value="MEDICAL">Medical Emergency</option>
                  <option value="DEBT_CONSOLIDATION">Debt Consolidation</option>
                  <option value="HOME_IMPROVEMENT">Home Improvement</option>
                </select>
              </div>

              {/* Debt-to-income warning / preview */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
                <span className="font-semibold block text-slate-800">
                  Loan-to-Income Ratio: {Math.round((loanAmount / (annualIncome || 1)) * 100)}%
                </span>
                <span className="text-[11px] text-slate-500">
                  Calculated automatically for branch underwriting assessment.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Choose Bank Node */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Landmark className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base text-slate-900">Step 4: Select Participating Bank Node</h3>
            </div>

            <p className="text-xs text-slate-500">
              Choose the independent banking institution that will process and underwrite your loan application.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {banks.length > 0 ? (
                banks.map((b) => (
                  <div
                    key={b.bank_id}
                    onClick={() => b.online && setSelectedBankId(b.bank_id)}
                    className={`p-5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      selectedBankId === b.bank_id
                        ? 'border-blue-600 bg-blue-50/40 shadow-md ring-2 ring-blue-100'
                        : b.online
                        ? 'border-slate-200 hover:border-slate-300 bg-white'
                        : 'border-rose-200 bg-rose-50/50 cursor-not-allowed opacity-80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-slate-900">{b.name}</span>
                        {b.online ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Online
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            Offline
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-slate-500">{b.bank_id}</div>
                      <div className="text-[11px] font-mono text-slate-400 mt-1">{b.api_base_url}</div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        {b.bank_id === 'BANK_A' ? 'Retail Branch Node' : 'Co-op Branch Node'}
                      </span>
                      {selectedBankId === b.bank_id && (
                        <span className="font-bold text-blue-600 flex items-center space-x-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Selected</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <>
                  {/* Fallback presentation if banks not yet synced from Head Office */}
                  <div
                    onClick={() => setSelectedBankId('BANK_A')}
                    className={`p-5 rounded-2xl border-2 transition cursor-pointer ${
                      selectedBankId === 'BANK_A'
                        ? 'border-blue-600 bg-blue-50/40'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm text-slate-900">Bank A — HDFC Retail Bank</span>
                      <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold">
                        Gopal Node
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">Port :8001 / Local Model Underwriting</div>
                  </div>

                  <div
                    onClick={() => setSelectedBankId('BANK_B')}
                    className={`p-5 rounded-2xl border-2 transition cursor-pointer ${
                      selectedBankId === 'BANK_B'
                        ? 'border-blue-600 bg-blue-50/40'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm text-slate-900">Bank B — State Co-op Bank</span>
                      <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full font-bold">
                        Nidhi Node
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">Port :8002 / Local Model Underwriting</div>
                  </div>
                </>
              )}
            </div>

            {selectedBank && !selectedBank.online && (
              <OfflineWarning
                bankName={selectedBank.name}
                onRetry={refreshNetwork}
                isRetrying={isNetworkLoading}
              />
            )}
          </div>
        )}

        {/* STEP 5: Documents & Biometric Fingerprint */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Upload className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base text-slate-900">Step 5: Verification Documents & Biometric Upload</h3>
            </div>

            {/* Fingerprint Upload Section (STRICT COMPLIANCE) */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Fingerprint className="w-6 h-6 text-blue-600" />
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Biometric Fingerprint Scan</h4>
                    <p className="text-[11px] text-slate-500">Required for privacy-preserving fraud defense verification</p>
                  </div>
                </div>

                {fingerprintUploaded && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Attached</span>
                  </span>
                )}
              </div>

              {/* Exact phrasing required by Master Guide & Contract (DO NOT mention hashing) */}
              {fingerprintUploaded ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <strong>Fingerprint uploaded successfully.</strong> Protected identifier will be generated by Bank.
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-400 transition bg-white">
                  <input
                    type="file"
                    id="fingerprint-input"
                    accept="image/*"
                    onChange={handleFingerprintChange}
                    className="hidden"
                  />
                  <label htmlFor="fingerprint-input" className="cursor-pointer space-y-2 block">
                    <Fingerprint className="w-10 h-10 text-slate-400 mx-auto" />
                    <div className="text-xs font-semibold text-blue-600 hover:underline">
                      Click to browse or drop fingerprint image here
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Standard demo PNG or JPEG biometric template
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Document Verification Uploads */}
            <div className="space-y-3">
              <label className="block font-semibold text-xs text-slate-700">
                Supplementary KYC & Income Proofs (Optional)
              </label>

              <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center bg-slate-50">
                <input
                  type="file"
                  id="documents-input"
                  multiple
                  onChange={handleDocumentsChange}
                  className="hidden"
                />
                <label htmlFor="documents-input" className="cursor-pointer space-y-1 block">
                  <FileText className="w-6 h-6 text-slate-400 mx-auto" />
                  <span className="text-xs font-semibold text-blue-600 hover:underline">
                    Attach Salary Slips, Bank Statements, or Identity Docs
                  </span>
                  <span className="block text-[10px] text-slate-400">PDF, PNG, JPG</span>
                </label>
              </div>

              {documentFiles.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-bold text-slate-600">Attached Documents:</span>
                  <div className="flex flex-wrap gap-2">
                    {documentFiles.map((f, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-100 rounded-lg text-xs text-slate-700 border border-slate-200"
                      >
                        <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                        <span className="truncate max-w-[150px]">{f.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 6: Review & Final Submission */}
        {step === 6 && (
          <div className="space-y-6">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <FileCheck2 className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base text-slate-900">Step 6: Review & Confirm Submission</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800">Target Bank Institution</h4>
                <div className="font-semibold text-blue-700 text-sm">
                  {selectedBank?.name || selectedBankId}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {selectedBank?.api_base_url || 'Branch Port'}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-800">Loan Particulars</h4>
                <div className="font-bold text-base text-slate-900">{formatINR(loanAmount)}</div>
                <div className="text-[11px] text-slate-600">
                  Tenure: {durationMonths} Months • Purpose: {loanPurpose.replace('_', ' ')}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <h4 className="font-bold text-slate-800">Applicant KYC Summary</h4>
                <div className="flex justify-between text-slate-600">
                  <span>Name:</span>
                  <span className="font-semibold text-slate-900">{fullName}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Age / Gender:</span>
                  <span className="font-semibold text-slate-900">{age} yrs / {gender}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Employment:</span>
                  <span className="font-semibold text-slate-900">{employmentType.replace('_', ' ')}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <h4 className="font-bold text-slate-800">Financial Profile</h4>
                <div className="flex justify-between text-slate-600">
                  <span>Annual Income:</span>
                  <span className="font-semibold text-slate-900">{formatINR(annualIncome)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Existing Debt:</span>
                  <span className="font-semibold text-slate-900">{formatINR(existingDebt)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Credit Score:</span>
                  <span className="font-semibold text-slate-900">{creditScore}</span>
                </div>
              </div>
            </div>

            {/* Biometric Status Confirmation */}
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center space-x-2.5">
              <Fingerprint className="w-5 h-5 text-blue-600 shrink-0" />
              <span>
                {fingerprintUploaded
                  ? 'Fingerprint image attached and ready for bank-local protected identifier conversion.'
                  : 'Warning: No fingerprint attached. Please return to Step 5 to attach biometric template.'}
              </span>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              disabled={isSubmitting}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
          ) : (
            <div />
          )}

          {step < 6 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 4 && (!selectedBank || !selectedBank.online)) {
                  setErrorMessage('Please select an active online partner bank before proceeding.');
                  return;
                }
                if (step === 5 && !fingerprintFile) {
                  setErrorMessage('Please attach a fingerprint image before proceeding.');
                  return;
                }
                setErrorMessage(null);
                setStep(step + 1);
              }}
              className="inline-flex items-center space-x-1.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md shadow-blue-500/20"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center space-x-2 px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/30 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{submissionProgress || 'Submitting to Bank...'}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Application to Bank</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
};
