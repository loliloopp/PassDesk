import { useState, useEffect } from 'react';
import { Modal, Table, Input, Select, Space, Button, message, Tooltip } from 'antd';
import { SearchOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import { employeeService } from '../../services/employeeService';
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
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [counterparties, setCounterparties] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCounterparty, setSelectedCounterparty] = useState(null);
  const [statusFilters, setStatusFilters] = useState([]);

  useEffect(() => {
    if (visible) {
      fetchCounterparties();
      fetchEmployees();
    }
  }, [visible, selectedCounterparty, searchText, statusFilters]);

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
      const response = await employeeService.getAll();
      const allEmployees = response.data.employees || [];

      // Показываем всех сотрудников, исключая черновики
      let filtered = allEmployees.filter(emp => emp.statusCard !== 'draft');

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
            if (filter === 'tb_passed') {
              return emp.status === 'tb_passed' || emp.status === 'processed';
            }
            if (filter === 'tb_not_passed') {
              return emp.status === 'new';
            }
            if (filter === 'not_blocked') {
              return emp.statusSecure === 'allow' || !emp.statusSecure;
            }
            if (filter === 'blocked') {
              return emp.statusSecure === 'block' || emp.statusSecure === 'block_compl';
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
    // Оптимистичное обновление UI
    setEmployees(prev => prev.map(emp => 
      emp.id === employeeId ? { ...emp, statusSecure: 'block' } : emp
    ));

    try {
      await employeeService.update(employeeId, { statusSecure: 'block' });
      message.success('Сотрудник заблокирован');
      onSuccess && onSuccess();
    } catch (error) {
      console.error('Error blocking employee:', error);
      message.error('Ошибка при блокировке сотрудника');
      // Откатываем изменения при ошибке
      fetchEmployees();
    }
  };

  const handleUnblock = async (employeeId) => {
    // Оптимистичное обновление UI
    setEmployees(prev => prev.map(emp => 
      emp.id === employeeId ? { ...emp, statusSecure: 'allow' } : emp
    ));

    try {
      await employeeService.update(employeeId, { statusSecure: 'allow' });
      message.success('Сотрудник разблокирован');
      onSuccess && onSuccess();
    } catch (error) {
      console.error('Error unblocking employee:', error);
      message.error('Ошибка при разблокировке сотрудника');
      // Откатываем изменения при ошибке
      fetchEmployees();
    }
  };

  const handleTbPassed = async (employeeId) => {
    // Оптимистичное обновление UI
    setEmployees(prev => prev.map(emp => 
      emp.id === employeeId ? { ...emp, status: 'tb_passed' } : emp
    ));

    try {
      await employeeService.update(employeeId, { status: 'tb_passed' });
      message.success('Статус обновлен: Проведен инструктаж ТБ');
      onSuccess && onSuccess();
    } catch (error) {
      console.error('Error updating TB status:', error);
      message.error('Ошибка при обновлении статуса ТБ');
      // Откатываем изменения при ошибке
      fetchEmployees();
    }
  };

  const handleTbRevoke = async (employeeId) => {
    // Оптимистичное обновление UI
    setEmployees(prev => prev.map(emp => 
      emp.id === employeeId ? { ...emp, status: 'new' } : emp
    ));

    try {
      await employeeService.update(employeeId, { status: 'new' });
      message.success('Статус обновлен: Новый');
      onSuccess && onSuccess();
    } catch (error) {
      console.error('Error revoking TB status:', error);
      message.error('Ошибка при отмене статуса ТБ');
      // Откатываем изменения при ошибке
      fetchEmployees();
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
      title: 'Инструктаж ТБ',
      key: 'tbStatus',
      align: 'center',
      width: 120,
      render: (_, record) => {
        // Если статус "Новый" - показываем "НЕТ" с оранжевым контуром
        if (record.status === 'new') {
          return (
            <Button
              size="small"
              onClick={() => handleTbPassed(record.id)}
              style={{
                color: '#fa8c16',
                borderColor: '#fa8c16',
                backgroundColor: 'transparent',
              }}
            >
              НЕТ
            </Button>
          );
        }
        // Если статус "Проведен ТБ" или "Обработан" - показываем "ДА" с зеленым контуром
        return (
          <Button
            size="small"
            onClick={() => handleTbRevoke(record.id)}
            style={{
              color: '#52c41a',
              borderColor: '#52c41a',
              backgroundColor: 'transparent',
            }}
          >
            ДА
          </Button>
        );
      },
    },
    {
      title: 'Блокировка',
      key: 'action',
      width: 120,
      align: 'center',
      render: (_, record) => {
        const isBlocked = record.statusSecure === 'block' || record.statusSecure === 'block_compl';
        const isBlockCompleted = record.statusSecure === 'block_compl';

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
      title="Блокировка и Инструктаж ТБ"
      open={visible}
      onCancel={onCancel}
      width={1200}
      maskClosable={false}
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
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        rowClassName={(record, index) => 
          index % 2 === 0 ? 'table-row-light' : 'table-row-dark'
        }
      />
      
      <style jsx>{`
        .table-row-light {
          background-color: #ffffff;
        }
        .table-row-dark {
          background-color: #fafafa;
        }
      `}</style>
    </Modal>
  );
};

export default SecurityModal;

