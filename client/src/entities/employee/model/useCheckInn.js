import { useState, useCallback, useRef } from 'react';
import { employeeApi } from '../api/employeeApi';

/**
 * Хук для проверки наличия сотрудника по ИНН
 * Возвращает найденного сотрудника или null
 */
export const useCheckInn = () => {
  const [checking, setChecking] = useState(false);
  const checkingRef = useRef(false); // Используем ref для синхронной проверки
  const lastCheckedInnRef = useRef(null); // Храним последний проверенный ИНН

  const checkInn = useCallback(async (innValue) => {
    if (!innValue) return null;
    
    // Нормализуем ИНН (убираем дефисы)
    const normalizedInn = innValue.replace(/[^\d]/g, '');
    
    // Не запускаем новую проверку, если предыдущая еще выполняется
    if (checkingRef.current) {
      return null;
    }
    
    // Не проверяем тот же ИНН повторно
    if (lastCheckedInnRef.current === normalizedInn) {
      return null;
    }

    try {
      checkingRef.current = true;
      setChecking(true);
      lastCheckedInnRef.current = normalizedInn;

      // Проверяем длину
      if (normalizedInn.length !== 10 && normalizedInn.length !== 12) {
        return null;
      }

      const response = await employeeApi.checkByInn(normalizedInn);
      
      if (response.success && response.data?.employee) {
        return response.data.employee;
      }
      
      return null;
    } catch (error) {
      // 404 — сотрудник не найден, это нормально
      if (error.response?.status === 404) {
        // Сбрасываем lastCheckedInn, чтобы можно было проверить снова
        lastCheckedInnRef.current = null;
        return null;
      }

      // 409 — сотрудник найден в другом контрагенте, нужно пробросить ошибку
      if (error.response?.status === 409) {
        console.error('❌ Сотрудник найден в другом контрагенте:', error.response?.data?.message);
        lastCheckedInnRef.current = null;
        // Пробрасываем ошибку, чтобы компонент мог показать сообщение
        throw error;
      }

      // Для остальных ошибок — логируем
      console.error('❌ Ошибка проверки ИНН:', error);
      lastCheckedInnRef.current = null;
      return null;
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  }, []);

  return {
    checking,
    checkInn
  };
};

