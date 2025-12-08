/**
 * Утилиты для работы с сотрудниками
 */

/**
 * Фильтрация сотрудников по поисковому запросу и статусу
 * Статусы:
 * - 'new': фильтр по new и tb_passed
 * - 'draft': черновик
 * - 'processed': обработанные
 */
export const filterEmployees = (employees, searchText, statusFilter = null) => {
  let filtered = employees;

  // Фильтр по статусу
  if (statusFilter) {
    if (statusFilter === 'new') {
      filtered = filtered.filter(e => e.status === 'new' || e.status === 'tb_passed');
    } else if (statusFilter === 'draft') {
      filtered = filtered.filter(e => e.status === 'draft');
    } else if (statusFilter === 'processed') {
      filtered = filtered.filter(e => e.status === 'processed');
    }
  }

  // Фильтр по поисковому запросу
  if (!searchText) return filtered;

  const searchLower = searchText.toLowerCase();
  return filtered.filter((employee) => {
    return (
      employee.firstName?.toLowerCase().includes(searchLower) ||
      employee.lastName?.toLowerCase().includes(searchLower) ||
      employee.middleName?.toLowerCase().includes(searchLower) ||
      employee.position?.name?.toLowerCase().includes(searchLower) ||
      employee.inn?.toLowerCase().includes(searchLower) ||
      employee.snils?.toLowerCase().includes(searchLower)
    );
  });
};

/**
 * Получить полное ФИО сотрудника
 */
export const getEmployeeFullName = (employee) => {
  if (!employee) return '';
  return `${employee.lastName} ${employee.firstName} ${employee.middleName || ''}`.trim();
};

/**
 * Получить уникальные значения для фильтров таблицы
 * @param {Array} employees - массив сотрудников
 * @param {Array} selectedCounterparties - выбранные контрагенты для фильтрации ФИО
 */
export const getUniqueFilterValues = (employees, selectedCounterparties = []) => {
  // Фильтруем сотрудников по выбранным контрагентам если они выбраны
  let filteredForFullNames = employees;
  if (selectedCounterparties && selectedCounterparties.length > 0) {
    filteredForFullNames = employees.filter(emp => 
      emp.employeeCounterpartyMappings?.some(m => 
        selectedCounterparties.includes(m.counterparty?.name)
      )
    );
  }

  const positions = [...new Set(employees.map((e) => e.position?.name).filter(Boolean))];
  const fullNames = [
    ...new Set(
      filteredForFullNames
        .map((e) => `${e.lastName} ${e.firstName} ${e.middleName || ''}`.trim())
        .filter(Boolean)
    ),
  ];
  const departments = [
    ...new Set(
      employees
        .flatMap((e) => e.employeeCounterpartyMappings || [])
        .map((m) => m.department?.name)
        .filter(Boolean)
    ),
  ];
  const counterparties = [
    ...new Set(
      employees
        .flatMap((e) => e.employeeCounterpartyMappings || [])
        .map((m) => m.counterparty?.name)
        .filter(Boolean)
    ),
  ];
  const constructionSites = [
    ...new Set(
      employees
        .flatMap((e) => e.employeeCounterpartyMappings || [])
        .map((m) => m.constructionSite?.shortName || m.constructionSite?.name)
        .filter(Boolean)
    ),
  ];
  const citizenships = [...new Set(employees.map((e) => e.citizenship?.name).filter(Boolean))];

  return {
    positions: positions.sort(),
    fullNames: fullNames.sort(),
    departments: departments.sort(),
    counterparties: counterparties.sort(),
    constructionSites: constructionSites.sort(),
    citizenships: citizenships.sort(),
  };
};

/**
 * Получить приоритет статуса сотрудника для сортировки
 */
export const getStatusPriority = (record) => {
  // Функция с поддержкой альтернативных групп (для совместимости со старыми данными из импорта)
  const getStatusByGroup = (group, alternativeGroups = []) => {
    const groupsToCheck = [group, ...alternativeGroups];
    const mapping = record.statusMappings?.find(m => {
      const mappingGroup = m.statusGroup || m.status_group;
      return groupsToCheck.includes(mappingGroup);
    });
    return mapping?.status?.name;
  };

  const secureStatus = getStatusByGroup('status_secure');
  const activeStatus = getStatusByGroup('status_active');
  // Проверяем status_card и старую неправильную группу 'card draft'
  const cardStatus = getStatusByGroup('status_card', ['card draft']);
  // Проверяем status и старую неправильную группу 'draft'
  const mainStatus = getStatusByGroup('status', ['draft']);

  if (secureStatus === 'status_secure_block' || secureStatus === 'status_secure_block_compl') return 1; // Заблокирован
  if (activeStatus === 'status_active_fired' || activeStatus === 'status_active_fired_compl') return 2; // Уволен
  if (activeStatus === 'status_active_inactive') return 3; // Неактивный
  // Черновик может быть в группе status_card или status
  if (cardStatus === 'status_card_draft' || mainStatus === 'status_draft') return 4; // Черновик
  if (mainStatus === 'status_new') return 5; // Новый/Действующий
  if (mainStatus === 'status_tb_passed') return 6; // Проведен ТБ
  if (mainStatus === 'status_processed') return 7; // Обработан
  return 8; // Остальные
};

