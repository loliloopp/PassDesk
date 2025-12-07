import { useState, useEffect } from 'react';
import { Modal, Table, Input, Select, Space, Button, App, Tooltip } from 'antd';
import { SearchOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import { employeeService } from '../../services/employeeService';
import { employeeStatusService } from '../../services/employeeStatusService';
import { counterpartyService } from '../../services/counterpartyService';

const { Option } = Select;

// Функция для форматирования КИГ при отображении
const formatKigDisplay = (kig) => {
  if (!kig) return '-';
  
  // Если КИГ уже отформатирован (содержит пробел), возвращаем как есть
  if (kig.includes(' ')) {
    return kig;
  }
  
  // Убираем все символы кроме букв и цифр
  const kigClean = kig.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  // Форматируем: АА 1234567
  if (kigClean.length === 9) {
    return `${kigClean.slice(0, 2)} ${kigClean.slice(2)}`;
  }
  
  return kig;
};

const SecurityModal = ({ visible, onCancel, onSuccess }) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [counterparties, setCounterparties] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCounterparty, setSelectedCounterparty] = useState(null);
  const [statusFilters, setStatusFilters] = useState([]);
  const [allStatuses, setAllStatuses] = useState([]); // Кэш статусов
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  useEffect(() => {
    if (visible) {
      fetchCounterparties();
      fetchAllStatuses(); // Загружаем статусы один раз
      fetchEmployees();
    }
  }, [visible, selectedCounterparty, searchText, statusFilters]);

  const fetchAllStatuses = async () => {
    try {
      const statuses = await employeeStatusService.getAllStatuses();
      setAllStatuses(statuses);
    } catch (error) {
      console.error('Error loading statuses:', error);
      message.error('Ошибка при загрузке списка статусов');
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

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      
      // Загружаем список сотрудников (только активных, без черновиков)
      const response = await employeeService.getAll({ limit: 10000, activeOnly: 'true' });
      let allEmployees = response.data.employees || [];

      // Загружаем статусы для всех сотрудников одним batch запросом
      if (allEmployees.length > 0) {
        try {
          const employeeIds = allEmployees.map(emp => emp.id);
          const statusesBatch = await employeeStatusService.getStatusesBatch(employeeIds);
          
          // Добавляем статусы к каждому сотруднику
          allEmployees = allEmployees.map(emp => ({
            ...emp,
            statusMappings: statusesBatch[emp.id] || []
          }));
        } catch (statusErr) {
          console.warn('Error loading statuses batch:', statusErr);
          // Если ошибка - продолжаем без статусов
        }
      }

      // Сервер уже отфильтровал черновики, уволенных и неактивных через activeOnly=true
      let filtered = allEmployees;

      // Фильтруем по контрагенту
      if (selectedCounterparty) {
        filtered = filtered.filter(emp => 
          emp.employeeCounterpartyMappings?.some(m => m.counterpartyId === selectedCounterparty)
        );
      }

      // Фильтруем по ФИО
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        filtered = filtered.filter(emp =>
          emp.firstName?.toLowerCase().includes(searchLower) ||
          emp.lastName?.toLowerCase().includes(searchLower) ||
          emp.middleName?.toLowerCase().includes(searchLower)
        );
      }

      // Фильтруем по статусам (множественный выбор)
      if (statusFilters.length > 0) {
        filtered = filtered.filter(emp => {
          return statusFilters.some(filter => {
            const statusMapping = emp.statusMappings?.find(m => m.statusGroup === 'status' || m.status_group === 'status');
            const secureMapping = emp.statusMappings?.find(m => m.statusGroup === 'status_secure' || m.status_group === 'status_secure');
            
            if (filter === 'tb_passed') {
              return statusMapping?.status?.name === 'status_tb_passed' || statusMapping?.status?.name === 'status_processed';
            }
            if (filter === 'tb_not_passed') {
              return statusMapping?.status?.name === 'status_new';
            }
            if (filter === 'not_blocked') {
              return secureMapping?.status?.name === 'status_secure_allow' || !secureMapping;
            }
            if (filter === 'blocked') {
              return secureMapping?.status?.name === 'status_secure_block' || secureMapping?.status?.name === 'status_secure_block_compl';
            }
            return false;
          });
        });
      }

      setEmployees(filtered);
    } catch (error) {
      console.error('Error fetching employees:', error);
      message.error('Ошибка при загрузке сотрудников');
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async (employeeId) => {
    try {
      // Используем кэшированный список статусов
      const blockStatus = allStatuses.find(s => s.name === 'status_secure_block');
      
      if (!blockStatus) {
        throw new Error('Статус блокировки не найден');
      }

      await employeeStatusService.setStatus(employeeId, blockStatus.id);
      message.success('Сотрудник заблокирован');
      onSuccess && onSuccess();
      // Перезагружаем список
      fetchEmployees();
    } catch (error) {
      console.error('Error blocking employee:', error);
      message.error('Ошибка при блокировке сотрудника');
    }
  };

  const handleUnblock = async (employeeId) => {
    try {
      // Используем кэшированный список статусов
      const allowStatus = allStatuses.find(s => s.name === 'status_secure_allow');
      
      if (!allowStatus) {
        throw new Error('Статус разблокировки не найден');
      }

      await employeeStatusService.setStatus(employeeId, allowStatus.id);
      message.success('Сотрудник разблокирован');
      onSuccess && onSuccess();
      // Перезагружаем список
      fetchEmployees();
    } catch (error) {
      console.error('Error unblocking employee:', error);
      message.error('Ошибка при разблокировке сотрудника');
    }
  };

  const handleTbPassed = async (employeeId) => {
    try {
      // Используем кэшированный список статусов
      const tbPassedStatus = allStatuses.find(s => s.name === 'status_tb_passed');
      
      if (!tbPassedStatus) {
        throw new Error('Статус ТБ не найден');
      }

      await employeeStatusService.setStatus(employeeId, tbPassedStatus.id);
      message.success('Статус обновлен: Проведен инструктаж ТБ');
      onSuccess && onSuccess();
      // Перезагружаем список
      fetchEmployees();
    } catch (error) {
      console.error('Error updating TB status:', error);
      message.error('Ошибка при обновлении статуса ТБ');
    }
  };

  const handleTbRevoke = async (employeeId) => {
    try {
      // Используем кэшированный список статусов
      const newStatus = allStatuses.find(s => s.name === 'status_new');
      
      if (!newStatus) {
        throw new Error('Статус "Новый" не найден');
      }

      await employeeStatusService.setStatus(employeeId, newStatus.id);
      message.success('Статус обновлен: Новый');
      onSuccess && onSuccess();
      // Перезагружаем список
      fetchEmployees();
    } catch (error) {
      console.error('Error revoking TB status:', error);
      message.error('Ошибка при отмене статуса ТБ');
    }
  };

  const columns = [
    {
      title: 'ФИО',
      key: 'fullName',
      render: (_, record) => `${record.lastName} ${record.firstName} ${record.middleName || ''}`,
    },
    {
      title: 'Контрагент',
      key: 'counterparty',
      render: (_, record) => {
        const counterparties = record.employeeCounterpartyMappings?.map(m => m.counterparty?.name).filter(Boolean);
        return [...new Set(counterparties)].join(', ') || '-';
      },
    },
    {
      title: 'ИНН',
      dataIndex: 'inn',
      key: 'inn',
    },
    {
      title: 'КИГ',
      dataIndex: 'kig',
      key: 'kig',
      render: (text) => formatKigDisplay(text),
    },
    {
      title: 'Патент',
      dataIndex: 'patentNumber',
      key: 'patentNumber',
      render: (text) => text || '-',
    },
    {
      title: 'Блокировка',
      key: 'action',
      width: 120,
      align: 'center',
      render: (_, record) => {
        const secureMapping = record.statusMappings?.find(m => m.statusGroup === 'status_secure' || m.status_group === 'status_secure');
        const secureName = secureMapping?.status?.name;
        
        const isBlocked = secureName === 'status_secure_block' || secureName === 'status_secure_block_compl';
        const isBlockCompleted = secureName === 'status_secure_block_compl';

        if (!isBlocked) {
          // Сотрудник не заблокирован - показываем кнопку "Заблокировать"
          return (
            <Tooltip title="Заблокировать">
              <Button
                type="primary"
                danger
                size="small"
                shape="circle"
                icon={<LockOutlined />}
                onClick={() => handleBlock(record.id)}
              />
            </Tooltip>
          );
        } else {
          // Сотрудник заблокирован - показываем кнопку "Разблокировать"
          return (
            <Tooltip title="Разблокировать">
              <Button
                type="primary"
                size="small"
                shape="circle"
                icon={<UnlockOutlined />}
                onClick={() => handleUnblock(record.id)}
                disabled={isBlockCompleted}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              />
            </Tooltip>
          );
        }
      },
    },
  ];

  return (
    <Modal
      title="Блокировка"
      open={visible}
      onCancel={onCancel}
      width={1200}
      maskClosable={false}
      centered={false}
      modalStyle={{ top: '30px' }}
      footer={[
        <Button key="close" onClick={onCancel}>
          Закрыть
        </Button>,
      ]}
    >
      {/* Фильтры */}
      <Space style={{ marginBottom: 16 }} size="middle">
        <Select
          placeholder="Выберите контрагента"
          allowClear
          style={{ width: 300 }}
          value={selectedCounterparty}
          onChange={setSelectedCounterparty}
        >
          {counterparties.map((cp) => (
            <Option key={cp.id} value={cp.id}>
              {cp.name}
            </Option>
          ))}
        </Select>
        <Input
          placeholder="Поиск по ФИО"
          prefix={<SearchOutlined />}
          allowClear
          style={{ width: 300 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Select
          mode="multiple"
          placeholder="Фильтр по статусу"
          allowClear
          style={{ width: 300 }}
          value={statusFilters}
          onChange={setStatusFilters}
        >
          <Option value="tb_passed">Прошел ТБ</Option>
          <Option value="tb_not_passed">Не прошел ТБ</Option>
          <Option value="not_blocked">Не заблокирован</Option>
          <Option value="blocked">Заблокирован</Option>
        </Select>
      </Space>

      {/* Таблица */}
      <Table
        columns={columns}
        dataSource={employees}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ y: 500 }}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          total: employees.length,
          onChange: (page, pageSize) => {
            setPagination({ current: page, pageSize });
          },
        }}
        rowClassName={(record, index) => 
          index % 2 === 0 ? 'table-row-light' : 'table-row-dark'
        }
      />
    </Modal>
  );
};

export default SecurityModal;

