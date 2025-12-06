import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  message,
  Popconfirm,
  Select
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { departmentService } from '../services/departmentService';
import { constructionSiteService } from '../services/constructionSiteService';
import settingsService from '../services/settingsService';
import { useAuthStore } from '../store/authStore';

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState([]);
  const [constructionSites, setConstructionSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [form] = Form.useForm();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.counterpartyId) {
      fetchDepartments();
      fetchConstructionSites();
    }
  }, [user?.counterpartyId]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await departmentService.getAll(user.counterpartyId);
      setDepartments(response.data.data.departments || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      message.error('Ошибка при загрузке подразделений');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка объектов (для default контрагента - все, для остальных - только привязанные)
  const fetchConstructionSites = async () => {
    try {
      let sites = [];
      
      // Получаем публичные настройки (доступно всем пользователям)
      const settingsResponse = await settingsService.getPublicSettings();
      const defaultCounterpartyId = settingsResponse?.data?.defaultCounterpartyId;

      // Если это default контрагент - загружаем все объекты
      if (user.counterpartyId === defaultCounterpartyId) {
        const response = await constructionSiteService.getAll();
        sites = response.data.data?.constructionSites || response.data.data || [];
      } else {
        // Для остальных контрагентов - только назначенные объекты
        const response = await constructionSiteService.getCounterpartyObjects(user.counterpartyId);
        sites = response.data.data || [];
      }
      setConstructionSites(sites);
    } catch (error) {
      console.error('Error fetching construction sites:', error);
      // Не показываем ошибку, если просто нет объектов
      setConstructionSites([]);
    }
  };

  const handleOpenModal = (department = null) => {
    setEditingDepartment(department);
    if (department) {
      form.setFieldsValue({ 
        name: department.name,
        constructionSiteId: department.constructionSiteId || null
      });
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingDepartment(null);
    form.resetFields();
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingDepartment) {
        await departmentService.update(editingDepartment.id, values);
        message.success('Подразделение обновлено');
      } else {
        await departmentService.create(values);
        message.success('Подразделение создано');
      }
      
      handleCloseModal();
      fetchDepartments();
    } catch (error) {
      console.error('Error saving department:', error);
      const errorMessage = error.response?.data?.message || 'Ошибка при сохранении';
      message.error(errorMessage);
    }
  };

  const handleDelete = async (id) => {
    try {
      await departmentService.delete(id);
      message.success('Подразделение удалено');
      fetchDepartments();
    } catch (error) {
      console.error('Error deleting department:', error);
      message.error('Ошибка при удалении подразделения');
    }
  };

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Объект',
      dataIndex: ['constructionSite', 'shortName'],
      key: 'constructionSite',
      render: (text) => text || '—',
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          />
          <Popconfirm
            title="Удалить подразделение?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end', paddingRight: 10 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpenModal()}
        >
          Добавить подразделение
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={departments}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total}`,
        }}
      />

      <Modal
        title={editingDepartment ? 'Редактировать подразделение' : 'Добавить подразделение'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={handleCloseModal}
        okText="Сохранить"
        cancelText="Отмена"
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Название подразделения"
            rules={[{ required: true, message: 'Введите название подразделения' }]}
          >
            <Input placeholder="Например: Отдел продаж" />
          </Form.Item>
          <Form.Item
            name="constructionSiteId"
            label="Связанный объект"
          >
            {constructionSites.length === 0 ? (
              <div style={{ 
                padding: '12px', 
                background: '#f0f5ff', 
                border: '1px solid #adc6ff',
                borderRadius: '6px',
                color: '#1890ff'
              }}>
                Обратитесь к администратору для назначения доступных объектов
              </div>
            ) : (
              <Select
                placeholder="Выберите объект (необязательно)"
                allowClear
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
              >
                {constructionSites.map(site => (
                  <Select.Option key={site.id} value={site.id}>
                    {site.shortName}
                  </Select.Option>
                ))}
              </Select>
            )}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DepartmentsPage;

