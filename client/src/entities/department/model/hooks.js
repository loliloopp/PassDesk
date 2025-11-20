import { useState, useEffect } from 'react';
import { departmentApi } from '../api/departmentApi';

/**
 * Хук для работы с подразделениями
 */
export const useDepartments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await departmentApi.getAll();
      // departmentApi возвращает response.data, структура: { success: true, data: { departments } }
      const departmentsData = response?.data?.departments || [];
      setDepartments(departmentsData);
      return departmentsData;
    } catch (err) {
      console.error('Error loading departments:', err);
      setError(err);
      setDepartments([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  return {
    departments,
    loading,
    error,
    refetch: fetchDepartments,
  };
};

