import { useState, useMemo } from 'react';
import { Typography, App, Grid, Button } from 'antd';
import { PlusOutlined, FileExcelOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useEmployees, useEmployeeActions, getUniqueFilterValues } from '@/entities/employee';
import { employeeApi } from '@/entities/employee';
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
import EmployeeSitesModal from '@/components/Employees/EmployeeSitesModal';
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
  const [tableFilters, setTableFilters] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isSitesModalOpen, setIsSitesModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [filesEmployee, setFilesEmployee] = useState(null);
  const [sitesEmployee, setSitesEmployee] = useState(null);

  const { user } = useAuthStore();

  // Загружаем ВСЕ сотрудников без фильтрации по статусам (activeOnly = false)
  const { employees, loading: employeesLoading, refetch: refetchEmployees } = useEmployees(false);
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

  // Мемоизированная фильтрация (БЕЗ фильтра по статусам - только поиск)
  const filteredEmployees = useMemo(
    () => {
      let filtered = employees;
      
      // Фильтр по поисковому запросу (без фильтра по статусам)
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
    },
    [employees, searchText]
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

  const handleConstructionSitesEdit = (employee) => {
    setSitesEmployee(employee);
    setIsSitesModalOpen(true);
  };

  const handleCloseSitesModal = () => {
    setIsSitesModalOpen(false);
    setSitesEmployee(null);
  };

  const handleSitesUpdated = () => {
    // Обновляем таблицу при изменении объектов
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
        
        // Проверяем есть ли у сотрудника статусы с is_upload = true
        // Если есть - устанавливаем статус "Редактирован" с is_upload = true
        if (editingEmployee.statusMappings && editingEmployee.statusMappings.length > 0) {
          const hasUploadedStatus = editingEmployee.statusMappings.some(mapping => mapping.isUpload);
          
          if (hasUploadedStatus) {
            try {
              // Устанавливаем статус "Редактирован" с is_upload = true
              await employeeApi.setEditedStatus(editingEmployee.id, true);
            } catch (error) {
              console.warn('Error setting edited status:', error);
              // Не прерываем процесс сохранения если ошибка при установке статуса
            }
          }
        }
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
            onFiltersChange={setTableFilters}
            defaultCounterpartyId={defaultCounterpartyId}
            userCounterpartyId={user?.counterpartyId}
            onConstructionSitesEdit={handleConstructionSitesEdit}
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

      <EmployeeSitesModal
        visible={isSitesModalOpen}
        employee={sitesEmployee}
        onCancel={handleCloseSitesModal}
        onSuccess={handleSitesUpdated}
      />

      <ApplicationRequestModal
        visible={isRequestModalOpen}
        onCancel={() => {
          setIsRequestModalOpen(false);
          refetchEmployees();
        }}
        employees={filteredEmployees}
        tableFilters={tableFilters}
        userRole={user?.role}
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

