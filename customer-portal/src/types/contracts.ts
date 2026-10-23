/**
 * FedCredit — Shared Contract Types
 * Single Source of Truth matching FEDCREDIT_TEAM_CONTRACT.md (v1.0)
 * 
 * Rules:
 * - All enum strings are FROZEN.
 * - Customer portal displays ONLY the 5 frozen application statuses.
 * - All currency amounts are in whole INR.
 */

// --- FROZEN SHARED ENUMS (Section 3.2 & 7) ---

export type ApplicationStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'VERIFICATION_REQUIRED';

export type OfficerDecision = 'APPROVED' | 'REJECTED' | 'ON_HOLD';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type FraudStatus = 'SAFE' | 'REVIEW_NEEDED' | 'SUSPICIOUS';

export type Recommendation = 'ELIGIBLE' | 'HOLD_FOR_VERIFICATION' | 'NOT_RECOMMENDED';

export type HomeOwnership = 'RENT' | 'OWN' | 'MORTGAGE' | 'OTHER';

export type LoanPurpose =
  | 'EDUCATION'
  | 'MEDICAL'
  | 'VENTURE'
  | 'PERSONAL'
  | 'DEBT_CONSOLIDATION'
  | 'HOME_IMPROVEMENT';

export type EmploymentType = 'SALARIED' | 'SELF_EMPLOYED' | 'BUSINESS' | 'OTHER';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';

// --- APPLICATION DATA CONTRACT (Section 3.3) ---

export interface ApplicantInfo {
  full_name: string;
  age: number;
  gender: Gender;
  address: string;
  phone: string;
  occupation: string;
  employment_type: EmploymentType;
}

export interface FinancialInfo {
  annual_income: number;
  existing_debt: number;
  credit_score: number;
  home_ownership: HomeOwnership;
  employment_length_years: number;
  credit_history_length_years: number;
  previous_default: boolean;
}

export interface LoanInfo {
  amount: number;
  duration_months: number;
  purpose: LoanPurpose;
}

export interface LoanApplicationPayload {
  application_id: string;
  customer_id: string;
  applicant: ApplicantInfo;
  financial: FinancialInfo;
  loan: LoanInfo;
}

// --- STANDARD ERROR ENVELOPE (Section 3.4) ---

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'SERVER_ERROR';

export interface StandardErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, any>;
  };
}

// --- HEAD OFFICE API CONTRACT (Section 4) ---

export interface HealthResponse {
  status: string;
  version: string;
}

export interface CustomerAuthUser {
  customer_id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface RegisterResponse {
  customer_id: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  customer: CustomerAuthUser;
}

export interface BankNode {
  bank_id: string;
  name: string;
  api_base_url: string;
  online: boolean;
  last_heartbeat?: string;
}

export interface CreateApplicationIntentRequest {
  bank_id: string;
}

export interface CreateApplicationIntentResponse {
  application_id: string;
  status: ApplicationStatus;
}

export interface TimelineEntry {
  status: ApplicationStatus;
  at: string;
  message?: string;
}

export interface ApplicationSummary {
  application_id: string;
  bank_id: string;
  bank_name?: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at?: string;
  loan_amount?: number;
  loan_purpose?: LoanPurpose;
}

export interface ApplicationDetail extends ApplicationSummary {
  timeline: TimelineEntry[];
  applicant?: ApplicantInfo;
  financial?: FinancialInfo;
  loan?: LoanInfo;
}

export interface CustomerNotification {
  id: number | string;
  application_id?: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
}
