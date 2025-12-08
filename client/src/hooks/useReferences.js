import { useEffect } from 'react';
import { useReferencesStore } from '@/store/referencesStore';

/**
 * Хуки для работы с кэшированными справочниками
 * Автоматически загружают данные при монтировании компонента
 * Используют глобальный кэш (не делают повторных запросов если данные свежие)
 */

/**
 * Хук для работы с гражданствами
 * @param {boolean} autoLoad - автоматически загружать при монтировании (по умолчанию true)
 */
export const useCitizenships = (autoLoad = true) => {
  const { 
    citizenships, 
    citizenshipsLoading, 
    citizenshipsError, 
    fetchCitizenships,
    invalidateCitizenships 
  } = useReferencesStore();

  useEffect(() => {
    if (autoLoad) {
      fetchCitizenships();
    }
  }, [autoLoad]);

  return {
    citizenships: citizenships || [],
    loading: citizenshipsLoading,
    error: citizenshipsError,
    refetch: () => fetchCitizenships(true), // force reload
    invalidate: invalidateCitizenships,
  };
};

/**
 * Хук для работы с должностями
 * @param {boolean} autoLoad - автоматически загружать при монтировании (по умолчанию true)
 */
export const usePositions = (autoLoad = true) => {
  const { 
    positions, 
    positionsLoading, 
    positionsError, 
    fetchPositions,
    invalidatePositions 
  } = useReferencesStore();

  useEffect(() => {
    if (autoLoad) {
      fetchPositions();
    }
  }, [autoLoad]);

  return {
    positions: positions || [],
    loading: positionsLoading,
    error: positionsError,
    refetch: () => fetchPositions(true), // force reload
    invalidate: invalidatePositions,
  };
};

/**
 * Хук для работы с подразделениями
 * @param {boolean} autoLoad - автоматически загружать при монтировании (по умолчанию true)
 */
export const useDepartmentsReference = (autoLoad = true) => {
  const { 
    departments, 
    departmentsLoading, 
    departmentsError, 
    fetchDepartments,
    invalidateDepartments 
  } = useReferencesStore();

  useEffect(() => {
    if (autoLoad) {
      fetchDepartments();
    }
  }, [autoLoad]);

  return {
    departments: departments || [],
    loading: departmentsLoading,
    error: departmentsError,
    refetch: () => fetchDepartments(true), // force reload
    invalidate: invalidateDepartments,
  };
};

/**
 * Хук для работы с настройками
 * @param {boolean} autoLoad - автоматически загружать при монтировании (по умолчанию true)
 */
export const useSettingsReference = (autoLoad = true) => {
  const { 
    settings, 
    settingsLoading, 
    settingsError, 
    fetchSettings,
    invalidateSettings 
  } = useReferencesStore();

  useEffect(() => {
    if (autoLoad) {
      fetchSettings();
    }
  }, [autoLoad]);

  return {
    settings: settings || {},
    defaultCounterpartyId: settings?.defaultCounterpartyId,
    loading: settingsLoading,
    error: settingsError,
    refetch: () => fetchSettings(true), // force reload
    invalidate: invalidateSettings,
  };
};

/**
 * Хук для работы с объектами строительства
 * @param {number} counterpartyId - ID контрагента
 * @param {boolean} autoLoad - автоматически загружать при монтировании (по умолчанию true)
 */
export const useConstructionSitesReference = (counterpartyId, autoLoad = true) => {
  const { 
    constructionSites, 
    constructionSitesLoading, 
    constructionSitesError, 
    fetchConstructionSites,
    invalidateConstructionSites 
  } = useReferencesStore();

  useEffect(() => {
    if (autoLoad && counterpartyId) {
      fetchConstructionSites(counterpartyId);
    }
  }, [autoLoad, counterpartyId]);

  return {
    constructionSites: constructionSites || [],
    loading: constructionSitesLoading,
    error: constructionSitesError,
    refetch: () => fetchConstructionSites(counterpartyId, true), // force reload
    invalidate: invalidateConstructionSites,
  };
};

/**
 * Хук для загрузки всех справочников разом
 * Удобно для страниц, которые используют несколько справочников
 */
export const useAllReferences = () => {
  const {
    fetchCitizenships,
    fetchPositions,
    fetchDepartments,
    fetchSettings,
    invalidateAll,
    clearAll,
  } = useReferencesStore();

  const {
    citizenships,
    citizenshipsLoading,
  } = useCitizenships();

  const {
    positions,
    positionsLoading,
  } = usePositions();

  const {
    departments,
    departmentsLoading,
  } = useDepartmentsReference();

  const {
    settings,
    defaultCounterpartyId,
    settingsLoading,
  } = useSettingsReference();

  const loading = citizenshipsLoading || positionsLoading || departmentsLoading || settingsLoading;

  return {
    citizenships,
    positions,
    departments,
    settings,
    defaultCounterpartyId,
    loading,
    refetchAll: async () => {
      await Promise.all([
        fetchCitizenships(true),
        fetchPositions(true),
        fetchDepartments(true),
        fetchSettings(true),
      ]);
    },
    invalidateAll,
    clearAll,
  };
};

