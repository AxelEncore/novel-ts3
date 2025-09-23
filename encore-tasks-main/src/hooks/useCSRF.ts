import { useEffect, useState } from 'react';

export function useCSRF() {
  const [csrfToken, setCSRFToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCSRFToken = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/csrf', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }
      
      const data = await response.json();
      setCSRFToken(data.csrfToken);
    } catch (err) {
      setError(err instanceof Error $1 err.message : 'Unknown error');
      console.error('Error fetching CSRF token:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCSRFToken = () => {
    fetchCSRFToken();
  };

  useEffect(() => {
    fetchCSRFToken();
  }, []);

  return {
    csrfToken,
    isLoading,
    error,
    refreshCSRFToken
  };
}