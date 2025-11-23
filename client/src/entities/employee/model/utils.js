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
 */
export const getUniqueFilterValues = (employees) => {
  const positions = [...new Set(employees.map((e) => e.position?.name).filter(Boolean))];
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
  const citizenships = [...new Set(employees.map((e) => e.citizenship?.name).filter(Boolean))];

  return {
    positions: positions.sort(),
    departments: departments.sort(),
    counterparties: counterparties.sort(),
    citizenships: citizenships.sort(),
  };
};

/**
 * Получить приоритет статуса сотрудника для сортировки
 */
export const getStatusPriority = (record) => {
  if (record.statusSecure === 'block' || record.statusSecure === 'block_compl') return 1; // Заблокирован
  if (record.statusActive === 'fired') return 2; // Уволен
  if (record.statusActive === 'inactive') return 3; // Неактивный
  if (record.status === 'new') return 4; // Новый
  if (record.status === 'tb_passed') return 5; // Проведен ТБ
  if (record.status === 'processed') return 6; // Обработан
  return 7; // Остальные
};

