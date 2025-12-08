import { useState, useMemo } from 'react';
import { Typography, App, Grid, Button, Tooltip } from 'antd';
import { PlusOutlined, FileExcelOutlined, ClearOutlined, SyncOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useEmployees, useEmployeeActions, useCheckInn, getUniqueFilterValues } from '@/entities/employee';
import { employeeApi } from '@/entities/employee';
import { useDepartments } from '@/entities/department';
import { useSettings } from '@/entities/settings';
import { useAuthStore } from '@/store/authStore';
import { usePageTitle } from '@/hooks/usePageTitle';
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
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [tableFilters, setTableFilters] = useState({});
  const [resetTrigger, setResetTrigger] = useState(0);
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

  // Устанавливаем заголовок страницы для мобильной версии
  usePageTitle('Сотрудники', isMobile);

  // Загружаем ВСЕ сотрудников без фильтрации по статусам (activeOnly = false)
  // Прогрессивная загрузка: сначала первые 100, потом остальные в фоне
  const { 
    employees, 
    loading: employeesLoading, 
    backgroundLoading,
    totalCount,
    refetch: refetchEmployees 
  } = useEmployees(false);
  const { departments, loading: departmentsLoading } = useDepartments();
  const { defaultCounterpartyId, loading: settingsLoading } = useSettings();

  // Общий статус загрузки (только первоначальная загрузка)
  const loading = employeesLoading || departmentsLoading || settingsLoading;

  // Определяем права доступа
  const canExport = user?.counterpartyId === defaultCounterpartyId && user?.role !== 'user';
  
  // Определяем, может ли пользователь удалять сотрудника
  // Удаление доступно только администраторам
  const canDeleteEmployee = (employee) => {
    return user?.role === 'admin';
  };

  // Actions для работы с сотрудниками
  const { createEmployee, updateEmployee, deleteEmployee, updateDepartment } =
    useEmployeeActions(refetchEmployees);

  // Хук проверки ИНН
  const { checkInn } = useCheckInn();

  // Обработчик проверки ИНН с показом модального окна
  const handleCheckInn = async (innValue) => {
    try {
      const foundEmployee = await checkInn(innValue);
      if (foundEmployee) {
        const fullName = [foundEmployee.lastName, foundEmployee.firstName, foundEmployee.middleName]
          .filter(Boolean)
          .join(' ');
        
        modal.confirm({
          title: 'Сотрудник с таким ИНН уже существует',
          content: `Перейти к редактированию?\n\n${fullName}`,
          okText: 'ОК',
          cancelText: 'Отмена',
          onOk: () => {
            setIsModalOpen(false);
            setEditingEmployee(null);
            navigate(`/employees/edit/${foundEmployee.id}`);
          },
        });
      }
    } catch (error) {
      // Обработка ошибки 409 - сотрудник найден в другом контрагенте
      if (error.response?.status === 409) {
        modal.error({
          title: 'Ошибка',
          content: error.response?.data?.message || 'Сотрудник с таким ИНН уже существует. Обратитесь к администратору.',
          okText: 'ОК'
        });
      } else {
        console.error('Ошибка при проверке ИНН:', error);
      }
    }
  };

  // Мемоизированная фильтрация с учетом поиска и статуса
  const filteredEmployees = useMemo(
    () => {
      let filtered = employees;
      
      // Фильтр по статусу
      if (statusFilter) {
        filtered = filtered.filter((employee) => {
          // Находим статусы сотрудника (с поддержкой старых неправильных групп из импорта)
          const cardStatusMapping = employee.statusMappings?.find(m => {
            const group = m.statusGroup || m.status_group;
            return group === 'status_card' || group === 'card draft';
          });
          const mainStatusMapping = employee.statusMappings?.find(m => {
            const group = m.statusGroup || m.status_group;
            return group === 'status' || group === 'draft';
          });
          const activeStatusMapping = employee.statusMappings?.find(
            m => m.statusGroup === 'status_active' || m.status_group === 'status_active'
          );
          
          // Получаем основной статус (status_new, status_tb_passed, status_processed)
          const mainStatus = mainStatusMapping?.status?.name;
          
          // Проверяем статусы (черновик может быть в группе status_card, status или старых группах)
          const isDraft = cardStatusMapping?.status?.name === 'status_card_draft' || mainStatus === 'status_draft';
          const isProcessed = cardStatusMapping?.status?.name === 'status_card_processed';
          const isFired = activeStatusMapping?.status?.name === 'status_active_fired';
          const isInactive = activeStatusMapping?.status?.name === 'status_active_inactive';
          // Действующий = status_new или status_tb_passed или status_processed (аналогично десктопной таблице)
          const isActive = mainStatus === 'status_new' || mainStatus === 'status_tb_passed' || mainStatus === 'status_processed';
          
          if (statusFilter === 'draft') return isDraft;
          if (statusFilter === 'processed') return isProcessed;
          if (statusFilter === 'active') return isActive;
          if (statusFilter === 'fired') return isFired;
          if (statusFilter === 'inactive') return isInactive;
          return true;
        });
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
    },
    [employees, searchText, statusFilter]
  );

  // Мемоизированные уникальные значения для фильтров
  const uniqueFilters = useMemo(
    () => getUniqueFilterValues(filteredEmployees, tableFilters.counterparty),
    [filteredEmployees, tableFilters.counterparty]
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

  // Сброс фильтров таблицы
  const handleResetFilters = () => {
    setSearchText('');
    setStatusFilter(null);
    setTableFilters({});
    // Инкрементируем триггер для сброса фильтров в таблице
    setResetTrigger(prev => prev + 1);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0 }}>
          {/* Заголовок только на десктопе - на мобильных в Header */}
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <Title level={2} style={{ margin: 0 }}>
                Сотрудники
              </Title>
              {backgroundLoading && (
                <Tooltip title={`Загрузка данных... (${employees.length} из ${totalCount})`}>
                  <SyncOutlined spin style={{ color: '#1890ff', fontSize: 16 }} />
                </Tooltip>
              )}
            </div>
          )}

          {/* На десктопе показываем поиск и кнопку сброса рядом с заголовком */}
          {!isMobile && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0 }}>
              <div style={{ flex: 1, minWidth: 250 }}>
                <EmployeeSearchFilter 
                  searchText={searchText} 
                  onSearchChange={setSearchText}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                />
              </div>
              <Button
                type="text"
                danger
                icon={<ClearOutlined />}
                onClick={handleResetFilters}
                title="Сбросить все фильтры"
              >
                Сбросить
              </Button>
            </div>
          )}
        </div>

        {/* На десктопе показываем действия справа */}
        {!isMobile && (
          <EmployeeActions
            onAdd={handleAdd}
            onRequest={handleRequest}
            onSecurity={() => setIsSecurityModalOpen(true)}
            canExport={canExport}
          />
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
              Заявка Excel
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
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingRight: 15 }}>
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
            resetTrigger={resetTrigger}
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
            onCheckInn={handleCheckInn}
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
        userCounterpartyId={user?.counterpartyId}
        defaultCounterpartyId={defaultCounterpartyId}
        userId={user?.id}
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

