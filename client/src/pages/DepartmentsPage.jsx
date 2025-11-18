import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  message,
  Popconfirm
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { departmentService } from '../services/departmentService';
import { useAuthStore } from '../store/authStore';

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [form] = Form.useForm();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.counterpartyId) {
      fetchDepartments();
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

  const handleOpenModal = (department = null) => {
    setEditingDepartment(department);
    if (department) {
      form.setFieldsValue({ name: department.name });
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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
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
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Название подразделения"
            rules={[{ required: true, message: 'Введите название подразделения' }]}
          >
            <Input placeholder="Например: Отдел продаж" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DepartmentsPage;

