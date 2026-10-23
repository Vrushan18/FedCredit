import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

interface OfflineWarningProps {
  bankName: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const OfflineWarning: React.FC<OfflineWarningProps> = ({
  bankName,
  onRetry,
  isRetrying = false,
}) => {
  return (
    <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-sm flex items-start space-x-3">
      <WifiOff className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <h5 className="font-semibold text-rose-900">Partner Node Currently Offline</h5>
        <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
          {bankName} is temporarily unreachable over the private banking mesh. Applications cannot be processed while the node is offline. Please select another online partner bank or retry after the branch node reconnects.
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-700 text-xs font-semibold hover:bg-rose-100 disabled:opacity-50 transition shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>{isRetrying ? 'Checking...' : 'Retry'}</span>
        </button>
      )}
    </div>
  );
};
