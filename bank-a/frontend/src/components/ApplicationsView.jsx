import React, { useState } from 'react';
import { Search, Filter, Eye, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function ApplicationsView({ applications, onSelectApp, currentFilter, setFilter }) {
  const [searchTerm, setSearchTerm] = useState('');

  const statuses = [
    { id: '', label: 'All' },
    { id: 'SUBMITTED', label: 'Submitted' },
    { id: 'UNDER_REVIEW', label: 'Under Review' },
    { id: 'APPROVED', label: 'Approved' },
    { id: 'REJECTED', label: 'Rejected' },
    { id: 'VERIFICATION_REQUIRED', label: 'Verification Required' }
  ];

  const filtered = applications.filter(app => {
    const matchesStatus = !currentFilter || app.status === currentFilter;
    const matchesSearch = !searchTerm || 
      app.applicant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.application_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.customer_id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-5">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Loan Application Queue</h1>
          <p className="text-xs text-slate-500">
            Incoming credit applications routed to Bank A for localized adjudication
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, app or cust ID..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        {statuses.map(st => (
          <button
            key={st.id}
            onClick={() => setFilter(st.id)}
            className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
              currentFilter === st.id
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Application ID</th>
                <th className="py-3 px-4">Applicant</th>
                <th className="py-3 px-4">Financials</th>
                <th className="py-3 px-4">Loan Request</th>
                <th className="py-3 px-4">AI Risk Status</th>
                <th className="py-3 px-4">Queue Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">
                    No loan applications found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map(app => {
                  return (
                    <tr key={app.application_id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                        {app.application_id}
                        <div className="text-[10px] text-slate-400 font-normal">{app.customer_id}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{app.applicant_name}</div>
                        <div className="text-[11px] text-slate-400">Age: {app.applicant_age || 'N/A'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium">
                          ₹{Number(app.annual_income).toLocaleString('en-IN')}/yr
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          ₹{Number(app.loan_amount).toLocaleString('en-IN')}
                        </div>
                        <span className="inline-block mt-0.5 text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium uppercase">
                          {app.purpose}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {app.risk_level ? (
                          <div className="space-y-1">
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              app.risk_level === 'LOW' ? 'bg-emerald-100 text-emerald-800' :
                              app.risk_level === 'MEDIUM' ? 'bg-amber-100 text-amber-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {app.risk_level} RISK
                            </span>
                            {app.fraud_status && (
                              <div className={`text-[10px] font-semibold ${
                                app.fraud_status === 'SAFE' ? 'text-emerald-600' : 'text-rose-600'
                              }`}>
                                Fraud: {app.fraud_status}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Pending Inference</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          app.status === 'SUBMITTED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          app.status === 'UNDER_REVIEW' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          app.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          app.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onSelectApp(app.application_id)}
                          className="inline-flex items-center space-x-1.5 bg-slate-900 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium transition text-xs shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
