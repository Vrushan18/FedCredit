import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  LogOut, 
  Building2, 
  ShieldCheck, 
  Wifi, 
  Server, 
  Bell, 
  ChevronRight,
  Clock,
  Menu,
  X,
  Database,
  Activity
} from 'lucide-react';

const DashboardLayout = () => {
  const { employee, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [nodeHealth, setNodeHealth] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch node health status
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await api.get('/health');
        setNodeHealth(res.data);
      } catch {
        setNodeHealth({ status: 'offline', database_status: 'disconnected' });
      }
    };
    checkHealth();
    const healthInterval = setInterval(checkHealth, 15000);
    return () => clearInterval(healthInterval);
  }, []);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/applications/')) return 'Application Deep Review';
    if (path.includes('/applications')) return 'Loan Application Registry';
    if (path.includes('/customers/')) return 'Customer KYC Profile';
    if (path.includes('/customers')) return 'Customer Directory';
    return 'Credit Risk Executive Console';
  };

  const isHealthy = nodeHealth?.status === 'ok';

  return (
    <div className="flex h-screen bg-[#060813] text-slate-100 overflow-hidden font-sans">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 bg-[#090d1c]/95 lg:bg-[#090d1c]/90 border-r border-white/[0.07] flex flex-col justify-between shrink-0 backdrop-blur-xl
        transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div>
          {/* Bank B Header */}
          <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <div className="bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <h1 className="font-extrabold text-base text-white tracking-tight truncate">State Co-op Bank</h1>
                </div>
                <p className="text-[11px] text-indigo-400 font-semibold tracking-wide uppercase">Node 2 • Bank B (FedCredit)</p>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="px-4 py-6">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">Navigation</p>
            <nav className="space-y-1.5">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600/90 to-indigo-700/80 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/30 font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`
                }
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Executive Dashboard</span>
              </NavLink>

              <NavLink
                to="/customers"
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600/90 to-indigo-700/80 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/30 font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`
                }
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Customer Directory</span>
              </NavLink>

              <NavLink
                to="/applications"
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600/90 to-indigo-700/80 text-white shadow-lg shadow-indigo-600/25 border border-indigo-500/30 font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`
                }
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>Loan Applications</span>
              </NavLink>
            </nav>
          </div>
        </div>

        {/* Live System Telemetry Card */}
        <div className="p-4 border-t border-white/[0.06] space-y-3">
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/[0.06] space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center space-x-1.5">
                <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                <span>Node Status</span>
              </span>
              <span className={`font-semibold text-[10px] uppercase tracking-wider ${isHealthy ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isHealthy ? 'ONLINE • PORT 8002' : 'OFFLINE'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center space-x-1.5">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>Database</span>
              </span>
              <span className="font-mono text-cyan-300 text-[10px] uppercase">
                {nodeHealth?.database_status === 'postgres_active' ? 'PostgreSQL' : 'SQLite Dev'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 flex items-center space-x-1.5">
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                <span>Head Office</span>
              </span>
              <span className="font-mono text-indigo-300 font-semibold text-[10px]">100.127.141.31</span>
            </div>

            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px]">
              <span className="text-slate-500">Privacy Isolation</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-semibold">
                ACTIVE
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 bg-[#090d1c]/70 border-b border-white/[0.06] px-4 sm:px-6 flex items-center justify-between shrink-0 backdrop-blur-xl relative z-10">
          {/* Hamburger + Breadcrumb & Title */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              title="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline">Bank B Node</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 hidden sm:inline" />
              <span className="text-sm font-bold text-slate-100 truncate">{getPageTitle()}</span>
            </div>
          </div>

          {/* Right Header Badges & Officer Profile */}
          <div className="flex items-center space-x-3 sm:space-x-5">
            {/* Live Clock */}
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/[0.05] text-xs font-mono text-slate-300">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>{currentTime}</span>
            </div>

            {/* Officer Profile Badge */}
            <div className="flex items-center space-x-2 sm:space-x-3 pl-2 border-l border-white/[0.08]">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-indigo-600/20 border border-indigo-400/30">
                {employee?.username ? employee.username.substring(0, 2).toUpperCase() : 'BO'}
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-slate-200">{employee?.username || 'Officer'}</p>
                <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">
                  {employee?.role || 'CREDIT OFFICER'}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                title="Log out of session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#060813] relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
