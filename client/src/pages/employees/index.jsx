import { useState, useMemo } from 'react';
import { Typography, App, Grid, Button } from 'antd';
import { PlusOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useEmployees, useEmployeeActions, filterEmployees, getUniqueFilterValues } from '@/entities/employee';
import { useDepartments } from '@/entities/department';
import { useSettings } from '@/entities/settings';
import { useAuthStore } from '@/store/authStore';
import { EmployeeTable, MobileEmployeeList } from '@/widgets/employee-table';
import { EmployeeSearchFilter } from '@/features/employee-search';
import { EmployeeActions } from '@/features/employee-actions';
import EmployeeFormModal from '@/components/Employees/EmployeeFormModal';
import EmployeeViewModal from '@/components/Employees/EmployeeViewModal';
import EmployeeViewDrawer from '@/components/Employees/EmployeeViewDrawer';
import EmployeeFilesModal from '@/components/Employees/EmployeeFilesModal';
import ApplicationRequestModal from '@/components/Employees/ApplicationRequestModal';
import ExportToExcelModal from '@/components/Employees/ExportToExcelModal';
import SecurityModal from '@/components/Employees/SecurityModal';

const { Title } = Typography;
const { useBreakpoint } = Grid;

/**
 * Страница управления сотрудниками
 * Оптимизирована для быстрой загрузки с параллельными запросами и мемоизацией
 * Адаптивный дизайн: таблица на десктопе, карточки на мобильных
 */
const EmployeesPage = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [filesEmployee, setFilesEmployee] = useState(null);

  const { user } = useAuthStore();

  // Параллельная загрузка всех данных для быстрого старта
  const { employees, loading: employeesLoading, refetch: refetchEmployees } = useEmployees();
  const { departments, loading: departmentsLoading } = useDepartments();
  const { defaultCounterpartyId, loading: settingsLoading } = useSettings();

  // Общий статус загрузки
  const loading = employeesLoading || departmentsLoading || settingsLoading;

  // Определяем права доступа
  const canExport = user?.counterpartyId === defaultCounterpartyId && user?.role !== 'user';
  
  // Определяем, может ли пользователь удалять сотрудника
  const canDeleteEmployee = (employee) => {
    if (user?.role === 'admin') return true;
    if (user?.role !== 'user') return false;
    
    // Пользователь контрагента по умолчанию - только свои созданные сотрудники
    if (user?.counterpartyId === defaultCounterpartyId) {
      return employee.createdBy === user?.id;
    }
    
    // Пользователь остальных контрагентов - может удалять сотрудников контрагента
    if (user?.counterpartyId !== defaultCounterpartyId) {
      return true;
    }
    
    return false;
  };

  // Actions для работы с сотрудниками
  const { createEmployee, updateEmployee, deleteEmployee, updateDepartment } =
    useEmployeeActions(refetchEmployees);

  // Мемоизированная фильтрация
  const filteredEmployees = useMemo(
    () => filterEmployees(employees, searchText, statusFilter),
    [employees, searchText, statusFilter]
  );

  // Мемоизированные уникальные значения для фильтров
  const uniqueFilters = useMemo(
    () => getUniqueFilterValues(filteredEmployees),
    [filteredEmployees]
  );

  // Handlers
  const handleAdd = () => {
    if (isMobile) {
      // На мобильных переходим на отдельную страницу
      navigate('/employees/add');
    } else {
      // На десктопе открываем модальное окно
      setEditingEmployee(null);
      setIsModalOpen(true);
    }
  };

  const handleEdit = (employee) => {
    if (isMobile) {
      // На мобильных переходим на отдельную страницу
      navigate(`/employees/edit/${employee.id}`);
    } else {
      // На десктопе открываем модальное окно
      setEditingEmployee(employee);
      setIsModalOpen(true);
    }
  };

  const handleView = (employee) => {
    if (isMobile) {
      // На мобильных открываем боковую панель
      setViewingEmployee(employee);
      setIsViewModalOpen(true);
    } else {
      // На десктопе открываем модальное окно
      setViewingEmployee(employee);
      setIsViewModalOpen(true);
    }
  };

  const handleViewFiles = (employee) => {
    setFilesEmployee(employee);
    setIsFilesModalOpen(true);
  };

  const handleCloseFilesModal = () => {
    setIsFilesModalOpen(false);
    setFilesEmployee(null);
  };

  const handleFilesUpdated = () => {
    // Обновляем таблицу при изменении файлов
    refetchEmployees();
  };

  const handleRequest = () => {
    if (isMobile) {
      // На мобильных переходим на отдельную страницу
      navigate('/employees/request');
    } else {
      // На десктопе открываем модальное окно
      setIsRequestModalOpen(true);
    }
  };

  const handleDelete = async (id) => {
    await deleteEmployee(id);
    refetchEmployees();
  };

  const handleDepartmentChange = async (employeeId, departmentId) => {
    await updateDepartment(employeeId, departmentId);
    refetchEmployees();
  };

  const handleFormSuccess = async (values) => {
    try {
      if (editingEmployee) {
        // Обновление существующего сотрудника
        const updated = await updateEmployee(editingEmployee.id, values);
        setEditingEmployee(updated);
      } else {
        // Создание нового сотрудника
        const newEmployee = await createEmployee(values);
        setEditingEmployee(newEmployee);
      }
      refetchEmployees();
    } catch (error) {
      // Ошибка уже обработана в хуке
      throw error;
    }
  };

  return (
    <div style={{ 
      height: '100%', // Занимает всю высоту Content
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden', // БЕЗ прокрутки на уровне страницы
      backgroundColor: '#fff'
    }}>
      {/* Заголовок с поиском и действиями */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          backgroundColor: '#fff',
          padding: '16px',
          borderBottom: '1px solid #f0f0f0',
          flexShrink: 0, // Не сжимается - всегда виден
          marginBottom: 0 // БЕЗ отступа снизу
        }}
      >
        <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>
          Сотрудники
        </Title>

        {/* На десктопе показываем поиск и действия */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <EmployeeSearchFilter 
              searchText={searchText} 
              onSearchChange={setSearchText}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
            />
            <EmployeeActions
              onAdd={handleAdd}
              onRequest={handleRequest}
              onSecurity={() => setIsSecurityModalOpen(true)}
              canExport={canExport}
            />
          </div>
        )}
      </div>

      {/* Поиск на мобильных - отдельной строкой */}
      {isMobile && (
        <div style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px 12px 16px', flexShrink: 0 }}>
          <EmployeeSearchFilter 
            searchText={searchText} 
            onSearchChange={setSearchText}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              size="large"
              style={{ flex: 1 }}
            >
              Добавить
            </Button>
            <Button
              type="primary"
              icon={<FileExcelOutlined />}
              onClick={handleRequest}
              size="large"
              style={{ flex: 1, background: '#52c41a', borderColor: '#52c41a' }}
            >
              Заявка
            </Button>
          </div>
        </div>
      )}

      {/* Таблица сотрудников на десктопе / Карточки на мобильных */}
      {isMobile ? (
        <MobileEmployeeList
          employees={filteredEmployees}
          loading={loading}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewFiles={handleViewFiles}
          canExport={canExport}
          canDeleteEmployee={canDeleteEmployee}
        />
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <EmployeeTable
            employees={filteredEmployees}
            departments={departments}
            loading={loading}
            onEdit={handleEdit}
            onView={handleView}
            onDelete={handleDelete}
            onViewFiles={handleViewFiles}
            onDepartmentChange={handleDepartmentChange}
            canExport={canExport}
            canDeleteEmployee={canDeleteEmployee}
            uniqueFilters={uniqueFilters}
          />
        </div>
      )}

      {/* Модальные окна - для десктопа */}
      {!isMobile && (
        <>
          <EmployeeFormModal
            visible={isModalOpen}
            employee={editingEmployee}
            onCancel={() => {
              setIsModalOpen(false);
              setEditingEmployee(null);
            }}
            onSuccess={handleFormSuccess}
          />

          <EmployeeViewModal
            visible={isViewModalOpen}
            employee={viewingEmployee}
            onCancel={() => setIsViewModalOpen(false)}
            onEdit={() => {
              setIsViewModalOpen(false);
              setEditingEmployee(viewingEmployee);
              setIsModalOpen(true);
            }}
          />
        </>
      )}

      {/* Боковая панель просмотра - только для мобильных */}
      {isMobile && (
        <EmployeeViewDrawer
          visible={isViewModalOpen}
          employee={viewingEmployee}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewingEmployee(null);
          }}
          onEdit={() => {
            setIsViewModalOpen(false);
            setEditingEmployee(viewingEmployee);
            navigate(`/employees/edit/${viewingEmployee.id}`);
            setViewingEmployee(null);
          }}
        />
      )}

      <EmployeeFilesModal
        visible={isFilesModalOpen}
        employeeId={filesEmployee?.id}
        employeeName={
          filesEmployee
            ? `${filesEmployee.lastName} ${filesEmployee.firstName} ${filesEmployee.middleName || ''}`
            : ''
        }
        onClose={handleCloseFilesModal}
        onFilesUpdated={handleFilesUpdated}
      />

      <ApplicationRequestModal
        visible={isRequestModalOpen}
        onCancel={() => {
          setIsRequestModalOpen(false);
          refetchEmployees();
        }}
        employees={employees}
      />

      <ExportToExcelModal
        visible={isExportModalOpen}
        onCancel={() => {
          setIsExportModalOpen(false);
          refetchEmployees();
        }}
      />

      <SecurityModal
        visible={isSecurityModalOpen}
        onCancel={() => setIsSecurityModalOpen(false)}
        onSuccess={() => refetchEmployees()}
      />
    </div>
  );
};

export default EmployeesPage;

