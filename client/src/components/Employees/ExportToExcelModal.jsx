import { useState, useEffect } from 'react';
import { Modal, Form, Select, Radio, Table, Checkbox, Space, Button, message } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';
import { employeeService } from '../../services/employeeService';
import { constructionSiteService } from '../../services/constructionSiteService';
import { counterpartyService } from '../../services/counterpartyService';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

const { Option } = Select;

const ExportToExcelModal = ({ visible, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [constructionSites, setConstructionSites] = useState([]);
  const [counterparties, setCounterparties] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [filterType, setFilterType] = useState('all'); // 'all' или 'tb_passed'

  useEffect(() => {
    if (visible) {
      fetchConstructionSites();
      fetchCounterparties();
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
  const handleFilterChange = async () => {
    try {
      const values = form.getFieldsValue(['constructionSiteId', 'counterpartyId', 'filterType']);
      
      console.log('🔍 Filter values:', values);
      
      if (!values.constructionSiteId || !values.counterpartyId) {
        setEmployees([]);
        setSelectedEmployees([]);
        return;
      }

      setLoading(true);

      // Получаем всех сотрудников
      const response = await employeeService.getAll();
      const allEmployees = response.data.employees || [];
      
      console.log('📋 All employees count:', allEmployees.length);

      // Фильтруем сотрудников по условиям
      const filtered = allEmployees.filter((emp) => {
        const mappings = emp.employeeCounterpartyMappings || [];
        
        console.log(`👤 Employee ${emp.lastName}: mappings count = ${mappings.length}`);
        
        // Проверяем, есть ли хотя бы один маппинг, который соответствует фильтрам
        const hasMatchingMapping = mappings.some(mapping => {
          const siteMatch = mapping?.constructionSiteId === values.constructionSiteId;
          const counterpartyMatch = mapping?.counterpartyId === values.counterpartyId;
          
          console.log(`  Mapping: site ${mapping?.constructionSiteId} === ${values.constructionSiteId} ? ${siteMatch}, counterparty ${mapping?.counterpartyId} === ${values.counterpartyId} ? ${counterpartyMatch}`);
          
          return siteMatch && counterpartyMatch;
        });
        
        if (!hasMatchingMapping) return false;

        // Фильтр по типу
        if (values.filterType === 'tb_passed') {
          const match = emp.status === 'tb_passed';
          console.log(`  Status filter (tb_passed): ${emp.status} === 'tb_passed' ? ${match}`);
          return match;
        } else if (values.filterType === 'blocked') {
          // 'blocked': статусы fired, inactive, block
          const match = emp.statusActive === 'fired' || emp.statusActive === 'inactive' || emp.statusSecure === 'block';
          console.log(`  Status filter (blocked): statusActive=${emp.statusActive}, statusSecure=${emp.statusSecure}, match=${match}`);
          return match;
        } else {
          // 'all': статусы 'tb_passed' или 'processed'
          const match = emp.status === 'tb_passed' || emp.status === 'processed';
          console.log(`  Status filter (all): ${emp.status} in ['tb_passed', 'processed'] ? ${match}`);
          return match;
        }
      });
      
      console.log('✅ Filtered employees count:', filtered.length);

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
      
      // Получаем значения фильтров из формы
      const formValues = form.getFieldsValue();

      // Формируем данные для Excel (такая же структура, как в BiometricTable)
      const excelData = employeesToExport.map((emp, index) => {
        // Находим правильный маппинг по выбранному объекту и контрагенту
        const mapping = emp.employeeCounterpartyMappings?.find(m => 
          m.constructionSiteId === formValues.constructionSiteId &&
          m.counterpartyId === formValues.counterpartyId
        );
        
        return {
          '№': index + 1,
          'Ф.И.О.': `${emp.lastName} ${emp.firstName} ${emp.middleName || ''}`,
          'КИГ': emp.kig || '-',
          'Гражданство': emp.citizenship?.name || '-',
          'Дата рождения': emp.birthDate ? dayjs(emp.birthDate).format('DD.MM.YYYY') : '-',
          'СНИЛС': emp.snils || '-',
          'Должность': emp.position || '-',
          'ИНН сотрудника': emp.inn || '-',
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

      // Получаем тип фильтра
      const filterType = formValues.filterType;

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
    { title: 'КИГ', dataIndex: 'kig', key: 'kig', ellipsis: true },
    { title: 'Гражданство', dataIndex: ['citizenship', 'name'], key: 'citizenship', ellipsis: true },
    {
      title: 'Дата рождения',
      dataIndex: 'birthDate',
      key: 'birthDate',
      render: (date) => (date ? dayjs(date).format('DD.MM.YYYY') : '-'),
      ellipsis: true,
    },
    { title: 'СНИЛС', dataIndex: 'snils', key: 'snils', ellipsis: true },
    { title: 'Должность', dataIndex: 'position', key: 'position', ellipsis: true },
    { title: 'ИНН сотрудника', dataIndex: 'inn', key: 'inn', ellipsis: true },
    {
      title: 'Организация',
      key: 'organization',
      width: 200,
      render: (_, record) => record.employeeCounterpartyMappings?.[0]?.counterparty?.name || '-',
    },
    {
      title: 'ИНН организации',
      key: 'organizationInn',
      width: 140,
      render: (_, record) => record.employeeCounterpartyMappings?.[0]?.counterparty?.inn || '-',
    },
    {
      title: 'КПП организации',
      key: 'organizationKpp',
      width: 120,
      render: (_, record) => record.employeeCounterpartyMappings?.[0]?.counterparty?.kpp || '-',
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
      <Form form={form} layout="vertical" onFieldsChange={handleFilterChange}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* Фильтры */}
          <Space size="middle" wrap>
            <Form.Item name="constructionSiteId" label="Объект" style={{ marginBottom: 0, minWidth: 250 }}>
              <Select placeholder="Выберите объект" allowClear showSearch optionFilterProp="children">
                {constructionSites.map((site) => (
                  <Option key={site.id} value={site.id}>
                    {site.shortName || site.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="counterpartyId" label="Контрагент" style={{ marginBottom: 0, minWidth: 250 }}>
              <Select placeholder="Выберите контрагента" allowClear showSearch optionFilterProp="children">
                {counterparties.map((cp) => (
                  <Option key={cp.id} value={cp.id}>
                    {cp.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="filterType" label="Тип сотрудников" initialValue="all" style={{ marginBottom: 0 }}>
              <Radio.Group onChange={(e) => setFilterType(e.target.value)}>
                <Radio.Button value="all">Действующие сотрудники</Radio.Button>
                <Radio.Button value="tb_passed">Новые сотрудники (прошедшие ТБ)</Radio.Button>
                <Radio.Button value="blocked">Заблокированные</Radio.Button>
              </Radio.Group>
            </Form.Item>
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

          {employees.length === 0 && form.getFieldValue('constructionSiteId') && form.getFieldValue('counterpartyId') && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
              Нет сотрудников, соответствующих выбранным фильтрам
            </div>
          )}
        </Space>
      </Form>
    </Modal>
  );
};

export default ExportToExcelModal;

