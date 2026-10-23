import React, { useState } from 'react';
import { Search, UserPlus, Phone, MapPin, Briefcase, Plus } from 'lucide-react';
import { api } from '../api';

export default function CustomersView({ customers, onRefreshCustomers }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCust, setNewCust] = useState({
    customer_id: '',
    name: '',
    age: '',
    gender: 'MALE',
    occupation: '',
    employment_type: 'SALARIED',
    phone: '',
    address: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const filtered = customers.filter(c => {
    return !searchTerm ||
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customer_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm);
  });

  async function handleCreateCustomer(e) {
    e.preventDefault();
    setError(null);
    if (!newCust.customer_id || !newCust.name) {
      setError('Customer ID and Full Name are required.');
      return;
    }
    try {
      setSubmitting(true);
      await api.createCustomer({
        ...newCust,
        age: newCust.age ? parseInt(newCust.age) : null
      });
      setShowAddModal(false);
      setNewCust({
        customer_id: '',
        name: '',
        age: '',
        gender: 'MALE',
        occupation: '',
        employment_type: 'SALARIED',
        phone: '',
        address: '',
        notes: ''
      });
      onRefreshCustomers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Bank A Customer Directory</h1>
          <p className="text-xs text-slate-500">
            Locally stored KYC profiles and branch relationship records
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customers..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-2xs"
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center space-x-1.5 shadow-2xs shrink-0 transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">
            No customer records found.
          </div>
        ) : (
          filtered.map(c => (
            <div key={c.customer_id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{c.name}</h3>
                  <span className="font-mono text-[11px] text-blue-600 font-semibold">{c.customer_id}</span>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                  {c.employment_type || 'SALARIED'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <div className="flex items-center space-x-2">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{c.occupation || 'Professional'} • {c.age ? `${c.age} yrs` : ''} ({c.gender || 'MALE'})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{c.phone || 'No phone recorded'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{c.address || 'Address on file'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Register New Customer</h3>
            
            {error && (
              <div className="p-2 text-xs text-rose-700 bg-rose-50 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Customer ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CUST-000105"
                    value={newCust.customer_id}
                    onChange={e => setNewCust({...newCust, customer_id: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anand Verma"
                    value={newCust.name}
                    onChange={e => setNewCust({...newCust, name: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Age</label>
                  <input
                    type="number"
                    placeholder="e.g. 32"
                    value={newCust.age}
                    onChange={e => setNewCust({...newCust, age: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Employment Type</label>
                  <select
                    value={newCust.employment_type}
                    onChange={e => setNewCust({...newCust, employment_type: e.target.value})}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="SALARIED">SALARIED</option>
                    <option value="SELF_EMPLOYED">SELF_EMPLOYED</option>
                    <option value="BUSINESS">BUSINESS</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Phone</label>
                <input
                  type="text"
                  placeholder="+91 98000 00000"
                  value={newCust.phone}
                  onChange={e => setNewCust({...newCust, phone: e.target.value})}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Branch Area, City"
                  value={newCust.address}
                  onChange={e => setNewCust({...newCust, address: e.target.value})}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs"
                >
                  {submitting ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
