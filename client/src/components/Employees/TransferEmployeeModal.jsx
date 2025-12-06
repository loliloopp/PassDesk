import { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Input, Table, Button, Space, App, Empty, Spin } from 'antd';
import { SearchOutlined, SwapOutlined } from '@ant-design/icons';
import { counterpartyService } from '../../services/counterpartyService';
import { employeeService } from '../../services/employeeService';

/**
 * Модальное окно для перевода сотрудника в другую компанию
 * Позволяет искать контрагента по названию или ИНН
 */
const TransferEmployeeModal = ({ visible, employee, onCancel }) => {
  const { message, modal } = App.useApp();
  const [searchText, setSearchText] = useState('');
  const [counterparties, setCounterparties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [selectedCounterparty, setSelectedCounterparty] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const searchTimeoutRef = useRef(null); // Ref для дебаунса поиска

  // Загрузка контрагентов
  const loadCounterparties = useCallback(async (search = '', page = 1) => {
    setLoading(true);
    try {
      const response = await counterpartyService.getAll({
        search,
        page,
        limit: pagination.pageSize
      });
      
      if (response.data?.success) {
        setCounterparties(response.data.data.counterparties);
        setPagination(prev => ({
          ...prev,
          current: response.data.data.pagination.page,
          total: response.data.data.pagination.total
        }));
      }
    } catch (error) {
      console.error('Ошибка загрузки контрагентов:', error);
      message.error('Не удалось загрузить список компаний');
    } finally {
      setLoading(false);
    }
  }, [pagination.pageSize, message]);

  // Дебаунс для поиска
  const debouncedSearch = useCallback((value) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      loadCounterparties(value, 1);
    }, 300);
  }, [loadCounterparties]);

  // Загрузка при открытии модального окна
  useEffect(() => {
    if (visible) {
      setSearchText('');
      setSelectedCounterparty(null);
      loadCounterparties('', 1);
    }
    // Очистка таймера при размонтировании
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [visible, loadCounterparties]);

  // Обработчик изменения поиска
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchText(value);
    debouncedSearch(value);
  };

  // Обработчик изменения страницы
  const handleTableChange = (newPagination) => {
    loadCounterparties(searchText, newPagination.current);
  };

  // Обработчик выбора контрагента
  const handleSelectCounterparty = (record) => {
    setSelectedCounterparty(record);
  };

  // Обработчик перевода
  const handleTransfer = async () => {
    if (!selectedCounterparty || !employee?.id) return;

    // Подтверждение перевода
    modal.confirm({
      title: 'Подтверждение перевода',
      content: (
        <div>
          <p>Вы уверены, что хотите перевести сотрудника:</p>
          <p><strong>{employee.lastName} {employee.firstName} {employee.middleName || ''}</strong></p>
          <p>в компанию:</p>
          <p><strong>{selectedCounterparty.name}</strong></p>
          {selectedCounterparty.inn && <p>ИНН: {selectedCounterparty.inn}</p>}
        </div>
      ),
      okText: 'Перевести',
      cancelText: 'Отмена',
      onOk: async () => {
        setTransferring(true);
        try {
          const response = await employeeService.transferToCounterparty(
            employee.id,
            selectedCounterparty.id
          );
          
          if (response.success) {
            message.success(response.message || 'Сотрудник успешно переведен');
            onCancel();
          }
        } catch (error) {
          console.error('Ошибка перевода сотрудника:', error);
          const errorMessage = error.response?.data?.message || 'Не удалось перевести сотрудника';
          message.error(errorMessage);
        } finally {
          setTransferring(false);
        }
      }
    });
  };

  // Колонки таблицы
  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true
    },
    {
      title: 'ИНН',
      dataIndex: 'inn',
      key: 'inn',
      width: 140
    },
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type) => {
        const typeLabels = {
          contractor: 'Подрядчик',
          customer: 'Заказчик',
          other: 'Прочее'
        };
        return typeLabels[type] || type;
      }
    }
  ];

  return (
    <Modal
      title={
        <Space>
          <SwapOutlined />
          <span>Перевод сотрудника в другую компанию</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={700}
      footer={
        <Space>
          <Button onClick={onCancel}>
            Отмена
          </Button>
          <Button
            type="primary"
            icon={<SwapOutlined />}
            onClick={handleTransfer}
            disabled={!selectedCounterparty}
            loading={transferring}
          >
            Перевести
          </Button>
        </Space>
      }
    >
      {/* Информация о сотруднике */}
      {employee && (
        <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
          <strong>Сотрудник:</strong> {employee.lastName} {employee.firstName} {employee.middleName || ''}
          {employee.inn && <span style={{ marginLeft: 16, color: '#666' }}>ИНН: {employee.inn}</span>}
        </div>
      )}

      {/* Поле поиска */}
      <Input
        placeholder="Поиск по названию или ИНН"
        prefix={<SearchOutlined />}
        value={searchText}
        onChange={handleSearchChange}
        style={{ marginBottom: 16 }}
        allowClear
      />

      {/* Выбранная компания */}
      {selectedCounterparty && (
        <div style={{ marginBottom: 16, padding: 12, background: '#e6f7ff', borderRadius: 6, border: '1px solid #91d5ff' }}>
          <strong>Выбрана компания:</strong> {selectedCounterparty.name}
          {selectedCounterparty.inn && <span style={{ marginLeft: 16, color: '#666' }}>ИНН: {selectedCounterparty.inn}</span>}
        </div>
      )}

      {/* Таблица контрагентов */}
      <Spin spinning={loading}>
        <Table
          dataSource={counterparties}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{
            ...pagination,
            showSizeChanger: false,
            showTotal: (total) => `Всего: ${total}`
          }}
          onChange={handleTableChange}
          onRow={(record) => ({
            onClick: () => handleSelectCounterparty(record),
            style: {
              cursor: 'pointer',
              background: selectedCounterparty?.id === record.id ? '#e6f7ff' : undefined
            }
          })}
          locale={{
            emptyText: <Empty description="Компании не найдены" />
          }}
          scroll={{ y: 300 }}
        />
      </Spin>
    </Modal>
  );
};

export default TransferEmployeeModal;

