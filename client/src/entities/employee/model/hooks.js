import { useState, useEffect, useMemo } from 'react';
import { App } from 'antd';
import { employeeApi } from '../api/employeeApi';

/**
 * Хук для работы с сотрудниками
 * Оптимизированная загрузка с параллельными запросами
 */
export const useEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await employeeApi.getAll();
      // employeeApi возвращает response.data, структура: { success: true, data: { employees: [], pagination: {} } }
      const employeesData = response?.data?.employees || [];
      setEmployees(employeesData);
      return employeesData;
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError(err);
      setEmployees([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  return {
    employees,
    loading,
    error,
    refetch: fetchEmployees,
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

