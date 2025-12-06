import { useState, useEffect, useMemo } from 'react';
import { Modal, Table, Checkbox, Space, Button, App, Select, Spin } from 'antd';
import { FileExcelOutlined, SettingOutlined } from '@ant-design/icons';
import { applicationService } from '../../services/applicationService';
import { constructionSiteService } from '../../services/constructionSiteService';
import { counterpartyService } from '../../services/counterpartyService';
import { useExcelColumns, AVAILABLE_COLUMNS } from '../../hooks/useExcelColumns';
import ExcelColumnsModal from './ExcelColumnsModal';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { formatSnils, formatKig, formatInn } from '../../utils/formatters';

const ApplicationRequestModal = ({ visible, onCancel, employees: allEmployees, tableFilters = {}, userRole, userCounterpartyId, defaultCounterpartyId, userId }) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [counterpartiesLoading, setCounterpartiesLoading] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [allSelected, setAllSelected] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedCounterparty, setSelectedCounterparty] = useState(null);
  const [includeFired, setIncludeFired] = useState(false);
  const [availableSites, setAvailableSites] = useState([]);
  const [availableCounterparties, setAvailableCounterparties] = useState([]);
  const [counterpartySearchText, setCounterpartySearchText] = useState('');
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);

  const { columns: selectedColumns, toggleColumn, moveColumnUp, moveColumnDown, selectAll, deselectAll } = useExcelColumns();

  // Загружаем доступные объекты строительства
  useEffect(() => {
    if (visible) {
      setSitesLoading(true);
      
      // Для пользователя контрагента по умолчанию - все объекты
      // Для остальных - только назначенные объекты контрагента
      const isDefaultCounterparty = userCounterpartyId === defaultCounterpartyId;
      
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
        constructionSiteService.getCounterpartyObjects(userCounterpartyId)
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
    }
  }, [visible, userCounterpartyId, defaultCounterpartyId]);

  // Загружаем список контрагентов для admin
  useEffect(() => {
    if (visible && userRole === 'admin') {
      setCounterpartiesLoading(true);
      counterpartyService.getAll({ limit: 1000 })
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
  }, [visible, userRole]);

  // Функция для определения статуса сотрудника
  const getEmployeeStatus = (employee) => {
    const statusMapping = employee.statusMappings?.find(m => m.statusGroup === 'status_card' || m.status_group === 'status_card');
    const activeStatusMapping = employee.statusMappings?.find(m => m.statusGroup === 'status_active' || m.status_group === 'status_active');
    
    const cardStatus = statusMapping?.status?.name;
    const activeStatus = activeStatusMapping?.status?.name;
    
    return { cardStatus, activeStatus };
  };

  // Применяем фильтры
  const availableEmployees = useMemo(() => {
    let filtered = allEmployees;
    
    // Применяем логику доступа по ролям
    if (userRole === 'user') {
      const isDefaultCounterparty = userCounterpartyId === defaultCounterpartyId;
      
      if (isDefaultCounterparty) {
        // User контрагента default - только собственные сотрудники
        filtered = filtered.filter(emp => emp.createdBy === userId);
      }
      // Для user других контрагентов - показываем всех контрагента (уже отфильтровано на уровне allEmployees)
    } else if (userRole === 'admin') {
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
      const { cardStatus, activeStatus } = getEmployeeStatus(emp);
      
      // Исключаем черновики (status_card_draft)
      if (cardStatus === 'status_card_draft') return false;
      
      // Исключаем деактивированных (status_active_inactive)
      if (activeStatus === 'status_active_inactive') return false;
      
      // Исключаем заблокированных (status_active_blocked)
      if (activeStatus === 'status_active_blocked') return false;
      
      // Исключаем уволенных если не включена опция
      if (!includeFired && activeStatus === 'status_active_fired') return false;
      
      return true;
    });
    
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
  }, [allEmployees, selectedSite, includeFired, selectedCounterparty, userRole, userCounterpartyId, userId, defaultCounterpartyId]);

  // При открытии модала - выбираем всех доступных сотрудников
  useEffect(() => {
    if (visible && availableEmployees.length > 0) {
      setSelectedEmployees(availableEmployees.map(emp => emp.id));
      setAllSelected(true);
    }
  }, [visible, availableEmployees]);

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

  // Обработчик изменения чекбокса строки
  const handleRowSelection = {
    selectedRowKeys: selectedEmployees,
    onChange: (selectedRowKeys) => {
      setSelectedEmployees(selectedRowKeys);
      setAllSelected(selectedRowKeys.length === availableEmployees.length);
    },
  };

  // Функция для форматирования значения столбца
  const formatCellValue = (employee, columnKey) => {
    switch (columnKey) {
      case 'number':
        return '';  // Будет добавляться как индекс
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

  // Получить активные столбцы (без 'number', его добавим отдельно как индекс)
  const activeColumns = selectedColumns.filter(col => col.enabled && col.key !== 'number');
  const hasNumberColumn = selectedColumns.find(col => col.key === 'number')?.enabled;

  // Функция для создания заявки с выбранными столбцами
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
      onCancel();
    } catch (error) {
      console.error('Create request error:', error);
      message.error('Ошибка при создании заявки');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: '№', render: (_, __, index) => index + 1, width: 50 },
    {
      title: 'Ф.И.О.',
      render: (_, record) => `${record.lastName} ${record.firstName} ${record.middleName || ''}`,
      ellipsis: true,
    },
    { title: 'КИГ', dataIndex: 'kig', key: 'kig', ellipsis: true, render: (value) => formatKig(value) },
    { title: 'Гражданство', dataIndex: ['citizenship', 'name'], key: 'citizenship', ellipsis: true },
    {
      title: 'Дата рождения',
      dataIndex: 'birthDate',
      key: 'birthDate',
      render: (date) => (date ? dayjs(date).format('DD.MM.YYYY') : '-'),
      ellipsis: true,
    },
    { title: 'СНИЛС', dataIndex: 'snils', key: 'snils', ellipsis: true, render: (value) => formatSnils(value) },
    { title: 'Должность', dataIndex: ['position', 'name'], key: 'position', ellipsis: true },
    { title: 'ИНН сотрудника', dataIndex: 'inn', key: 'inn', ellipsis: true, render: (value) => formatInn(value) },
  ];

  return (
    <Modal
      title="Создать заявку"
      open={visible}
      onCancel={onCancel}
      width={1200}
      wrapClassName="full-height-modal"
      style={{ top: '5vh', height: '90vh', display: 'flex', flexDirection: 'column' }}
      styles={{ 
        body: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto' },
        content: { display: 'flex', flexDirection: 'column', height: '100%' }
      }}
      footer={
        <Space>
          <Button onClick={onCancel}>Отмена</Button>
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            onClick={handleCreateRequest}
            loading={loading}
            disabled={selectedEmployees.length === 0}
          >
            Создать ({selectedEmployees.length})
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Фильтры */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {/* Фильтр по контрагентам (только для admin) */}
          {userRole === 'admin' && (
            <div style={{ width: 250 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
                Контрагент
              </label>
              <Select
                placeholder="Все контрагенты"
                allowClear
                value={selectedCounterparty}
                onChange={setSelectedCounterparty}
                loading={counterpartiesLoading}
                showSearch
                popupMatchSelectWidth={false}
                classNames={{ popup: 'counterparty-select-popup' }}
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
          <div style={{ flex: 1, minWidth: 250 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              Объект строительства
            </label>
            <Select
              placeholder="Выберите объект (опционально)"
              allowClear
              value={selectedSite}
              onChange={setSelectedSite}
              loading={sitesLoading}
              options={availableSites.map(site => ({
                label: site.shortName || site.name,
                value: site.id
              }))}
            />
          </div>

          {/* Чекбокс уволенные */}
          <Checkbox
            checked={includeFired}
            onChange={(e) => setIncludeFired(e.target.checked)}
          >
            Включить уволенных
          </Checkbox>

          {/* Кнопка настройки столбцов */}
          <Button
            icon={<SettingOutlined />}
            onClick={() => setIsColumnsModalOpen(true)}
            title="Выбрать столбцы для экспорта"
          >
            Столбцы
          </Button>
        </div>

        {/* Чекбокс "Выделить все / Снять все" */}
        {availableEmployees.length > 0 && (
          <Checkbox
            checked={allSelected}
            onChange={handleSelectAll}
            indeterminate={selectedEmployees.length > 0 && selectedEmployees.length < availableEmployees.length}
          >
            Выделить все ({availableEmployees.length})
          </Checkbox>
        )}

        {/* Таблица сотрудников */}
        {availableEmployees.length > 0 && (
          <Table
            rowSelection={handleRowSelection}
            columns={columns}
            dataSource={availableEmployees}
            rowKey="id"
            loading={loading}
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: true }}
            scroll={{ x: 1200 }}
          />
        )}

        {availableEmployees.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
            Нет доступных сотрудников по выбранным фильтрам
          </div>
        )}
      </Space>

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
    </Modal>
  );
};

export default ApplicationRequestModal;

