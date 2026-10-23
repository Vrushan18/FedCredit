import { useState, useEffect, useCallback } from 'react';
import type { ApplicationSummary } from '../types/contracts';
import { getMyApplications } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function useApplications() {
  const { isAuthenticated } = useAuth();
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!isAuthenticated) {
      setApplications([]);
      setIsLoading(false);
      return;
    }

    try {
      const data = await getMyApplications();
      setApplications(data);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || err.message || 'Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchApplications();

    // Strict Team Contract requirement: Poll applications every 15 seconds
    const interval = setInterval(fetchApplications, 15000);
    return () => clearInterval(interval);
  }, [fetchApplications]);

  return {
    applications,
    isLoading,
    error,
    refreshApplications: fetchApplications,
  };
}
