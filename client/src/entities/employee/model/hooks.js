import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { App } from 'antd';
import { employeeApi } from '../api/employeeApi';
import { employeeStatusService } from '@/services/employeeStatusService';
import { useEmployeesStore } from '@/store/employeesStore';

// Размер первой порции для быстрого отображения
const INITIAL_PAGE_SIZE = 100;
// Размер порции для фоновой загрузки
const BACKGROUND_PAGE_SIZE = 2000;

/**
 * Загрузка статусов для списка сотрудников
 */
const loadStatusesForEmployees = async (employeesData) => {
  if (employeesData.length === 0) return employeesData;
  
  try {
    const employeeIds = employeesData.map(emp => emp.id);
    const statusesBatch = await employeeStatusService.getStatusesBatch(employeeIds);
    
    return employeesData.map(emp => ({
      ...emp,
      statusMappings: statusesBatch[emp.id] || []
    }));
  } catch (statusErr) {
    console.warn('Error loading statuses batch:', statusErr);
    return employeesData;
  }
};

/**
 * Хук для работы с сотрудниками
 * Прогрессивная загрузка: сначала первая порция, потом остальные в фоне
 * @param {boolean} activeOnly - показывать только активных сотрудников
 * @param {object} filterParams - дополнительные параметры фильтрации
 */
export const useEmployees = (activeOnly = false, filterParams = {}) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  
  // Флаг для отмены фоновой загрузки при размонтировании или новом запросе
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  /**
   * Загрузка сотрудников с прогрессивной стратегией
   */
  const fetchEmployees = useCallback(async (force = false) => {
    // Проверяем кэш (если не force)
    if (!force) {
      const cached = useEmployeesStore.getState().getEmployees({ activeOnly, ...filterParams });
      if (cached) {
        setEmployees(cached.employees);
        setTotalCount(cached.totalCount);
        setLoading(false);
        setBackgroundLoading(false);
        return cached.employees;
      }
    }

    // Отменяем предыдущую фоновую загрузку
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setBackgroundLoading(false);
    setError(null);
    
    try {
      // 1. Загружаем первую порцию для быстрого отображения
      const initialResponse = await employeeApi.getAll({ 
        activeOnly, 
        ...filterParams,
        page: 1,
        limit: INITIAL_PAGE_SIZE
      });
      
      const initialData = initialResponse?.data?.employees || [];
      const pagination = initialResponse?.data?.pagination || {};
      const total = pagination.total || initialData.length;
      
      setTotalCount(total);
      
      // Загружаем статусы для первой порции
      const initialWithStatuses = await loadStatusesForEmployees(initialData);
      
      if (!isMountedRef.current) return [];
      
      // Показываем первую порцию пользователю
      setEmployees(initialWithStatuses);
      setLoading(false);
      
      // 2. Если есть ещё данные - загружаем в фоне
      if (total > INITIAL_PAGE_SIZE) {
        setBackgroundLoading(true);
        
        // Собираем все данные, начиная с уже загруженных
        let allEmployees = [...initialWithStatuses];
        // Начинаем с offset = INITIAL_PAGE_SIZE (после первых 100)
        let currentOffset = INITIAL_PAGE_SIZE;
        
        // Загружаем остальные порции
        while (currentOffset < total && !abortControllerRef.current.signal.aborted) {
          try {
            // Используем page и limit с правильным расчётом
            const pageNum = Math.floor(currentOffset / BACKGROUND_PAGE_SIZE) + 1;
            const response = await employeeApi.getAll({
              activeOnly,
              ...filterParams,
              page: 1, // Всегда page=1, используем offset через limit
              limit: BACKGROUND_PAGE_SIZE,
              offset: currentOffset // Явно передаём offset
            });
            
            const pageData = response?.data?.employees || [];
            if (pageData.length === 0) break;
            
            // Загружаем статусы для этой порции
            const pageWithStatuses = await loadStatusesForEmployees(pageData);
            
            // Добавляем к общему списку (исключая дубликаты)
            const existingIds = new Set(allEmployees.map(e => e.id));
            const newEmployees = pageWithStatuses.filter(e => !existingIds.has(e.id));
            allEmployees = [...allEmployees, ...newEmployees];
            
            // Обновляем состояние после каждой порции
            if (isMountedRef.current && !abortControllerRef.current.signal.aborted) {
              setEmployees([...allEmployees]);
            }
            
            currentOffset += BACKGROUND_PAGE_SIZE;
          } catch (err) {
            // Если ошибка при фоновой загрузке - прерываем, но не показываем ошибку
            console.warn('Background loading error:', err);
            break;
          }
        }
        
        if (isMountedRef.current) {
          setBackgroundLoading(false);
          // Сохраняем полный список в кэш
          useEmployeesStore.getState().setEmployees(allEmployees, total, { activeOnly, ...filterParams });
        }
      } else {
        // Если данных мало, сохраняем сразу
        useEmployeesStore.getState().setEmployees(initialWithStatuses, total, { activeOnly, ...filterParams });
      }
      
      return initialWithStatuses;
    } catch (err) {
      console.error('Error fetching employees:', err);
      if (isMountedRef.current) {
        setError(err);
        setEmployees([]);
        setLoading(false);
        setBackgroundLoading(false);
      }
      return [];
    }
  }, [activeOnly, JSON.stringify(filterParams)]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchEmployees();
    
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchEmployees]);

  return {
    employees,
    loading,
    backgroundLoading, // Индикатор фоновой загрузки
    totalCount, // Общее количество сотрудников
    error,
    refetch: () => fetchEmployees(true), // force reload
    invalidateCache: () => useEmployeesStore.getState().invalidate(),
  };
};

/**
 * Хук для операций с сотрудником (CRUD)
 */
export const useEmployeeActions = (onSuccess) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const createEmployee = async (values) => {
    setLoading(true);
    try {
      // Удаляем флаг isDraft перед отправкой на сервер
      const isDraft = values.isDraft;
      const valuesToSend = { ...values };
      delete valuesToSend.isDraft;

      console.log('📤 Creating employee with values:', valuesToSend);

      const response = await employeeApi.create(valuesToSend);
      
      // Показываем сообщение в зависимости от того, черновик это или полная карточка
      if (isDraft) {
        message.success('Черновик сохранен');
      } else {
        message.success('Сотрудник создан');
      }
      
      // Сбрасываем кэш сотрудников при создании
      useEmployeesStore.getState().invalidate();
      
      // employeeApi.create уже возвращает response.data, которая имеет структуру:
      // {success: true, message: "...", data: {id, firstName, ...}}
      // Поэтому нужно взять response.data (это данные сотрудника)
      const createdEmployee = response.data;
      onSuccess?.(createdEmployee);
      return createdEmployee;
    } catch (error) {
      console.error('Error creating employee:', error);
      
      // Формируем понятное сообщение об ошибке
      let errorMessage = 'Ошибка при сохранении';
      
      if (error.response?.data?.message === 'Validation failed' && error.response?.data?.errors) {
        // Собираем список полей с ошибками
        const fields = error.response.data.errors
          .map(e => {
            const fieldNames = {
              firstName: 'Имя',
              lastName: 'Фамилия',
              positionId: 'Должность',
              citizenshipId: 'Гражданство',
              birthDate: 'Дата рождения',
              phone: 'Телефон',
              inn: 'ИНН',
              snils: 'СНИЛС',
              passportNumber: 'Паспорт',
              passportDate: 'Дата выдачи паспорта',
              passportIssuer: 'Орган выдачи паспорта',
              registrationAddress: 'Адрес регистрации',
            };
            return fieldNames[e.field] || e.field;
          })
          .join(', ');
        errorMessage = values.isDraft 
          ? `Для черновика требуется: ${fields}`
          : `Заполните обязательные поля: ${fields}`;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      message.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateEmployee = async (id, values) => {
    setLoading(true);
    try {
      // Удаляем флаг isDraft перед отправкой на сервер
      const isDraft = values.isDraft;
      const valuesToSend = { ...values };
      delete valuesToSend.isDraft;

      // Используем разные методы API для черновиков и полного сохранения
      const response = isDraft 
        ? await employeeApi.updateDraft(id, valuesToSend)
        : await employeeApi.update(id, valuesToSend);
      
      // Показываем сообщение в зависимости от того, черновик это или полная карточка
      if (isDraft) {
        message.success('Черновик обновлен');
      } else {
        message.success('Сотрудник обновлен');
      }
      
      // Сбрасываем кэш сотрудников при обновлении
      useEmployeesStore.getState().invalidate();
      
      // API уже возвращает response.data, которая имеет структуру:
      // {success: true, message: "...", data: {id, firstName, ...}}
      // Поэтому нужно взять response.data (это данные сотрудника)
      const updatedEmployee = response.data;
      onSuccess?.(updatedEmployee);
      return updatedEmployee;
    } catch (error) {
      console.error('Error updating employee:', error);
      
      // Формируем понятное сообщение об ошибке
      let errorMessage = 'Ошибка при обновлении';
      
      if (error.response?.data?.message === 'Validation failed' && error.response?.data?.errors) {
        // Собираем список полей с ошибками
        const fields = error.response.data.errors
          .map(e => {
            const fieldNames = {
              firstName: 'Имя',
              lastName: 'Фамилия',
              positionId: 'Должность',
              citizenshipId: 'Гражданство',
              birthDate: 'Дата рождения',
              phone: 'Телефон',
              inn: 'ИНН',
              snils: 'СНИЛС',
              passportNumber: 'Паспорт',
              passportDate: 'Дата выдачи паспорта',
              passportIssuer: 'Орган выдачи паспорта',
              registrationAddress: 'Адрес регистрации',
            };
            return fieldNames[e.field] || e.field;
          })
          .join(', ');
        errorMessage = values.isDraft 
          ? `Для черновика требуется: ${fields}`
          : `Заполните обязательные поля: ${fields}`;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      message.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteEmployee = async (id) => {
    try {
      await employeeApi.delete(id);
      message.success('Сотрудник удален');
      
      // Сбрасываем кэш сотрудников при удалении
      useEmployeesStore.getState().invalidate();
      
      onSuccess?.();
    } catch (error) {
      // Проверяем наличие сообщения об ошибке от сервера
      const errorMessage = error.response?.data?.message || 'Ошибка при удалении сотрудника';
      message.error(errorMessage);
      throw error;
    }
  };

  const updateDepartment = async (employeeId, departmentId) => {
    try {
      await employeeApi.updateDepartment(employeeId, departmentId);
      message.success('Подразделение обновлено');
      
      // Сбрасываем кэш сотрудников при обновлении подразделения
      useEmployeesStore.getState().invalidate();
      
      onSuccess?.();
    } catch (error) {
      message.error('Ошибка при обновлении подразделения');
      console.error('Error updating department:', error);
      throw error;
    }
  };

  return {
    loading,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    updateDepartment,
  };
};

