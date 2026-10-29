import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { 
  Users, 
  Search, 
  UserPlus, 
  X, 
  AlertCircle, 
  Phone, 
  Briefcase, 
  MapPin, 
  ArrowUpRight, 
  ChevronRight, 
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [copiedId, setCopiedId] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    age: 35,
    gender: 'Male',
    address: '',
    phone: '',
    occupation: '',
    employment_type: 'Salaried',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchCustomers = async (searchTerm = '') => {
    try {
      setLoading(true);
      const url = searchTerm ? `/customers?search=${encodeURIComponent(searchTerm)}` : '/customers';
      const res = await api.get(url);
      setCustomers(res.data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch customer list from Bank B database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(search);
  }, [search]);

  const copyToClipboard = (text, idKey) => {
    navigator.clipboard.writeText(text);
    setCopiedId(idKey);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await api.post('/customers', formData);
      setShowModal(false);
      setFormData({
        name: '',
        age: 35,
        gender: 'Male',
        address: '',
        phone: '',
        occupation: '',
        employment_type: 'Salaried',
      });
      fetchCustomers(search);
    } catch (err) {
      setFormError(err.message || 'Failed to create customer KYC record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Customer KYC Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Isolated local Bank B customer identities and KYC compliance records
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold px-4 py-2.5 rounded-2xl shadow-lg shadow-indigo-600/30 transition-all text-sm self-start sm:self-auto cursor-pointer border border-indigo-400/30"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Name, Phone, ID, Occupation..."
          className="w-full bg-[#090d1c]/80 border border-white/[0.08] rounded-xl pl-10 pr-9 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder-slate-500 shadow-inner"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && (
        <div className="bg-rose-950/60 border border-rose-800 text-rose-300 p-4 rounded-2xl flex items-center space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Customer Directory Table */}
      <div className="glass-panel rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl">
        {loading && customers.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm text-slate-400 font-medium">Loading customer KYC profiles...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-16 text-center text-slate-500 space-y-3">
            <Users className="w-12 h-12 mx-auto text-slate-600 opacity-60" />
            <p className="text-base font-bold text-slate-300">No Customer Records Found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {search ? `No customer matching "${search}" in local database.` : 'Add a customer or wait for portal applications to populate records.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-slate-400 text-[11px] font-bold uppercase tracking-wider bg-slate-950/70">
                  <th className="py-3.5 px-4">Customer ID</th>
                  <th className="py-3.5 px-4">Applicant Name</th>
                  <th className="py-3.5 px-4">Contact Phone</th>
                  <th className="py-3.5 px-4">Occupation</th>
                  <th className="py-3.5 px-4">Employment Type</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {customers.map((cust) => (
                  <tr key={cust.customer_id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono font-bold text-indigo-400 text-xs">
                          {cust.customer_id}
                        </span>
                        <button
                          onClick={() => copyToClipboard(cust.customer_id, cust.customer_id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 transition-opacity"
                          title="Copy Customer ID"
                        >
                          {copiedId === cust.customer_id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-700/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300 text-xs">
                          {cust.name.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-100 text-xs">{cust.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      <span className="flex items-center space-x-1.5 font-mono">
                        <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{cust.phone}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      {cust.occupation}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-white/[0.06] text-[11px] text-slate-300 font-medium">
                        {cust.employment_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/customers/${cust.customer_id}`}
                        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-900 hover:bg-indigo-600 px-3 py-1.5 rounded-xl border border-white/[0.08] transition-all shadow-sm"
                      >
                        <span>View KYC</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="glass-panel border border-white/[0.1] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Add Customer Record</h2>
                <p className="text-xs text-slate-400 mt-0.5">Register new customer in local Bank B KYC database</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-950/70 border border-rose-800 text-rose-200 p-3.5 rounded-2xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                    placeholder="e.g. Sunita Sharma"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Age</label>
                  <input
                    type="number"
                    required
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 18 })}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-mono"
                    placeholder="+919876543210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Residential Address</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  placeholder="Street address, City, State"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Occupation</label>
                  <input
                    type="text"
                    required
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                    placeholder="e.g. Senior Accountant"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Employment Type</label>
                  <select
                    value={formData.employment_type}
                    onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  >
                    <option value="Salaried">Salaried</option>
                    <option value="Self-Employed">Self-Employed</option>
                    <option value="Business">Business Owner</option>
                    <option value="Unemployed">Unemployed</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold rounded-2xl text-xs shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Customer Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
