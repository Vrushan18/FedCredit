import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import ApplicationsView from './components/ApplicationsView';
import ApplicationDetailModal from './components/ApplicationDetailModal';
import CustomersView from './components/CustomersView';
import TrainingView from './components/TrainingView';
import SettingsView from './components/SettingsView';
import LoginView from './components/LoginView';
import { api } from './api';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [currentTab, setTab] = useState('dashboard');
  
  // Data State
  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [health, setHealth] = useState(null);
  const [appFilter, setAppFilter] = useState('');
  
  // Selected Application for modal
  const [selectedAppId, setSelectedAppId] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = localStorage.getItem('bank_a_token');
      if (token) {
        const me = await api.getMe();
        setUser(me);
        await loadAllData();
      }
    } catch (err) {
      console.warn('Session expired or invalid:', err);
      api.logout();
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  }

  async function loadAllData() {
    try {
      const [statsData, appsData, custsData, healthData] = await Promise.all([
        api.getStats().catch(() => null),
        api.getApplications().catch(() => []),
        api.getCustomers().catch(() => []),
        api.getHealth().catch(() => null)
      ]);
      setStats(statsData);
      setApplications(appsData);
      setCustomers(custsData);
      setHealth(healthData);
    } catch (err) {
      console.error('Failed to load portal data:', err);
    }
  }

  function handleLoginSuccess(employee) {
    setUser(employee);
    loadAllData();
  }

  function handleLogout() {
    api.logout();
    setUser(null);
  }

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-sm font-medium">Connecting to Bank A Node...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Header
        user={user}
        onLogout={handleLogout}
        health={health}
        onRefresh={loadAllData}
      />

      <div className="flex flex-1 max-w-7xl w-full mx-auto">
        <Sidebar
          currentTab={currentTab}
          setTab={setTab}
          stats={stats}
        />

        <main className="flex-1 p-6 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              applications={applications}
              onSelectApp={(id) => setSelectedAppId(id)}
              setTab={setTab}
            />
          )}

          {currentTab === 'applications' && (
            <ApplicationsView
              applications={applications}
              onSelectApp={(id) => setSelectedAppId(id)}
              currentFilter={appFilter}
              setFilter={setAppFilter}
            />
          )}

          {currentTab === 'customers' && (
            <CustomersView
              customers={customers}
              onRefreshCustomers={loadAllData}
            />
          )}

          {currentTab === 'training' && (
            <TrainingView />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              health={health}
              onRefreshHealth={loadAllData}
            />
          )}
        </main>
      </div>

      {/* Application Detail / Decision Modal */}
      {selectedAppId && (
        <ApplicationDetailModal
          applicationId={selectedAppId}
          onClose={() => setSelectedAppId(null)}
          onRefreshData={loadAllData}
        />
      )}
    </div>
  );
}
