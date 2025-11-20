import { useState, useEffect } from 'react';
import { settingsApi } from '../api/settingsApi';

/**
 * Хук для работы с настройками
 */
export const useSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await settingsApi.getPublicSettings();
      // settingsApi возвращает response.data, структура: { success: true, data: { defaultCounterpartyId } }
      setSettings(response?.data);
      return response?.data;
    } catch (err) {
      console.error('Error loading settings:', err);
      setError(err);
      setSettings(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    defaultCounterpartyId: settings?.defaultCounterpartyId,
    loading,
    error,
    refetch: fetchSettings,
  };
};

