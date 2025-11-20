import { useState, useEffect, useMemo } from 'react';
import { message } from 'antd';
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
  const [loading, setLoading] = useState(false);

  const createEmployee = async (values) => {
    setLoading(true);
    try {
      const response = await employeeApi.create(values);
      message.success('Сотрудник создан');
      onSuccess?.(response.data.data);
      return response.data.data;
    } catch (error) {
      console.error('Error creating employee:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.map((e) => e.message).join(', ') ||
        'Ошибка при создании';
      message.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateEmployee = async (id, values) => {
    setLoading(true);
    try {
      await employeeApi.update(id, values);
      message.success('Сотрудник обновлен');
      const response = await employeeApi.getById(id);
      onSuccess?.(response.data.data);
      return response.data.data;
    } catch (error) {
      console.error('Error updating employee:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.errors?.map((e) => e.message).join(', ') ||
        'Ошибка при обновлении';
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
      message.error('Ошибка при удалении сотрудника');
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

