import { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Modal, Form, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { constructionSiteService } from '../services/constructionSiteService';

const { Search } = Input;
const { TextArea } = Input;

const ConstructionSitesPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [search, setSearch] = useState('');
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, [pagination.current, search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: response } = await constructionSiteService.getAll({
        page: pagination.current,
        limit: pagination.pageSize,
        search
      });
      setData(response.data.constructionSites);
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
      title: 'Удалить объект строительства?',
      onOk: async () => {
        try {
          await constructionSiteService.delete(id);
          message.success('Объект удален');
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
        await constructionSiteService.update(editingId, values);
        message.success('Объект обновлен');
      } else {
        await constructionSiteService.create(values);
        message.success('Объект создан');
      }
      setModalVisible(false);
      fetchData();
    } catch (error) {
      message.error('Ошибка при сохранении');
    }
  };

  const columns = [
    { title: 'Краткое название', dataIndex: 'shortName', key: 'shortName' },
    { title: 'Полное название', dataIndex: 'fullName', key: 'fullName' },
    { title: 'Адрес', dataIndex: 'address', key: 'address' },
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
          <h1>Объекты строительства</h1>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Добавить
          </Button>
        </div>

        <Search
          placeholder="Поиск по названию или адресу"
          onSearch={setSearch}
          style={{ width: 400 }}
          allowClear
        />

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
        title={editingId ? 'Редактировать объект' : 'Добавить объект'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="shortName" label="Краткое название" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="fullName" label="Полное название" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Адрес" rules={[{ required: true }]}>
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ConstructionSitesPage;

