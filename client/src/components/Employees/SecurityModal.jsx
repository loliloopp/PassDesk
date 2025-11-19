import { useState, useEffect } from 'react';
import { Modal, Tabs, Table, Input, Select, Space, Button, message, Tooltip } from 'antd';
import { SearchOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import { employeeService } from '../../services/employeeService';
import { counterpartyService } from '../../services/counterpartyService';

const { Option } = Select;

const SecurityModal = ({ visible, onCancel, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('active');
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [counterparties, setCounterparties] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedCounterparty, setSelectedCounterparty] = useState(null);

  useEffect(() => {
    if (visible) {
      fetchCounterparties();
      fetchEmployees();
    }
  }, [visible, activeTab, selectedCounterparty, searchText]);

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

      // Фильтруем по статусу безопасности в зависимости от активной вкладки
      let filtered = allEmployees;
      
      if (activeTab === 'active') {
        // Вкладка "Просмотр" - показываем всех сотрудников (allow, block, block_compl)
        // НО исключаем сотрудников со статусом карточки 'draft'
        filtered = allEmployees.filter(emp => emp.statusCard !== 'draft');
      } else {
        // Вкладка "Заблокированные" - показываем сотрудников со статусами 'block' или 'block_compl'
        filtered = allEmployees.filter(emp => emp.statusSecure === 'block' || emp.statusSecure === 'block_compl');
      }

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
      await employeeService.update(employeeId, { statusSecure: 'block' });
      message.success('Сотрудник заблокирован');
      fetchEmployees();
      onSuccess && onSuccess();
    } catch (error) {
      console.error('Error blocking employee:', error);
      message.error('Ошибка при блокировке сотрудника');
    }
  };

  const handleUnblock = async (employeeId) => {
    try {
      await employeeService.update(employeeId, { statusSecure: 'allow' });
      message.success('Сотрудник разблокирован');
      fetchEmployees();
      onSuccess && onSuccess();
    } catch (error) {
      console.error('Error unblocking employee:', error);
      message.error('Ошибка при разблокировке сотрудника');
    }
  };

  const handleTbPassed = async (employeeId) => {
    try {
      await employeeService.update(employeeId, { status: 'tb_passed' });
      message.success('Статус обновлен: Проведен инструктаж ТБ');
      fetchEmployees();
      onSuccess && onSuccess();
    } catch (error) {
      console.error('Error updating TB status:', error);
      message.error('Ошибка при обновлении статуса ТБ');
    }
  };

  const handleTbRevoke = async (employeeId) => {
    try {
      await employeeService.update(employeeId, { status: 'new' });
      message.success('Статус обновлен: Новый');
      fetchEmployees();
      onSuccess && onSuccess();
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
      render: (text) => text || '-',
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
      title: 'Действие',
      key: 'action',
      width: 120,
      align: 'center',
      render: (_, record) => {
        // На вкладке "Просмотр": если allow - показываем "Заблокировать", иначе "Разблокировать"
        // На вкладке "Заблокированные": всегда показываем "Разблокировать"
        const isBlocked = record.statusSecure === 'block' || record.statusSecure === 'block_compl';
        const isBlockCompleted = record.statusSecure === 'block_compl';

        if (activeTab === 'active' && !isBlocked) {
          // На вкладке "Просмотр" для сотрудников со статусом 'allow' - кнопка "Заблокировать"
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
          // Для всех заблокированных сотрудников - зеленая кнопка "Разблокировать"
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
      </Space>

      {/* Вкладки */}
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane tab="Просмотр" key="active">
          <Table
            columns={columns}
            dataSource={employees}
            rowKey="id"
            loading={loading}
            size="small"
            pagination={{ pageSize: 10 }}
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab="Заблокированные" key="blocked">
          <Table
            columns={columns}
            dataSource={employees}
            rowKey="id"
            loading={loading}
            size="small"
            pagination={{ pageSize: 10 }}
          />
        </Tabs.TabPane>
      </Tabs>
    </Modal>
  );
};

export default SecurityModal;

