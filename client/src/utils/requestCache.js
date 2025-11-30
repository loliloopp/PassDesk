/**
 * Утилита для дедубликации параллельных запросов
 * Предотвращает множественные одновременные запросы к одному endpoint'у
 */

const requestCache = new Map();

/**
 * Дедублицирует запросы по ключу
 * Если запрос с таким ключом уже выполняется - возвращает существующий Promise
 */
export const deduplicateRequest = async (key, requestFn) => {
  // Если запрос уже выполняется - возвращаем существующий Promise
  if (requestCache.has(key)) {
    console.log(`[Cache] Using cached request for: ${key}`);
    return requestCache.get(key);
  }

  console.log(`[Cache] Starting new request for: ${key}`);

  // Создаем новый Promise и кэшируем его
  const promise = requestFn()
    .then(result => {
      // Удаляем из кэша после успешного завершения
      requestCache.delete(key);
      console.log(`[Cache] Request completed: ${key}`);
      return result;
    })
    .catch(error => {
      // Удаляем из кэша при ошибке
      requestCache.delete(key);
      console.log(`[Cache] Request failed: ${key}`);
      throw error;
    });

  requestCache.set(key, promise);
  return promise;
};

/**
 * Очищает кэш запросов (для отладки)
 */
export const clearRequestCache = () => {
  requestCache.clear();
};

/**
 * Очищает кэш для конкретного ключа или по паттерну
 */
export const invalidateCache = (pattern) => {
  if (!pattern) {
    requestCache.clear();
    return;
  }

  // Если это точный ключ
  if (requestCache.has(pattern)) {
    requestCache.delete(pattern);
    console.log(`[Cache] Invalidated: ${pattern}`);
    return;
  }

  // Если это паттерн, удаляем все совпадающие ключи
  const keysToDelete = [];
  for (const key of requestCache.keys()) {
    if (key.includes(pattern)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach(key => {
    requestCache.delete(key);
    console.log(`[Cache] Invalidated: ${key}`);
  });
};

