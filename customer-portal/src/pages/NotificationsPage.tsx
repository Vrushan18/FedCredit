import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileText,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
    refreshNotifications,
  } = useNotifications();

  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const filteredNotifications =
    filter === 'UNREAD' ? notifications.filter((n) => !n.read) : notifications;

  const formatTimestamp = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoString;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'DOCUMENTS_VERIFIED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'DOCUMENTS_REQUIRED':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'OFFICER_REVIEWING':
        return <Clock className="w-5 h-5 text-blue-600" />;
      default:
        return <FileText className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Bell className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">Notifications & Alerts</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status updates broadcast from partner bank branches and Head Office
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => refreshNotifications()}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            filter === 'ALL'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            filter === 'UNREAD'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading && notifications.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Checking for alerts...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
            <ShieldCheck className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="font-bold text-slate-900 text-sm">No Notifications</h3>
            <p className="text-xs text-slate-500">
              {filter === 'UNREAD'
                ? 'All alerts have been read.'
                : 'No alerts received yet. Updates will appear as your applications progress.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-2xl border transition flex items-start justify-between space-x-4 ${
                notif.read
                  ? 'bg-white border-slate-200/80 text-slate-700'
                  : 'bg-blue-50/40 border-blue-200 text-slate-900 font-medium'
              }`}
            >
              <div className="flex items-start space-x-3.5">
                <div className="p-2 rounded-xl bg-slate-100 shrink-0 mt-0.5">
                  {getNotificationIcon(notif.type)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">
                      {notif.type.replace('_', ' ')}
                    </span>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono pt-1">
                    <span>{formatTimestamp(notif.created_at)}</span>
                    {notif.application_id && (
                      <span>• Ref: {notif.application_id}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {notif.application_id && (
                  <Link
                    to={`/applications/${notif.application_id}`}
                    className="p-2 text-blue-600 hover:bg-blue-100/50 rounded-lg text-xs font-semibold flex items-center space-x-1"
                    title="View Application"
                  >
                    <span>View</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                {!notif.read && (
                  <button
                    onClick={() => markRead(notif.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                    title="Mark as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
