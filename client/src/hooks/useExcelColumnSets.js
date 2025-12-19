import { useState, useEffect, useCallback } from 'react';
import { App } from 'antd';
import excelColumnSetService from '@/services/excelColumnSetService';

/**
 * Хук для работы с наборами столбцов Excel
 * Управляет загрузкой, созданием, обновлением и удалением наборов
 */
export const useExcelColumnSets = () => {
  const { message } = App.useApp();
  const [columnSets, setColumnSets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Загрузить все наборы
  const fetchColumnSets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await excelColumnSetService.getAll();
      const sets = response?.data?.data || [];
      setColumnSets(Array.isArray(sets) ? sets : []);
    } catch (err) {
      console.error('Error fetching column sets:', err);
      setError(err.message || 'Ошибка загрузки наборов');
      setColumnSets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Загружаем наборы при монтировании
  useEffect(() => {
    fetchColumnSets();
  }, [fetchColumnSets]);

  // Создать новый набор
  const createColumnSet = useCallback(async (data) => {
    try {
      setLoading(true);
      const response = await excelColumnSetService.create(data);
      message.success('Набор успешно создан');
      await fetchColumnSets(); // Перезагружаем список
      return response.data;
    } catch (err) {
      console.error('Error creating column set:', err);
      const errorMsg = err.response?.data?.message || 'Ошибка создания набора';
      message.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [message, fetchColumnSets]);

  // Обновить набор
  const updateColumnSet = useCallback(async (id, data) => {
    try {
      setLoading(true);
      const response = await excelColumnSetService.update(id, data);
      message.success('Набор успешно обновлен');
      await fetchColumnSets(); // Перезагружаем список
      return response.data;
    } catch (err) {
      console.error('Error updating column set:', err);
      const errorMsg = err.response?.data?.message || 'Ошибка обновления набора';
      message.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [message, fetchColumnSets]);

  // Удалить набор
  const deleteColumnSet = useCallback(async (id) => {
    try {
      setLoading(true);
      await excelColumnSetService.delete(id);
      message.success('Набор успешно удален');
      await fetchColumnSets(); // Перезагружаем список
    } catch (err) {
      console.error('Error deleting column set:', err);
      const errorMsg = err.response?.data?.message || 'Ошибка удаления набора';
      message.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [message, fetchColumnSets]);

  // Установить набор как набор по умолчанию
  const setDefaultColumnSet = useCallback(async (id) => {
    try {
      setLoading(true);
      await excelColumnSetService.setDefault(id);
      message.success('Набор установлен по умолчанию');
      await fetchColumnSets(); // Перезагружаем список
    } catch (err) {
      console.error('Error setting default column set:', err);
      const errorMsg = err.response?.data?.message || 'Ошибка установки набора по умолчанию';
      message.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [message, fetchColumnSets]);

  // Получить набор по умолчанию
  const getDefaultColumnSet = useCallback(() => {
    return columnSets.find(set => set.isDefault) || null;
  }, [columnSets]);

  return {
    columnSets,
    loading,
    error,
    fetchColumnSets,
    createColumnSet,
    updateColumnSet,
    deleteColumnSet,
    setDefaultColumnSet,
    getDefaultColumnSet,
  };
};

