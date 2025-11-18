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
      
      if (!values.constructionSiteId || !values.counterpartyId) {
        setEmployees([]);
        setSelectedEmployees([]);
        return;
      }

      setLoading(true);

      // Получаем всех сотрудников
      const response = await employeeService.getAll();
      const allEmployees = response.data.employees || [];

      // Фильтруем сотрудников по условиям
      const filtered = allEmployees.filter((emp) => {
        const mapping = emp.employeeCounterpartyMappings?.[0];
        
        // Фильтр по объекту и контрагенту
        const matchesSite = mapping?.constructionSiteId === values.constructionSiteId;
        const matchesCounterparty = mapping?.counterpartyId === values.counterpartyId;
        
        if (!matchesSite || !matchesCounterparty) return false;

        // Фильтр по типу
        if (values.filterType === 'tb_passed') {
          return emp.status === 'tb_passed';
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
        const mapping = emp.employeeCounterpartyMappings?.[0];
        
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

      // Обновляем статусы сотрудников (с 'tb_passed' на 'processed')
      const employeesToUpdate = employeesToExport.filter(emp => emp.status === 'tb_passed');
      
      if (employeesToUpdate.length > 0) {
        await Promise.all(
          employeesToUpdate.map(emp =>
            employeeService.update(emp.id, { status: 'processed' })
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
                <Radio.Button value="all">Все сотрудники</Radio.Button>
                <Radio.Button value="tb_passed">Новые сотрудники (прошедшие ТБ)</Radio.Button>
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

