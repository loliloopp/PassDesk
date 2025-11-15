import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Typography,
  Tag,
  Tooltip,
  Modal,
  message,
  Popconfirm,
  Select,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { employeeService } from '../services/employeeService';
import { counterpartyService } from '../services/counterpartyService';
import { citizenshipService } from '../services/citizenshipService';
import EmployeeFormModal from '../components/Employees/EmployeeFormModal';
import EmployeeViewModal from '../components/Employees/EmployeeViewModal';
import dayjs from 'dayjs';

const { Title } = Typography;
const DATE_FORMAT = 'DD.MM.YYYY';

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [counterparties, setCounterparties] = useState([]);
  const [citizenships, setCitizenships] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCounterparty, setSelectedCounterparty] = useState(null);
  const [selectedCitizenship, setSelectedCitizenship] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);

  useEffect(() => {
    fetchEmployees();
    fetchCounterparties();
    fetchCitizenships();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      console.log('=== FETCHING EMPLOYEES ===');
      const response = await employeeService.getAll();
      console.log('Full response:', response);
      console.log('response.data:', response?.data);
      
      // Правильный путь: response.data.employees (не response.data.data.employees!)
      const employees = response?.data?.employees || [];
      console.log('Extracted employees:', employees);
      console.log('Employees count:', employees.length);
      
      setEmployees(employees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCounterparties = async () => {
    try {
      const { data } = await counterpartyService.getAll({ limit: 100 });
      setCounterparties(data.data.counterparties || []);
    } catch (error) {
      console.error('Error loading counterparties:', error);
    }
  };

  const fetchCitizenships = async () => {
    try {
      const { data } = await citizenshipService.getAll();
      setCitizenships(data.data.citizenships || []);
    } catch (error) {
      console.error('Error loading citizenships:', error);
    }
  };

  const handleAdd = () => {
    setEditingEmployee(null);
    setIsModalOpen(true);
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const handleView = (employee) => {
    setViewingEmployee(employee);
    setIsViewModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await employeeService.delete(id);
      message.success('Сотрудник удален');
      fetchEmployees();
    } catch (error) {
      message.error('Ошибка при удалении сотрудника');
    }
  };

  const handleFormSuccess = async (values) => {
    try {
      if (editingEmployee) {
        await employeeService.update(editingEmployee.id, values);
        message.success('Сотрудник обновлен');
      } else {
        await employeeService.create(values);
        message.success('Сотрудник создан');
      }
      setIsModalOpen(false);
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.map(e => e.message).join(', ') || 
                          'Ошибка при сохранении';
      message.error(errorMessage);
    }
  };

  const filteredEmployees = employees.filter((employee) => {
    const searchLower = searchText.toLowerCase();
    const matchesSearch = !searchText || (
      employee.firstName?.toLowerCase().includes(searchLower) ||
      employee.lastName?.toLowerCase().includes(searchLower) ||
      employee.middleName?.toLowerCase().includes(searchLower) ||
      employee.position?.toLowerCase().includes(searchLower) ||
      employee.inn?.toLowerCase().includes(searchLower) ||
      employee.snils?.toLowerCase().includes(searchLower)
    );
    
    const matchesCounterparty = !selectedCounterparty || employee.counterpartyId === selectedCounterparty;
    const matchesCitizenship = !selectedCitizenship || employee.citizenshipId === selectedCitizenship;
    
    return matchesSearch && matchesCounterparty && matchesCitizenship;
  });

  const columns = [
    {
      title: 'ФИО',
      key: 'fullName',
      render: (_, record) => (
        <Space>
          <UserOutlined style={{ color: '#2563eb' }} />
          <span>
            {record.lastName} {record.firstName} {record.middleName || ''}
          </span>
        </Space>
      ),
      sorter: (a, b) => a.lastName.localeCompare(b.lastName),
    },
    {
      title: 'Должность',
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: 'Контрагент',
      dataIndex: ['counterparty', 'name'],
      key: 'counterparty',
      render: (name) => name || '-',
    },
    {
      title: 'Гражданство',
      dataIndex: ['citizenship', 'name'],
      key: 'citizenship',
      render: (name) => name || '-',
    },
    {
      title: 'Документы',
      key: 'documents',
      width: 140,
      render: (_, record) => {
        const documentFields = [
          { field: 'birthDate', label: 'Дата рождения' },
          { field: 'passportNumber', label: '№ паспорта' },
          { field: 'passportDate', label: 'Дата выдачи паспорта' },
          { field: 'passportIssuer', label: 'Кем выдан паспорт' },
          { field: 'registrationAddress', label: 'Адрес регистрации' },
          { field: 'patentNumber', label: 'Номер патента' },
          { field: 'patentIssueDate', label: 'Дата выдачи патента' },
          { field: 'blankNumber', label: 'Номер бланка' },
          { field: 'inn', label: 'ИНН' },
          { field: 'snils', label: 'СНИЛС' },
          { field: 'kig', label: 'КИГ' },
        ];
        
        return (
          <Space size={4} wrap style={{ maxWidth: 120 }}>
            {documentFields.map(({ field, label }) => (
              <Tooltip key={field} title={label}>
                <div style={{
                  width: 16,
                  height: 16,
                  backgroundColor: record[field] ? '#52c41a' : '#ff4d4f',
                  borderRadius: 2,
                }} />
              </Tooltip>
            ))}
          </Space>
        );
      },
    },
    {
      title: 'Статус',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Активен' : 'Неактивен'}
        </Tag>
      ),
      filters: [
        { text: 'Активен', value: true },
        { text: 'Неактивен', value: false },
      ],
      onFilter: (value, record) => record.isActive === value,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Просмотр">
            <Button type="text" icon={<EyeOutlined />} onClick={() => handleView(record)} />
          </Tooltip>
          <Tooltip title="Редактировать">
            <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Tooltip title="Удалить">
            <Popconfirm
              title="Удалить сотрудника?"
              description="Это действие нельзя отменить."
              onConfirm={() => handleDelete(record.id)}
              okText="Удалить"
              okType="danger"
              cancelText="Отмена"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <Title level={2} style={{ margin: 0 }}>
          Сотрудники
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Добавить сотрудника
        </Button>
      </div>

      <Space style={{ marginBottom: 16, width: '100%' }} direction="vertical">
        <Input
          placeholder="Поиск по ФИО, должности, ИНН, СНИЛС..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          size="large"
          style={{ maxWidth: 500 }}
        />
        <Space size="middle">
          <Select
            placeholder="Контрагент"
            allowClear
            onChange={setSelectedCounterparty}
            style={{ width: 250 }}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
          >
            {counterparties.map((c) => (
              <Select.Option key={c.id} value={c.id}>
                {c.name}
              </Select.Option>
            ))}
          </Select>
          <Select
            placeholder="Гражданство"
            allowClear
            onChange={setSelectedCitizenship}
            style={{ width: 200 }}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
          >
            {citizenships.map((c) => (
              <Select.Option key={c.id} value={c.id}>
                {c.name}
              </Select.Option>
            ))}
          </Select>
        </Space>
      </Space>

      <Table
        columns={columns}
        dataSource={filteredEmployees}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total}`,
        }}
      />

      <EmployeeFormModal
        visible={isModalOpen}
        employee={editingEmployee}
        onCancel={() => setIsModalOpen(false)}
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
    </div>
  );
};

export default EmployeesPage;
