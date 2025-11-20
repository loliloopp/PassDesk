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
  FileOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  FileExcelOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { employeeService } from '../services/employeeService';
import { departmentService } from '../services/departmentService';
import settingsService from '../services/settingsService';
import { useAuthStore } from '../store/authStore';
import EmployeeFormModal from '../components/Employees/EmployeeFormModal';
import EmployeeViewModal from '../components/Employees/EmployeeViewModal';
import EmployeeFilesModal from '../components/Employees/EmployeeFilesModal';
import ExportToExcelModal from '../components/Employees/ExportToExcelModal';
import SecurityModal from '../components/Employees/SecurityModal';
import dayjs from 'dayjs';

const { Title } = Typography;
const DATE_FORMAT = 'DD.MM.YYYY';

// CSS для чередующихся цветов строк и переноса текста в Select
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
  
  /* Перенос текста в Select для столбца Подразделение */
  .department-select .ant-select-selection-item {
    white-space: normal !important;
    word-break: keep-all !important;
    overflow-wrap: break-word !important;
    line-height: 1.4 !important;
    height: auto !important;
  }
  
  .department-select .ant-select-selector {
    height: auto !important;
    padding: 4px 11px !important;
  }
`;

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [filesEmployee, setFilesEmployee] = useState(null);
  const [defaultCounterpartyId, setDefaultCounterpartyId] = useState(null);
  const { user } = useAuthStore();

  // Определяем, может ли текущий пользователь видеть кнопку экспорта
  const canExport = user?.counterpartyId === defaultCounterpartyId;

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchDefaultCounterparty();
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

  const fetchDepartments = async () => {
    try {
      const response = await departmentService.getAll();
      setDepartments(response.data.data.departments || []);
    } catch (error) {
      console.error('Error loading departments:', error);
      setDepartments([]);
    }
  };

  const fetchDefaultCounterparty = async () => {
    try {
      const response = await settingsService.getPublicSettings();
      setDefaultCounterpartyId(response.data.defaultCounterpartyId);
    } catch (error) {
      console.error('Error loading default counterparty:', error);
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

  const handleDepartmentChange = async (employeeId, departmentId) => {
    try {
      await employeeService.updateDepartment(employeeId, departmentId);
      message.success('Подразделение обновлено');
      fetchEmployees();
    } catch (error) {
      message.error('Ошибка при обновлении подразделения');
      console.error('Error updating department:', error);
    }
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
      console.error('Error details:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        errors: error.response?.data?.errors,
        data: error.response?.data
      });
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
      employee.position?.name?.toLowerCase().includes(searchLower) || // Изменено для связанной таблицы
      employee.inn?.toLowerCase().includes(searchLower) ||
      employee.snils?.toLowerCase().includes(searchLower)
    );
    
    return matchesSearch;
  });

  // Получаем уникальные значения для фильтров
  const uniquePositions = [...new Set(filteredEmployees.map(e => e.position?.name).filter(Boolean))];
  const uniqueDepartments = [...new Set(
    filteredEmployees.flatMap(e => e.employeeCounterpartyMappings || [])
      .map(m => m.department?.name)
      .filter(Boolean)
  )];
  const uniqueCounterparties = [...new Set(
    filteredEmployees.flatMap(e => e.employeeCounterpartyMappings || [])
      .map(m => m.counterparty?.name)
      .filter(Boolean)
  )];
  const uniqueCitizenships = [...new Set(filteredEmployees.map(e => e.citizenship?.name).filter(Boolean))];

  const columns = [
    {
      title: 'ФИО',
      key: 'fullName',
      width: 200,
      render: (_, record) => (
        <div style={{ whiteSpace: 'normal', wordBreak: 'normal', overflowWrap: 'break-word' }}>
          {record.lastName} {record.firstName} {record.middleName || ''}
        </div>
      ),
      sorter: (a, b) => a.lastName.localeCompare(b.lastName),
    },
    {
      title: 'Должность',
      dataIndex: ['position', 'name'], // Путь к вложенному значению
      key: 'position',
      width: 156, // Увеличено на 30% (120 * 1.3)
      ellipsis: false,
      render: (name) => (
        <div style={{ 
          whiteSpace: 'normal', 
          wordBreak: 'keep-all', 
          overflowWrap: 'break-word',
          lineHeight: '1.4'
        }}>
          {name || '-'}
        </div>
      ),
      sorter: (a, b) => {
        const aPos = a.position?.name || '';
        const bPos = b.position?.name || '';
        return aPos.localeCompare(bPos);
      },
      filters: uniquePositions.sort().map(pos => ({ text: pos, value: pos })),
      onFilter: (value, record) => record.position?.name === value,
    },
    {
      title: 'Подразделение',
      key: 'department',
      width: 180,
      ellipsis: false,
      render: (_, record) => {
        const mappings = record.employeeCounterpartyMappings || [];
        const currentDepartmentId = mappings[0]?.departmentId;
        const departmentName = mappings[0]?.department?.name;
        
        return (
          <Select
            value={currentDepartmentId || undefined}
            placeholder="Выберите подразделение"
            style={{ width: '100%' }}
            className="department-select"
            popupMatchSelectWidth={false}
            onChange={(value) => handleDepartmentChange(record.id, value)}
            allowClear
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
          >
            {departments.map((dept) => (
              <Select.Option key={dept.id} value={dept.id}>
                {dept.name}
              </Select.Option>
            ))}
          </Select>
        );
      },
      sorter: (a, b) => {
        const aDept = a.employeeCounterpartyMappings?.[0]?.department?.name || '';
        const bDept = b.employeeCounterpartyMappings?.[0]?.department?.name || '';
        return aDept.localeCompare(bDept);
      },
      filters: uniqueDepartments.sort().map(dept => ({ text: dept, value: dept })),
      onFilter: (value, record) => {
        const mappings = record.employeeCounterpartyMappings || [];
        return mappings.some(m => m.department?.name === value);
      },
    },
    // Столбец "Контрагент" виден только для пользователей контрагента по умолчанию
    ...(canExport ? [{
      title: 'Контрагент',
      key: 'counterparty',
      width: 168, // Уменьшено на 30% (240 * 0.7)
      ellipsis: false,
      render: (_, record) => {
        const mappings = record.employeeCounterpartyMappings || [];
        if (mappings.length === 0) return '-';
        // Показываем все уникальные контрагенты
        const counterparties = [...new Set(mappings.map(m => m.counterparty?.name).filter(Boolean))];
        const text = counterparties.join(', ') || '-';
        return (
          <div style={{ 
            whiteSpace: 'normal', 
            wordBreak: 'keep-all', 
            overflowWrap: 'break-word',
            lineHeight: '1.4'
          }}>
            {text}
          </div>
        );
      },
      sorter: (a, b) => {
        const aCounterparty = a.employeeCounterpartyMappings?.[0]?.counterparty?.name || '';
        const bCounterparty = b.employeeCounterpartyMappings?.[0]?.counterparty?.name || '';
        return aCounterparty.localeCompare(bCounterparty);
      },
      filters: uniqueCounterparties.sort().map(cp => ({ text: cp, value: cp })),
      onFilter: (value, record) => {
        const mappings = record.employeeCounterpartyMappings || [];
        return mappings.some(m => m.counterparty?.name === value);
      },
    }] : []),
    {
      title: 'Объект',
      key: 'constructionSite',
      width: 150,
      render: (_, record) => {
        const mappings = record.employeeCounterpartyMappings || [];
        // Фильтруем только маппинги с объектами
        const siteMappings = mappings.filter(m => m.constructionSite);
        
        if (siteMappings.length === 0) {
          return '-';
        }
        
        return (
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            whiteSpace: 'normal',
            wordBreak: 'normal',
            overflowWrap: 'break-word'
          }}>
            {siteMappings.map((mapping, index) => (
              <div key={index}>
                {mapping.constructionSite?.shortName || mapping.constructionSite?.name}
              </div>
            ))}
          </div>
        );
      },
      sorter: (a, b) => {
        const aSite = a.employeeCounterpartyMappings?.find(m => m.constructionSite)?.constructionSite?.shortName ||
                      a.employeeCounterpartyMappings?.find(m => m.constructionSite)?.constructionSite?.name || '';
        const bSite = b.employeeCounterpartyMappings?.find(m => m.constructionSite)?.constructionSite?.shortName ||
                      b.employeeCounterpartyMappings?.find(m => m.constructionSite)?.constructionSite?.name || '';
        return aSite.localeCompare(bSite);
      },
    },
    {
      title: 'Гражданство',
      dataIndex: ['citizenship', 'name'],
      key: 'citizenship',
      ellipsis: true,
      render: (name) => name || '-',
      sorter: (a, b) => {
        const aCit = a.citizenship?.name || '';
        const bCit = b.citizenship?.name || '';
        return aCit.localeCompare(bCit);
      },
      filters: uniqueCitizenships.sort().map(cit => ({ text: cit, value: cit })),
      onFilter: (value, record) => record.citizenship?.name === value,
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
      sorter: (a, b) => {
        const aCompleted = a.statusCard === 'completed' ? 1 : 0;
        const bCompleted = b.statusCard === 'completed' ? 1 : 0;
        return aCompleted - bCompleted;
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
            <Button
              type="text"
              icon={<FileOutlined />}
              onClick={() => handleViewFiles(record)}
              disabled={filesCount === 0}
              style={{ 
                color: filesCount > 0 ? '#1890ff' : '#d9d9d9',
                position: 'relative'
              }}
            >
              {filesCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  color: '#000'
                }}>
                  {filesCount}
                </span>
              )}
            </Button>
          </Tooltip>
        );
      },
      sorter: (a, b) => (a.filesCount || 0) - (b.filesCount || 0),
    },
    {
      title: 'Статус',
      key: 'status',
      width: 120,
      render: (_, record) => {
        // Приоритет: statusSecure (Заблокирован) > statusActive (Уволен/Неактивный) > status (Новый/Проведен ТБ/Обработан)
        
        // Самый высокий приоритет - заблокирован
        if (record.statusSecure === 'block' || record.statusSecure === 'block_compl') {
          return <Tag color="red">Заблокирован</Tag>;
        }
        
        // Второй приоритет - statusActive (Уволен/Неактивный)
        if (record.statusActive === 'fired') {
          return <Tag color="red">Уволен</Tag>;
        }
        if (record.statusActive === 'inactive') {
          return <Tag color="blue">Неактивный</Tag>;
        }
        
        // Третий приоритет - status (Новый/Проведен ТБ/Обработан)
        const statusMap = {
          'new': { text: 'Новый', color: 'default' },
          'tb_passed': { text: 'Проведен ТБ', color: 'green' },
          'processed': { text: 'Обработан', color: 'success' },
        };
        
        const statusInfo = statusMap[record.status] || { text: '-', color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      },
      sorter: (a, b) => {
        // Определяем порядок приоритетов статусов для сортировки
        const getStatusPriority = (record) => {
          if (record.statusSecure === 'block' || record.statusSecure === 'block_compl') return 1; // Заблокирован
          if (record.statusActive === 'fired') return 2; // Уволен
          if (record.statusActive === 'inactive') return 3; // Неактивный
          if (record.status === 'new') return 4; // Новый
          if (record.status === 'tb_passed') return 5; // Проведен ТБ
          if (record.status === 'processed') return 6; // Обработан
          return 7; // Остальные
        };
        return getStatusPriority(a) - getStatusPriority(b);
      },
      filters: [
        { text: 'Заблокирован', value: 'blocked' },
        { text: 'Уволен', value: 'fired' },
        { text: 'Неактивный', value: 'inactive' },
        { text: 'Новый', value: 'new' },
        { text: 'Проведен ТБ', value: 'tb_passed' },
        { text: 'Обработан', value: 'processed' },
      ],
      onFilter: (value, record) => {
        // Для фильтрации "Заблокирован"
        if (value === 'blocked') {
          return record.statusSecure === 'block' || record.statusSecure === 'block_compl';
        }
        // Для фильтрации statusActive
        if (value === 'fired' || value === 'inactive') {
          return record.statusActive === value;
        }
        // Для фильтрации status (только если statusSecure и statusActive пустые)
        return !record.statusSecure || record.statusSecure === 'allow' && !record.statusActive && record.status === value;
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
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
          {canExport && (
            <Button 
              type="default" 
              icon={<FileExcelOutlined />} 
              onClick={() => setIsExportModalOpen(true)}
            >
              Импорт в Excel
            </Button>
          )}
          {canExport && (
            <Button 
              type="default" 
              icon={<LockOutlined />} 
              onClick={() => setIsSecurityModalOpen(true)}
            >
              Блокировка и ТБ
            </Button>
          )}
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
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total}`,
        }}
        rowClassName={(record, index) => index % 2 === 0 ? 'table-row-light' : 'table-row-dark'}
        scroll={{ x: 1300 }}
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

      <ExportToExcelModal
        visible={isExportModalOpen}
        onCancel={() => {
          setIsExportModalOpen(false);
          // Обновляем список сотрудников после экспорта
          fetchEmployees();
        }}
      />

      <SecurityModal
        visible={isSecurityModalOpen}
        onCancel={() => setIsSecurityModalOpen(false)}
        onSuccess={() => fetchEmployees()}
      />
    </div>
  );
};

export default EmployeesPage;
