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
    
    // Не запускаем новую проверку, если предыдущая еще выполняется
    if (checking) {
      console.log('⏳ Проверка уже выполняется, пропускаем');
      return null;
    }

    try {
      setChecking(true);

      // Нормализуем ИНН (убираем дефисы)
      const normalizedInn = innValue.replace(/[^\d]/g, '');

      // Проверяем длину
      if (normalizedInn.length !== 10 && normalizedInn.length !== 12) {
        console.log('⚠️ Некорректная длина ИНН:', normalizedInn.length);
        setChecking(false);
        return null;
      }

      console.log('🔍 Проверяем ИНН:', normalizedInn);

      try {
        const response = await employeeApi.checkByInn(normalizedInn);
        
        if (response.success && response.data?.employee) {
          const employee = response.data.employee;
          console.log('✅ Найден сотрудник:', employee);
          
          // Показываем диалог подтверждения
          Modal.confirm({
            title: 'Сотрудник найден',
            content: `Сотрудник с таким ИНН уже существует. Перейти к редактированию?\n\n${employee.firstName} ${employee.lastName}`,
            okText: 'ОК',
            cancelText: 'Отмена',
            onOk: () => {
              console.log('👉 Переход на редактирование:', employee.id);
              onNavigateToEmployee?.(employee.id);
            },
          });
          
          return employee;
        }
      } catch (error) {
        // 404 — сотрудник не найден, это нормально
        if (error.response?.status === 404) {
          console.log('ℹ️ Сотрудник с таким ИНН не найден');
          setChecking(false);
          return null;
        }
        // Для остальных ошибок — логируем
        console.error('❌ Ошибка проверки ИНН:', error);
        setChecking(false);
        return null;
      }
      
      setChecking(false);
      return null;
    } catch (error) {
      console.error('❌ Непредвиденная ошибка:', error);
      setChecking(false);
      return null;
    }
  }, [onNavigateToEmployee, checking]);

  return {
    checking,
    checkInn
  };
};

