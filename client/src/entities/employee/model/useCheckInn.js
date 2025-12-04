import { useState, useCallback } from 'react';
import { Modal } from 'antd';
import { employeeApi } from '../api/employeeApi';

/**
 * Хук для проверки наличия сотрудника по ИНН
 * Показывает диалог при совпадении и переводит на редактирование
 */
export const useCheckInn = (onNavigateToEmployee) => {
  const [checking, setChecking] = useState(false);

  const checkInn = useCallback(async (innValue) => {
    if (!innValue) return null;

    try {
      setChecking(true);

      // Нормализуем ИНН (убираем дефисы)
      const normalizedInn = innValue.replace(/[^\d]/g, '');

      // Проверяем длину
      if (normalizedInn.length !== 10 && normalizedInn.length !== 12) {
        return null;
      }

      try {
        const response = await employeeApi.checkByInn(innValue);
        
        if (response.success && response.data?.employee) {
          const employee = response.data.employee;
          
          // Показываем диалог подтверждения
          return new Promise((resolve) => {
            Modal.confirm({
              title: 'Сотрудник найден',
              content: `Сотрудник с таким ИНН уже существует. Перейти к редактированию?\n\n${employee.firstName} ${employee.lastName}`,
              okText: 'ОК',
              cancelText: 'Отмена',
              onOk: () => {
                onNavigateToEmployee?.(employee.id);
                resolve(employee);
              },
              onCancel: () => {
                resolve(null);
              },
            });
          });
        }
      } catch (error) {
        // 404 — сотрудник не найден, это нормально
        if (error.response?.status === 404) {
          return null;
        }
        // Для остальных ошибок — игнорируем или логируем
        console.warn('Error checking INN:', error);
        return null;
      }
    } finally {
      setChecking(false);
    }
  }, [onNavigateToEmployee]);

  return {
    checking,
    checkInn
  };
};

