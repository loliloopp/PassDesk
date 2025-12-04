// Public API для employee entity
export { employeeApi } from './api/employeeApi';
export { useEmployees, useEmployeeActions } from './model/hooks';
export { useCheckInn } from './model/useCheckInn';
export {
  filterEmployees,
  getEmployeeFullName,
  getUniqueFilterValues,
  getStatusPriority,
} from './model/utils';

