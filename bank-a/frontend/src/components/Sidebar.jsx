import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Cpu, 
  Settings, 
  ShieldAlert,
  HelpCircle
} from 'lucide-react';

export default function Sidebar({ currentTab, setTab, stats }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { 
      id: 'applications', 
      label: 'Loan Applications', 
      icon: FileText,
      badge: stats?.pending_loans > 0 ? stats.pending_loans : null
    },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'training', label: 'Local Training & FL', icon: Cpu },
    { id: 'settings', label: 'Node Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Branch Operations
          </p>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Security & Data Ownership Card */}
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-2">
          <div className="flex items-center space-x-2 text-slate-800 font-semibold">
            <ShieldAlert className="w-4 h-4 text-blue-600" />
            <span>Local Privacy Enforced</span>
          </div>
          <p className="text-slate-500 leading-relaxed">
            Customer KYC and financial records never leave this laptop. Only encrypted model parameters are shared with Head Office.
          </p>
          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Branch ID:</span>
            <span className="font-semibold text-slate-600">BANK_A</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center pt-4 border-t border-slate-100 text-[11px] text-slate-400">
        FedCredit Node v1.0 • Gopal
      </div>
    </aside>
  );
}
