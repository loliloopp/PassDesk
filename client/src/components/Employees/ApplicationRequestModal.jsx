import { useState, useEffect, useMemo } from 'react';
import { Modal, Table, Checkbox, Space, Button, App, Select, Spin } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';
import { applicationService } from '../../services/applicationService';
import { constructionSiteService } from '../../services/constructionSiteService';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { formatSnils, formatKig, formatInn } from '../../utils/formatters';

const ApplicationRequestModal = ({ visible, onCancel, employees: allEmployees, tableFilters = {}, userCounterpartyId, defaultCounterpartyId }) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [allSelected, setAllSelected] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [includeFired, setIncludeFired] = useState(false);
  const [availableSites, setAvailableSites] = useState([]);

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
  }, [allEmployees, selectedSite, includeFired]);

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
        // constructionSiteId и passValidUntil теперь необязательны
      });

      // Фильтруем только выбранных сотрудников
      const employeesToExport = availableEmployees.filter(emp => selectedEmployees.includes(emp.id));

      // Формируем данные для Excel
      const excelData = employeesToExport.map((emp, index) => {
        return {
          '№': index + 1,
          'Ф.И.О.': `${emp.lastName} ${emp.firstName} ${emp.middleName || ''}`,
          'КИГ': formatKig(emp.kig),
          'Гражданство': emp.citizenship?.name || '-',
          'Дата рождения': emp.birthDate ? dayjs(emp.birthDate).format('DD.MM.YYYY') : '-',
          'СНИЛС': formatSnils(emp.snils),
          'Должность': emp.position?.name || '-',
          'ИНН сотрудника': formatInn(emp.inn),
        };
      });

      // Создаем Excel файл
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Устанавливаем ширину столбцов (в символах, где 1 символ ≈ 7px)
      worksheet['!cols'] = [
        { wch: 6 },    // A: 40px
        { wch: 43 },   // B: 300px
        { wch: 17 },   // C: 120px
        { wch: 17 },   // D: 120px
        { wch: 17 },   // E: 120px
        { wch: 17 },   // F: 120px
        { wch: 20 },   // G: 140px
        { wch: 17 },   // H: 120px
      ];
      
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
    </Modal>
  );
};

export default ApplicationRequestModal;

