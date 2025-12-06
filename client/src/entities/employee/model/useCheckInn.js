import { useState, useCallback, useRef, useEffect } from 'react';
import { employeeApi } from '../api/employeeApi';

/**
 * Хук для проверки наличия сотрудника по ИНН
 * Возвращает найденного сотрудника или null
 * С debounce и AbortController для отмены старых запросов
 */
export const useCheckInn = () => {
  const [checking, setChecking] = useState(false);
  const checkingRef = useRef(false);
  const lastCheckedInnRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Очищаем таймаут и AbortController при размонтировании
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const checkInn = useCallback(async (innValue) => {
    if (!innValue) return null;
    
    // Нормализуем ИНН (убираем дефисы)
    const normalizedInn = innValue.replace(/[^\d]/g, '');
    
    // Не проверяем тот же ИНН повторно
    if (lastCheckedInnRef.current === normalizedInn) {
      return null;
    }

    // Очищаем старый таймаут
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Отменяем старый запрос
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 🎯 DEBOUNCE: Ждем 300ms перед выполнением запроса
    return new Promise((resolve, reject) => {
      debounceTimeoutRef.current = setTimeout(async () => {
        // Не запускаем новую проверку, если предыдущая еще выполняется
        if (checkingRef.current) {
          resolve(null);
          return;
        }

        try {
          // Не проверяем длину, если ИНН пустой
          if (!normalizedInn) {
            resolve(null);
            return;
          }

          // Проверяем длину
          if (normalizedInn.length !== 10 && normalizedInn.length !== 12) {
            resolve(null);
            return;
          }

          checkingRef.current = true;
          setChecking(true);
          lastCheckedInnRef.current = normalizedInn;

          // Создаем новый AbortController для этого запроса
          abortControllerRef.current = new AbortController();
          
          const response = await employeeApi.checkByInn(normalizedInn);
          
          if (response.success && response.data?.employee) {
            // ✅ Возвращаем сотрудника с флагами isOwner и canLink
            resolve({
              ...response.data.employee,
              isOwner: response.data.isOwner,
              canLink: response.data.canLink
            });
            return;
          }
          
          resolve(null);
        } catch (error) {
          // Если запрос был отменен - молча завершаем
          if (error.name === 'AbortError') {
            resolve(null);
            return;
          }

          // 404 — сотрудник не найден, это нормально
          if (error.response?.status === 404) {
            lastCheckedInnRef.current = null;
            resolve(null);
            return;
          }

          // 409 — сотрудник найден в другом контрагенте, нужно пробросить ошибку
          if (error.response?.status === 409) {
            console.error('❌ Сотрудник найден в другом контрагенте:', error.response?.data?.message);
            lastCheckedInnRef.current = null;
            // 🎯 Используем Promise.reject() вместо throw для корректной обработки ошибки
            reject(error);
            return;
          }

          // Для остальных ошибок — логируем
          console.error('❌ Ошибка проверки ИНН:', error);
          lastCheckedInnRef.current = null;
          resolve(null);
        } finally {
          checkingRef.current = false;
          setChecking(false);
        }
      }, 300); // 🎯 DEBOUNCE TIME: 300ms
    });
  }, []);

  return {
    checking,
    checkInn
  };
};

