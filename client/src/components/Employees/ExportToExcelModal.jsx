import { useState, useEffect } from 'react';
import { Modal, Select, Radio, Table, Checkbox, Space, Button, App } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';
import { employeeService } from '../../services/employeeService';
import { constructionSiteService } from '../../services/constructionSiteService';
import { counterpartyService } from '../../services/counterpartyService';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { formatSnils, formatKig, formatInn } from '../../utils/formatters';

const { Option } = Select;

const ExportToExcelModal = ({ visible, onCancel }) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [constructionSites, setConstructionSites] = useState([]);
  const [counterparties, setCounterparties] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [constructionSiteId, setConstructionSiteId] = useState(null);
  const [counterpartyId, setCounterpartyId] = useState(null);

  useEffect(() => {
    if (visible) {
      fetchConstructionSites();
      fetchCounterparties();
      // Сбрасываем фильтры при открытии
      setFilterType('all');
      setConstructionSiteId(null);
      setCounterpartyId(null);
      setEmployees([]);
      setSelectedEmployees([]);
    }
  }, [visible]);

  const fetchConstructionSites = async () => {
    try {
      const { data } = await constructionSiteService.getAll();
      setConstructionSites(data.data.constructionSites || []);
    } catch (error) {
      console.error('Error loading construction sites:', error);
    }
  };

  const fetchCounterparties = async () => {
    try {
      const { data } = await counterpartyService.getAll();
      setCounterparties(data.data.counterparties || []);
    } catch (error) {
      console.error('Error loading counterparties:', error);
    }
  };

  // Функция для фильтрации сотрудников
  useEffect(() => {
    const loadEmployees = async () => {
      if (!constructionSiteId || !counterpartyId) {
        setEmployees([]);
        setSelectedEmployees([]);
        return;
      }

      try {
        setLoading(true);

        // Получаем всех сотрудников
        const response = await employeeService.getAll();
        const allEmployees = response.data.employees || [];

        // Фильтруем сотрудников по условиям
        const filtered = allEmployees.filter((emp) => {
          const mappings = emp.employeeCounterpartyMappings || [];
          
          // Проверяем, есть ли хотя бы один маппинг, который соответствует фильтрам
          const hasMatchingMapping = mappings.some(mapping => {
            const siteMatch = mapping?.constructionSiteId === constructionSiteId;
            const counterpartyMatch = mapping?.counterpartyId === counterpartyId;
            
            return siteMatch && counterpartyMatch;
          });
          
          if (!hasMatchingMapping) return false;

          // Фильтр по типу
          if (filterType === 'tb_passed') {
            return emp.status === 'tb_passed';
          } else if (filterType === 'blocked') {
            // 'blocked': статусы fired, inactive, block
            return emp.statusActive === 'fired' || emp.statusActive === 'inactive' || emp.statusSecure === 'block';
          } else {
            // 'all': статусы 'tb_passed' или 'processed'
            return emp.status === 'tb_passed' || emp.status === 'processed';
          }
        });

        setEmployees(filtered);
        // По умолчанию все сотрудники выбраны
        setSelectedEmployees(filtered.map(emp => emp.id));
      } catch (error) {
        console.error('Error filtering employees:', error);
        message.error('Ошибка при загрузке списка сотрудников');
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, [constructionSiteId, counterpartyId, filterType]);

  // Экспорт в Excel
  const handleExport = async () => {
    if (selectedEmployees.length === 0) {
      message.warning('Выберите хотя бы одного сотрудника для экспорта');
      return;
    }

    try {
      setLoading(true);

      // Фильтруем только выбранных сотрудников
      const employeesToExport = employees.filter(emp => selectedEmployees.includes(emp.id));

      // Формируем данные для Excel (такая же структура, как в BiometricTable)
      const excelData = employeesToExport.map((emp, index) => {
        // Находим правильный маппинг по выбранному объекту и контрагенту
        const mapping = emp.employeeCounterpartyMappings?.find(m => 
          m.constructionSiteId === constructionSiteId &&
          m.counterpartyId === counterpartyId
        );
        
        return {
          '№': index + 1,
          'Ф.И.О.': `${emp.lastName} ${emp.firstName} ${emp.middleName || ''}`,
          'КИГ': formatKig(emp.kig),
          'Гражданство': emp.citizenship?.name || '-',
          'Дата рождения': emp.birthDate ? dayjs(emp.birthDate).format('DD.MM.YYYY') : '-',
          'СНИЛС': formatSnils(emp.snils),
          'Должность': emp.position?.name || '-',
          'ИНН сотрудника': formatInn(emp.inn),
          'Организация': mapping?.counterparty?.name || '-',
          'ИНН организации': mapping?.counterparty?.inn || '-',
          'КПП организации': mapping?.counterparty?.kpp || '-',
        };
      });

      // Создаем Excel файл
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Сотрудники');

      // Генерируем имя файла
      const fileName = `Сотрудники_${dayjs().format('DD-MM-YYYY_HH-mm')}.xlsx`;

      // Сохраняем файл
      XLSX.writeFile(workbook, fileName);

      // Обновляем статусы сотрудников в зависимости от типа
      const employeesToUpdate = [];
      
      if (filterType === 'tb_passed') {
        // Для типа "Новые сотрудники (прошедшие ТБ)": меняем status с 'tb_passed' на 'processed'
        employeesToUpdate.push(
          ...employeesToExport
            .filter(emp => emp.status === 'tb_passed')
            .map(emp => ({ id: emp.id, status: 'processed' }))
        );
      } else if (filterType === 'blocked') {
        // Для типа "Заблокированные": 
        // - fired -> fired_compl
        // - block -> block_compl
        // inactive остается без изменений
        employeesToUpdate.push(
          ...employeesToExport
            .filter(emp => emp.statusActive === 'fired')
            .map(emp => ({ id: emp.id, statusActive: 'fired_compl' })),
          ...employeesToExport
            .filter(emp => emp.statusSecure === 'block')
            .map(emp => ({ id: emp.id, statusSecure: 'block_compl' }))
        );
      }
      
      if (employeesToUpdate.length > 0) {
        await Promise.all(
          employeesToUpdate.map(({ id, ...updates }) =>
            employeeService.update(id, updates)
          )
        );
      }

      message.success(`Файл успешно сохранен: ${fileName}`);
      onCancel();
    } catch (error) {
      console.error('Export error:', error);
      message.error('Ошибка при экспорте в Excel');
    } finally {
      setLoading(false);
    }
  };

  // Обработчик изменения чекбокса строки
  const handleRowSelection = {
    selectedRowKeys: selectedEmployees,
    onChange: (selectedRowKeys) => {
      setSelectedEmployees(selectedRowKeys);
    },
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
    {
      title: 'Организация',
      key: 'organization',
      width: 200,
      render: (_, record) => {
        // Находим правильный маппинг по выбранному объекту и контрагенту
        const mapping = record.employeeCounterpartyMappings?.find(m => 
          m.constructionSiteId === constructionSiteId &&
          m.counterpartyId === counterpartyId
        );
        return mapping?.counterparty?.name || '-';
      },
    },
    {
      title: 'ИНН организации',
      key: 'organizationInn',
      width: 140,
      render: (_, record) => {
        // Находим правильный маппинг по выбранному объекту и контрагенту
        const mapping = record.employeeCounterpartyMappings?.find(m => 
          m.constructionSiteId === constructionSiteId &&
          m.counterpartyId === counterpartyId
        );
        return mapping?.counterparty?.inn || '-';
      },
    },
    {
      title: 'КПП организации',
      key: 'organizationKpp',
      width: 120,
      render: (_, record) => {
        // Находим правильный маппинг по выбранному объекту и контрагенту
        const mapping = record.employeeCounterpartyMappings?.find(m => 
          m.constructionSiteId === constructionSiteId &&
          m.counterpartyId === counterpartyId
        );
        return mapping?.counterparty?.kpp || '-';
      },
    },
  ];

  return (
    <Modal
      title="Экспорт сотрудников в Excel"
      open={visible}
      onCancel={onCancel}
      width={1400}
      footer={
        <Space>
          <Button onClick={onCancel}>Отмена</Button>
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            onClick={handleExport}
            loading={loading}
            disabled={selectedEmployees.length === 0}
          >
            Экспортировать ({selectedEmployees.length})
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Фильтры */}
        <Space size="middle" wrap>
          <div style={{ minWidth: 250 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Объект</label>
            <Select
              placeholder="Выберите объект"
              allowClear
              showSearch
              optionFilterProp="children"
              style={{ width: '100%' }}
              value={constructionSiteId}
              onChange={setConstructionSiteId}
            >
              {constructionSites.map((site) => (
                <Option key={site.id} value={site.id}>
                  {site.shortName || site.name}
                </Option>
              ))}
            </Select>
          </div>

          <div style={{ minWidth: 250 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Контрагент</label>
            <Select
              placeholder="Выберите контрагента"
              allowClear
              showSearch
              optionFilterProp="children"
              style={{ width: '100%' }}
              value={counterpartyId}
              onChange={setCounterpartyId}
            >
              {counterparties.map((cp) => (
                <Option key={cp.id} value={cp.id}>
                  {cp.name}
                </Option>
              ))}
            </Select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Тип сотрудников</label>
            <Radio.Group
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <Radio.Button value="all">Действующие сотрудники</Radio.Button>
              <Radio.Button value="tb_passed">Новые сотрудники (прошедшие ТБ)</Radio.Button>
              <Radio.Button value="blocked">Заблокированные</Radio.Button>
            </Radio.Group>
          </div>
        </Space>

          {/* Таблица предпросмотра */}
          {employees.length > 0 && (
            <Table
              rowSelection={handleRowSelection}
              columns={columns}
              dataSource={employees}
              rowKey="id"
              loading={loading}
              size="small"
              pagination={{ pageSize: 10, showSizeChanger: true }}
              scroll={{ x: 1600 }}
            />
          )}

        {employees.length === 0 && constructionSiteId && counterpartyId && !loading && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
            Нет сотрудников, соответствующих выбранным фильтрам
          </div>
        )}
      </Space>
    </Modal>
  );
};

export default ExportToExcelModal;

