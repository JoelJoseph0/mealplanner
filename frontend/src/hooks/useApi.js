import { useState, useCallback } from 'react';
import { getErrorMessage } from '../services/api';

export const useApi = (apiFunc) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiFunc(...args);
        setData(result);
        return { data: result, error: null };
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        return { data: null, error: message };
      } finally {
        setLoading(false);
      }
    },
    [apiFunc]
  );

  return {
    data,
    error,
    loading,
    execute,
    setData,
    setError,
  };
};

export default useApi;
