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
  Badge,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  EyeOutlined,
  FileOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
} from '@ant-design/icons';
import { employeeService } from '../services/employeeService';
import { citizenshipService } from '../services/citizenshipService';
import EmployeeFormModal from '../components/Employees/EmployeeFormModal';
import EmployeeViewModal from '../components/Employees/EmployeeViewModal';
import EmployeeFilesModal from '../components/Employees/EmployeeFilesModal';
import dayjs from 'dayjs';

const { Title } = Typography;
const DATE_FORMAT = 'DD.MM.YYYY';

// CSS для чередующихся цветов строк
const tableStyles = `
  .table-row-light {
    background-color: #ffffff;
  }
  .table-row-dark {
    background-color: #f5f5f5;
  }
  .table-row-light:hover,
  .table-row-dark:hover {
    background-color: #e6f7ff !important;
  }
`;

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [citizenships, setCitizenships] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCitizenship, setSelectedCitizenship] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [filesEmployee, setFilesEmployee] = useState(null);

  useEffect(() => {
    fetchEmployees();
    fetchCitizenships();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await employeeService.getAll();
      const employees = response?.data?.employees || [];
      setEmployees(employees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    } finally {
      setLoading(false);
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

  const handleViewFiles = (employee) => {
    setFilesEmployee(employee);
    setIsFilesModalOpen(true);
  };

  const handleCloseFilesModal = () => {
    setIsFilesModalOpen(false);
    setFilesEmployee(null);
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
        // Обновление существующего сотрудника
        await employeeService.update(editingEmployee.id, values);
        message.success('Сотрудник обновлен');
        // Обновляем данные editingEmployee для продолжения редактирования
        const response = await employeeService.getById(editingEmployee.id);
        setEditingEmployee(response.data.data);
      } else {
        // Создание нового сотрудника
        const response = await employeeService.create(values);
        message.success('Сотрудник создан');
        // После создания переключаемся в режим редактирования
        const newEmployee = response.data.data;
        setEditingEmployee(newEmployee);
        message.info('Теперь вы можете продолжить заполнение данных сотрудника');
      }
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.errors?.map(e => e.message).join(', ') || 
                          'Ошибка при сохранении';
      message.error(errorMessage);
      // Пробрасываем ошибку дальше, чтобы форма не закрывалась
      throw error;
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
    
    const matchesCitizenship = !selectedCitizenship || employee.citizenshipId === selectedCitizenship;
    
    return matchesSearch && matchesCitizenship;
  });

  const columns = [
    {
      title: 'ФИО',
      key: 'fullName',
      render: (_, record) => (
        <span>
          {record.lastName} {record.firstName} {record.middleName || ''}
        </span>
      ),
      sorter: (a, b) => a.lastName.localeCompare(b.lastName),
    },
    {
      title: 'Должность',
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: 'Подразделение',
      key: 'department',
      render: (_, record) => {
        const mappings = record.employeeCounterpartyMappings || [];
        if (mappings.length === 0) return '-';
        const departmentName = mappings[0]?.department?.name;
        return departmentName || '-';
      },
    },
    {
      title: 'Гражданство',
      dataIndex: ['citizenship', 'name'],
      key: 'citizenship',
      render: (name) => name || '-',
    },
    {
      title: 'Заполнен',
      key: 'statusCard',
      width: 100,
      align: 'center',
      render: (_, record) => {
        // Проверяем, заполнены ли все обязательные поля
        const isCompleted = record.statusCard === 'completed';
        
        return (
          <Tooltip title={isCompleted ? 'Все обязательные поля заполнены' : 'Не все обязательные поля заполнены'}>
            {isCompleted ? (
              <CheckCircleFilled style={{ fontSize: 20, color: '#52c41a' }} />
            ) : (
              <CloseCircleFilled style={{ fontSize: 20, color: '#ff4d4f' }} />
            )}
          </Tooltip>
        );
      },
      filters: [
        { text: 'Заполнен', value: 'completed' },
        { text: 'Не заполнен', value: 'draft' },
      ],
      onFilter: (value, record) => record.statusCard === value,
    },
    {
      title: 'Файлы',
      key: 'files',
      width: 80,
      align: 'center',
      render: (_, record) => {
        const filesCount = record.filesCount || 0;
        return (
          <Tooltip title={filesCount > 0 ? `Просмотр файлов (${filesCount})` : 'Нет файлов'}>
            <Badge count={filesCount} showZero={false}>
              <Button
                type="text"
                icon={<FileOutlined />}
                onClick={() => handleViewFiles(record)}
                disabled={filesCount === 0}
                style={{ color: filesCount > 0 ? '#1890ff' : '#d9d9d9' }}
              />
            </Badge>
          </Tooltip>
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
      {/* Вставляем стили для чередующихся строк */}
      <style>{tableStyles}</style>
      
      {/* Заголовок с поиском и фильтром в одну строку */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 16, 
        flexWrap: 'wrap', 
        gap: 16 
      }}>
        <Title level={2} style={{ margin: 0 }}>
          Сотрудники
        </Title>
        
        <Space size="middle">
          <Input
            placeholder="Поиск по ФИО, должности, ИНН, СНИЛС..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 350 }}
            allowClear
          />
          <Select
            placeholder="Гражданство"
            allowClear
            value={selectedCitizenship}
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
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Добавить сотрудника
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={filteredEmployees}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ x: 1400 }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total}`,
        }}
        rowClassName={(record, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'}
      />

      <EmployeeFormModal
        visible={isModalOpen}
        employee={editingEmployee}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingEmployee(null); // Очищаем editingEmployee при закрытии
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

      <EmployeeFilesModal
        visible={isFilesModalOpen}
        employeeId={filesEmployee?.id}
        employeeName={filesEmployee ? `${filesEmployee.lastName} ${filesEmployee.firstName} ${filesEmployee.middleName || ''}` : ''}
        onClose={handleCloseFilesModal}
      />
    </div>
  );
};

export default EmployeesPage;
