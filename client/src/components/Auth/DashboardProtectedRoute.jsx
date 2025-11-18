import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Result, Spin } from 'antd';
import { useAuthStore } from '@/store/authStore';
import settingsService from '@/services/settingsService';

/**
 * Компонент для защиты маршрута Дашборд
 * Проверяет, принадлежит ли пользователь к контрагенту по умолчанию
 */
const DashboardProtectedRoute = ({ children }) => {
  const { user } = useAuthStore();
  const [defaultCounterpartyId, setDefaultCounterpartyId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await settingsService.getPublicSettings();
        console.log('🔍 DashboardProtectedRoute: loaded settings', response.data);
        setDefaultCounterpartyId(response.data.defaultCounterpartyId);
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  const canSeeDashboard = user?.counterpartyId === defaultCounterpartyId;

  console.log('🔍 DashboardProtectedRoute: access check', {
    userCounterpartyId: user?.counterpartyId,
    defaultCounterpartyId,
    canSeeDashboard,
    user
  });

  if (!canSeeDashboard) {
    return (
      <Result
        status="403"
        title="Доступ запрещен"
        subTitle="Дашборд доступен только для пользователей контрагента по умолчанию."
      />
    );
  }

  return children;
};

export default DashboardProtectedRoute;

