import { useState, useMemo, useEffect } from 'react';
import { Typography, Button, Checkbox, Space, App, Spin, Empty, Input, Select } from 'antd';
import { ArrowLeftOutlined, FileExcelOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useEmployees } from '@/entities/employee';
import { useSettings } from '@/entities/settings';
import { useAuthStore } from '@/store/authStore';
import { useExcelColumns, AVAILABLE_COLUMNS } from '@/hooks/useExcelColumns';
import { applicationService } from '@/services/applicationService';
import { constructionSiteService } from '@/services/constructionSiteService';
import { counterpartyService } from '@/services/counterpartyService';
import ExcelColumnsModal from '@/components/Employees/ExcelColumnsModal';
import { getStatusPriority } from '@/entities/employee/model/utils';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { formatSnils, formatKig, formatInn } from '@/utils/formatters';

const { Title } = Typography;

const ApplicationRequestPage = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [counterpartiesLoading, setCounterpartiesLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [allSelected, setAllSelected] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedCounterparty, setSelectedCounterparty] = useState(null);
  const [includeFired, setIncludeFired] = useState(false);
  const [availableSites, setAvailableSites] = useState([]);
  const [availableCounterparties, setAvailableCounterparties] = useState([]);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);

  const { user } = useAuthStore();
  const { defaultCounterpartyId } = useSettings();
  const { columns: selectedColumns, toggleColumn, moveColumnUp, moveColumnDown, selectAll, deselectAll } = useExcelColumns();

  // Получаем список сотрудников
  const { employees, loading: employeesLoading, refetch: refetchEmployees } = useEmployees();

  // Загружаем доступные объекты строительства
  useEffect(() => {
    setSitesLoading(true);
    
    // Для пользователя контрагента по умолчанию - все объекты
    // Для остальных - только назначенные объекты контрагента
    const isDefaultCounterparty = user?.counterpartyId === defaultCounterpartyId;
    
    if (isDefaultCounterparty) {
      // Все объекты
      constructionSiteService.getAll()
        .then(response => {
          const rawSites = response?.data?.data?.constructionSites || response?.data?.constructionSites || [];
          const sites = Array.isArray(rawSites) ? rawSites : [];
          setAvailableSites(sites);
        })
        .catch(error => {
          console.error('Error loading construction sites:', error);
          setAvailableSites([]);
        })
        .finally(() => setSitesLoading(false));
    } else {
      // Объекты контрагента
      constructionSiteService.getCounterpartyObjects(user?.counterpartyId)
        .then(response => {
          const rawSites = response?.data?.data?.constructionSites || response?.data?.constructionSites || [];
          const sites = Array.isArray(rawSites) ? rawSites : [];
          setAvailableSites(sites);
        })
        .catch(error => {
          console.error('Error loading counterparty construction sites:', error);
          setAvailableSites([]);
        })
        .finally(() => setSitesLoading(false));
    }
  }, [user?.counterpartyId, defaultCounterpartyId]);

  // Загружаем список контрагентов для admin
  useEffect(() => {
    if (user?.role === 'admin') {
      setCounterpartiesLoading(true);
      counterpartyService.getAll({ limit: 10000, page: 1 })
        .then(response => {
          const rawCounterparties = response?.data?.data?.counterparties || response?.data?.counterparties || [];
          const counterparties = Array.isArray(rawCounterparties) ? rawCounterparties : [];
          setAvailableCounterparties(counterparties);
        })
        .catch(error => {
          console.error('Error loading counterparties:', error);
          setAvailableCounterparties([]);
        })
        .finally(() => setCounterpartiesLoading(false));
    }
  }, [user?.role]);

  // Фильтруем сотрудников
  const availableEmployees = useMemo(() => {
    let filtered = employees;
    
    // Применяем логику доступа по ролям
    if (user?.role === 'user') {
      const isDefaultCounterparty = user?.counterpartyId === defaultCounterpartyId;
      
      if (isDefaultCounterparty) {
        // User контрагента default - только собственные сотрудники
        filtered = filtered.filter(emp => emp.createdBy === user?.id);
      }
      // Для user других контрагентов - показываем всех контрагента (уже отфильтровано на уровне allEmployees)
    } else if (user?.role === 'admin') {
      // Admin видит всех, применяем фильтр по контрагенту если выбран
      if (selectedCounterparty) {
        filtered = filtered.filter(emp => {
          const counterpartyId = emp.employeeCounterpartyMappings?.[0]?.counterpartyId;
          return counterpartyId === selectedCounterparty;
        });
      }
    }
    
    // Исключаем черновики, деактивированных, заблокированных
    filtered = filtered.filter(emp => {
      const priority = getStatusPriority(emp);
      
      // Приоритеты: 1-blocked, 2-fired, 3-inactive, 4-draft, 5-new, 6-tb_passed, 7-processed, 8-other
      // Исключаем: заблокированных (1), деактивированных (3)
      if (priority === 1) return false; // status_secure_block
      if (priority === 3) return false; // status_active_inactive
      
      // Для черновиков используем statusCard из ответа сервера (уже пересчитан с учетом настроек контрагента)
      if (emp.statusCard === 'draft') return false;
      
      // Исключаем уволенных если не включена опция
      if (!includeFired && priority === 2) return false; // status_active_fired
      
      return true;
    });
    
    // Применяем поиск если есть
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter((employee) => {
        return (
          employee.firstName?.toLowerCase().includes(searchLower) ||
          employee.lastName?.toLowerCase().includes(searchLower) ||
          employee.middleName?.toLowerCase().includes(searchLower) ||
          employee.position?.name?.toLowerCase().includes(searchLower) ||
          employee.inn?.toLowerCase().includes(searchLower) ||
          employee.snils?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    // Фильтр по объекту строительства
    if (selectedSite) {
      filtered = filtered.filter(emp => {
        const siteNames = emp.employeeCounterpartyMappings
          ?.filter(m => m.constructionSite)
          .map(m => m.constructionSite?.id) || [];
        return siteNames.includes(selectedSite);
      });
    }
    
    return filtered;
  }, [employees, searchText, selectedSite, includeFired, selectedCounterparty, user?.role, user?.counterpartyId, user?.id, defaultCounterpartyId]);

  // Инициализируем выбор при загрузке
  useEffect(() => {
    if (availableEmployees.length > 0 && selectedEmployees.length === 0) {
      const allIds = availableEmployees.map(emp => emp.id);
      setSelectedEmployees(allIds);
      setAllSelected(true);
    }
  }, [availableEmployees]);

  // Обработчик выбора/снятия всех
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedEmployees(availableEmployees.map(emp => emp.id));
      setAllSelected(true);
    } else {
      setSelectedEmployees([]);
      setAllSelected(false);
    }
  };

  // Обработчик выбора отдельного сотрудника
  const handleEmployeeToggle = (employeeId) => {
    const isSelected = selectedEmployees.includes(employeeId);
    let newSelected;
    
    if (isSelected) {
      newSelected = selectedEmployees.filter(id => id !== employeeId);
    } else {
      newSelected = [...selectedEmployees, employeeId];
    }
    
    setSelectedEmployees(newSelected);
    setAllSelected(newSelected.length === availableEmployees.length);
  };

  // Функция для форматирования значения столбца
  const formatCellValue = (employee, columnKey) => {
    switch (columnKey) {
      case 'number':
        return '';
      case 'lastName':
        return employee.lastName || '-';
      case 'firstName':
        return employee.firstName || '-';
      case 'middleName':
        return employee.middleName || '-';
      case 'kig':
        return formatKig(employee.kig) || '-';
      case 'citizenship':
        return employee.citizenship?.name || '-';
      case 'birthDate':
        return employee.birthDate ? dayjs(employee.birthDate).format('DD.MM.YYYY') : '-';
      case 'snils':
        return formatSnils(employee.snils) || '-';
      case 'position':
        return employee.position?.name || '-';
      case 'inn':
        return formatInn(employee.inn) || '-';
      case 'passport':
        return employee.passportNumber || '-';
      case 'passportDate':
        return employee.passportDate ? dayjs(employee.passportDate).format('DD.MM.YYYY') : '-';
      case 'passportIssuer':
        return employee.passportIssuer || '-';
      case 'registrationAddress':
        return employee.registrationAddress || '-';
      case 'phone':
        return employee.phone || '-';
      case 'department':
        const deptNames = employee.employeeCounterpartyMappings?.map(m => m.department?.name) || [];
        return deptNames.join(', ') || '-';
      case 'counterparty':
        const counterpartyName = employee.employeeCounterpartyMappings?.[0]?.counterparty?.name;
        return counterpartyName || '-';
      default:
        return '-';
    }
  };

  // Получить активные столбцы
  const activeColumns = selectedColumns.filter(col => col.enabled && col.key !== 'number');
  const hasNumberColumn = selectedColumns.find(col => col.key === 'number')?.enabled;

  // Создание и экспорт Excel файла
  const handleCreateRequest = async () => {
    if (selectedEmployees.length === 0) {
      message.warning('Выберите хотя бы одного сотрудника для заявки');
      return;
    }

    try {
      setLoading(true);

      // Создаем заявку в БД
      await applicationService.create({
        employeeIds: selectedEmployees,
      });

      // Фильтруем только выбранных сотрудников
      const employeesToExport = availableEmployees.filter(emp => selectedEmployees.includes(emp.id));

      // Формируем данные для Excel с учетом выбранных столбцов
      const excelData = employeesToExport.map((emp, index) => {
        const row = {};
        
        // Добавляем номер строки если выбран
        if (hasNumberColumn) {
          row['№'] = index + 1;
        }

        // Добавляем остальные столбцы
        activeColumns.forEach(col => {
          row[col.label] = formatCellValue(emp, col.key);
        });

        return row;
      });

      // Создаем Excel файл
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Устанавливаем ширину столбцов
      const colWidths = [];
      if (hasNumberColumn) colWidths.push({ wch: 6 });
      activeColumns.forEach(() => colWidths.push({ wch: 20 }));
      worksheet['!cols'] = colWidths;
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Заявка');

      // Генерируем имя файла
      const fileName = `Заявка_${dayjs().format('DD-MM-YYYY_HH-mm')}.xlsx`;

      // Сохраняем файл
      XLSX.writeFile(workbook, fileName);

      // Статусы обновляются на сервере автоматически при создании заявки
      message.success(`Заявка создана и файл сохранен: ${fileName}`);
      
      // Обновляем данные и возвращаемся
      await refetchEmployees();
      navigate('/employees');
    } catch (error) {
      console.error('Create request error:', error);
      message.error('Ошибка при создании заявки');
    } finally {
      setLoading(false);
    }
  };

  const isLoading = employeesLoading || loading;

  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#fff',
      overflow: 'hidden'
    }}>
      {/* Заголовок */}
      <div style={{ 
        padding: '16px', 
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/employees')}
            size="large"
          />
          <Title level={3} style={{ margin: 0 }}>Создать заявку</Title>
        </div>
        
        {/* Поиск */}
        <Input
          placeholder="Поиск по ФИО, должности, ИНН, СНИЛС..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
        
        {/* Фильтры */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Фильтр по контрагентам (только для admin) */}
          {user?.role === 'admin' && (
            <div>
              <Select
                placeholder="Все контрагенты"
                allowClear
                value={selectedCounterparty}
                onChange={setSelectedCounterparty}
                loading={counterpartiesLoading}
                showSearch
                filterOption={(input, option) => {
                  const text = input.toLowerCase();
                  return (
                    option?.label?.toLowerCase().includes(text) ||
                    option?.children?.toLowerCase().includes(text)
                  );
                }}
                options={availableCounterparties.map(counterparty => ({
                  label: `${counterparty.name} (ИНН: ${counterparty.inn || '-'})`,
                  value: counterparty.id,
                  children: counterparty.name
                }))}
                style={{ width: '100%' }}
              />
            </div>
          )}

          {/* Фильтр по объекту строительства */}
          <Select
            placeholder="Объект строительства (опционально)"
            allowClear
            value={selectedSite}
            onChange={setSelectedSite}
            loading={sitesLoading}
            options={availableSites.map(site => ({
              label: site.shortName || site.name,
              value: site.id
            }))}
          />

          {/* Чекбокс уволенные + Кнопка столбцов */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Checkbox
              checked={includeFired}
              onChange={(e) => setIncludeFired(e.target.checked)}
            >
              Включить уволенных
            </Checkbox>
            
            <Button
              icon={<SettingOutlined />}
              onClick={() => setIsColumnsModalOpen(true)}
              size="small"
              title="Выбрать столбцы для экспорта"
            >
              Столбцы
            </Button>
          </div>
        </div>
      </div>

      {/* Контент */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px', paddingBottom: '100px' }}>
        <Spin spinning={isLoading}>
          {availableEmployees.length > 0 ? (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* Чекбокс "Выделить все / Снять все" */}
              <Checkbox
                checked={allSelected}
                onChange={handleSelectAll}
                indeterminate={selectedEmployees.length > 0 && selectedEmployees.length < availableEmployees.length}
              >
                <strong>Выделить все ({availableEmployees.length})</strong>
              </Checkbox>

              {/* Список сотрудников */}
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {availableEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    style={{
                      padding: '12px',
                      border: '1px solid #d9d9d9',
                      borderRadius: '4px',
                      background: selectedEmployees.includes(employee.id) ? '#f6f8fb' : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                    onClick={() => handleEmployeeToggle(employee.id)}
                  >
                    <Checkbox
                      checked={selectedEmployees.includes(employee.id)}
                      onChange={() => handleEmployeeToggle(employee.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ marginRight: 12 }}
                    />
                    <span style={{ fontWeight: 500 }}>
                      {employee.lastName} {employee.firstName} {employee.middleName || ''}
                    </span>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: 4 }}>
                      {employee.position?.name && <span>{employee.position.name}</span>}
                      {employee.kig && <span> • КИГ: {formatKig(employee.kig)}</span>}
                    </div>
                  </div>
                ))}
              </Space>
            </Space>
          ) : (
            <Empty
              description="Нет доступных сотрудников по выбранным фильтрам"
              style={{ marginTop: '40px' }}
            />
          )}
        </Spin>
      </div>

      {/* Кнопки действий - закреплены внизу */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #f0f0f0',
        display: 'flex',
        gap: 12,
        background: '#fff',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        maxWidth: '100vw'
      }}>
        <Button 
          onClick={() => navigate('/employees')}
          style={{ flex: 1 }}
        >
          Отмена
        </Button>
        <Button
          type="primary"
          icon={<FileExcelOutlined />}
          onClick={handleCreateRequest}
          loading={isLoading}
          disabled={selectedEmployees.length === 0 || availableEmployees.length === 0}
          style={{ flex: 1, background: '#52c41a', borderColor: '#52c41a' }}
        >
          Создать ({selectedEmployees.length})
        </Button>
      </div>

      {/* Модальное окно для выбора столбцов */}
      <ExcelColumnsModal
        visible={isColumnsModalOpen}
        onCancel={() => setIsColumnsModalOpen(false)}
        columns={selectedColumns}
        toggleColumn={toggleColumn}
        moveColumnUp={moveColumnUp}
        moveColumnDown={moveColumnDown}
        selectAll={selectAll}
        deselectAll={deselectAll}
      />
    </div>
  );
};

export default ApplicationRequestPage;

