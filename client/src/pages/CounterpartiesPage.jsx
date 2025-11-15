import { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Modal, Form, Select, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { counterpartyService } from '../services/counterpartyService';

const { Search } = Input;

const typeMap = {
  customer: { label: 'Заказчик', color: 'blue' },
  contractor: { label: 'Подрядчик', color: 'green' },
  owner: { label: 'Владелец', color: 'gold' }
};

const CounterpartiesPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({});
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, [pagination.current, filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: response } = await counterpartyService.getAll({
        page: pagination.current,
        limit: pagination.pageSize,
        ...filters
      });
      setData(response.data.counterparties);
      setPagination(prev => ({ ...prev, total: response.data.pagination.total }));
    } catch (error) {
      message.error('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: 'Удалить контрагента?',
      content: 'Это действие нельзя отменить',
      onOk: async () => {
        try {
          await counterpartyService.delete(id);
          message.success('Контрагент удален');
          fetchData();
        } catch (error) {
          message.error(error.response?.data?.message || 'Ошибка при удалении');
        }
      }
    });
  };

  const handleSubmit = async (values) => {
    try {
      if (editingId) {
        await counterpartyService.update(editingId, values);
        message.success('Контрагент обновлен');
      } else {
        await counterpartyService.create(values);
        message.success('Контрагент создан');
      }
      setModalVisible(false);
      fetchData();
    } catch (error) {
      console.error('Error saving counterparty:', error);
      
      // Детальный вывод ошибок валидации
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const errorMsg = errors.map(e => `${e.field}: ${e.message}`).join('; ');
        message.error(errorMsg);
      } else {
        message.error(error.response?.data?.message || 'Ошибка при сохранении');
      }
    }
  };

  const columns = [
    { title: 'Название', dataIndex: 'name', key: 'name' },
    { title: 'ИНН', dataIndex: 'inn', key: 'inn' },
    { title: 'КПП', dataIndex: 'kpp', key: 'kpp' },
    { 
      title: 'Тип', 
      dataIndex: 'type', 
      key: 'type',
      render: (type) => <Tag color={typeMap[type]?.color}>{typeMap[type]?.label}</Tag>
    },
    { title: 'Телефон', dataIndex: 'phone', key: 'phone' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)} />
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h1>Контрагенты</h1>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Добавить
          </Button>
        </div>

        <Space>
          <Search
            placeholder="Поиск по названию или ИНН"
            onSearch={(value) => setFilters(prev => ({ ...prev, search: value }))}
            style={{ width: 300 }}
            allowClear
          />
          <Select
            placeholder="Тип"
            style={{ width: 150 }}
            onChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
            allowClear
          >
            <Select.Option value="customer">Заказчик</Select.Option>
            <Select.Option value="contractor">Подрядчик</Select.Option>
            <Select.Option value="owner">Владелец</Select.Option>
          </Select>
        </Space>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            onChange: (page) => setPagination(prev => ({ ...prev, current: page }))
          }}
        />
      </Space>

      <Modal
        title={editingId ? 'Редактировать контрагента' : 'Добавить контрагента'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Введите название' }]}>
            <Input />
          </Form.Item>
          <Form.Item 
            name="inn" 
            label="ИНН" 
            rules={[
              { required: true, message: 'Введите ИНН' },
              { pattern: /^\d{10}$|^\d{12}$/, message: 'ИНН должен содержать 10 или 12 цифр' }
            ]}
          >
            <Input maxLength={12} />
          </Form.Item>
          <Form.Item 
            name="kpp" 
            label="КПП"
            rules={[
              { pattern: /^\d{9}$/, message: 'КПП должен содержать 9 цифр' }
            ]}
          >
            <Input maxLength={9} />
          </Form.Item>
          <Form.Item 
            name="ogrn" 
            label="ОГРН"
            rules={[
              { pattern: /^\d{13}$|^\d{15}$/, message: 'ОГРН должен содержать 13 или 15 цифр' }
            ]}
          >
            <Input maxLength={15} />
          </Form.Item>
          <Form.Item name="type" label="Тип" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="customer">Заказчик</Select.Option>
              <Select.Option value="contractor">Подрядчик</Select.Option>
              <Select.Option value="owner">Владелец</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="legalAddress" label="Юридический адрес">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="phone" label="Телефон">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CounterpartiesPage;

