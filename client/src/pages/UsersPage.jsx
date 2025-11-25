import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Input,
  Space,
  Typography,
  Tag,
  Tooltip,
  Modal,
  Form,
  Select,
  App,
  Popconfirm,
  Switch,
  Popover,
  Checkbox,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  LockOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FilterOutlined,
} from '@ant-design/icons'
import { userService } from '@/services/userService'
import { counterpartyService } from '@/services/counterpartyService'
import { useAuthStore } from '@/store/authStore'

const { Title } = Typography

const UsersPage = () => {
  const { message } = App.useApp()
  const [users, setUsers] = useState([])
  const [counterparties, setCounterparties] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [form] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [editingUser, setEditingUser] = useState(null)
  const { user: currentUser } = useAuthStore()
  const [statusFilter, setStatusFilter] = useState([])

  useEffect(() => {
    fetchUsers()
    fetchCounterparties()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await userService.getAll()
      // Правильный путь: response.data.users (Axios уже распаковывает один уровень data)
      setUsers(response?.data?.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCounterparties = async () => {
    try {
      const { data } = await counterpartyService.getAll({ limit: 100 })
      setCounterparties(data.data.counterparties)
    } catch (error) {
      console.error('Error loading counterparties:', error)
    }
  }

  const roleLabels = {
    admin: { text: 'Администратор', color: 'red' },
    user: { text: 'Пользователь', color: 'default' },
  }

  const columns = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      sorter: (a, b) => a.email.localeCompare(b.email),
      render: (email) => (
        <Space>
          <UserOutlined style={{ color: '#2563eb' }} />
          <span>{email}</span>
        </Space>
      ),
    },
    {
      title: 'ФИО',
      key: 'fullName',
      render: (_, record) => (
        <span>
          {record.lastName} {record.firstName}
        </span>
      ),
      sorter: (a, b) => a.lastName.localeCompare(b.lastName),
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={roleLabels[role]?.color}>{roleLabels[role]?.text}</Tag>
      ),
      filters: Object.entries(roleLabels).map(([key, value]) => ({
        text: value.text,
        value: key,
      })),
      onFilter: (value, record) => record.role === value,
    },
    {
      title: 'Контрагент',
      dataIndex: 'counterpartyId',
      key: 'counterpartyId',
      render: (counterpartyId) => {
        const counterparty = counterparties.find(c => c.id === counterpartyId);
        return counterparty ? counterparty.name : '-';
      },
    },
    {
      title: 'Статус',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive, record) => {
        // Для администраторов - Switch, для остальных - Tag
        if (currentUser?.role === 'admin' && record.id !== currentUser?.id) {
          return (
            <Switch
              checked={isActive}
              onChange={() => handleToggleStatus(record.id)}
              checkedChildren="Активен"
              unCheckedChildren="Неактивен"
            />
          );
        }
        return (
          <Tag icon={isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />} color={isActive ? 'success' : 'default'}>
            {isActive ? 'Активен' : 'Неактивен'}
          </Tag>
        );
      },
      filters: [
        { text: 'Активен', value: true },
        { text: 'Неактивен', value: false },
      ],
      onFilter: (value, record) => record.isActive === value,
    },
    {
      title: 'Дата создания',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString('ru-RU'),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: 'УИН',
      dataIndex: 'identificationNumber',
      key: 'identificationNumber',
      render: (value) => {
        if (!value) return '-';
        // Форматируем в маску XXX-XXX
        const digits = value.toString().replace(/\D/g, '');
        return digits.length >= 6 ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}` : value;
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Tooltip title="Редактировать">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Изменить пароль">
            <Button
              type="text"
              icon={<LockOutlined />}
              onClick={() => handleChangePassword(record)}
              disabled={currentUser?.role !== 'admin' && record.id !== currentUser?.id}
            />
          </Tooltip>
          <Tooltip title="Удалить">
            <Popconfirm
              title="Удалить пользователя?"
              description="Это действие нельзя отменить."
              onConfirm={() => handleDelete(record.id)}
              okText="Удалить"
              okType="danger"
              cancelText="Отмена"
              disabled={record.id === currentUser?.id || currentUser?.role !== 'admin'}
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                disabled={record.id === currentUser?.id || currentUser?.role !== 'admin'}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ]

  const handleAdd = () => {
    setEditingUser(null)
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    form.setFieldsValue(user)
    setIsModalOpen(true)
  }

  const handleChangePassword = (user) => {
    setEditingUser(user)
    passwordForm.resetFields()
    setIsPasswordModalOpen(true)
  }

  const handleToggleStatus = async (id) => {
    try {
      await userService.toggleStatus(id)
      message.success('Статус пользователя изменен')
      fetchUsers()
    } catch (error) {
      message.error(error.response?.data?.message || 'Ошибка изменения статуса')
    }
  }

  const handleDelete = async (id) => {
    try {
      await userService.delete(id)
      message.success('Пользователь удален')
      fetchUsers()
    } catch (error) {
      message.error(error.response?.data?.message || 'Ошибка удаления пользователя')
    }
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      
      if (editingUser) {
        await userService.update(editingUser.id, values)
        message.success('Пользователь обновлен')
      } else {
        await userService.create(values)
        message.success('Пользователь создан')
      }
      
      setIsModalOpen(false)
      fetchUsers()
    } catch (error) {
      if (error.errorFields) {
        // Validation error
        return
      }
      message.error(error.response?.data?.message || 'Ошибка сохранения пользователя')
    }
  }

  const handlePasswordModalOk = async () => {
    try {
      const values = await passwordForm.validateFields()
      
      await userService.updatePassword(editingUser.id, values)
      message.success('Пароль обновлен')
      
      setIsPasswordModalOpen(false)
      passwordForm.resetFields()
    } catch (error) {
      if (error.errorFields) {
        return
      }
      message.error(error.response?.data?.message || 'Ошибка обновления пароля')
    }
  }

  const handleModalCancel = () => {
    setIsModalOpen(false)
    form.resetFields()
  }

  const handlePasswordModalCancel = () => {
    setIsPasswordModalOpen(false)
    passwordForm.resetFields()
  }

  const filteredUsers = users.filter((user) => {
    const searchLower = searchText.toLowerCase()
    const searchMatch =
      (user.email?.toLowerCase().includes(searchLower) || false) ||
      (user.firstName?.toLowerCase().includes(searchLower) || false) ||
      (user.lastName?.toLowerCase().includes(searchLower) || false) ||
      (user.identificationNumber?.toLowerCase().includes(searchLower) || false)

    // Фильтрация по статусу
    let statusMatch = true
    if (statusFilter.length > 0) {
      const isActive = user.isActive
      statusMatch = 
        (statusFilter.includes('active') && isActive) ||
        (statusFilter.includes('inactive') && !isActive)
    }

    return searchMatch && statusMatch
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          padding: '0 24px 0 24px',
          paddingTop: 24,
          flexWrap: 'wrap',
          gap: 16,
          flexShrink: 0,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          Пользователи
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Добавить пользователя
        </Button>
      </div>

      {/* Поиск и фильтр */}
      <div style={{ marginBottom: 16, paddingLeft: 24, paddingRight: 24, flexShrink: 0, display: 'flex', gap: 12, alignItems: 'center' }}>
        <Input
          placeholder="Поиск по email или ФИО..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          size="large"
          style={{ maxWidth: 500 }}
        />
        <Popover
          content={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 200 }}>
              <div style={{ fontSize: 12, fontWeight: 'bold', color: '#666' }}>Статус</div>
              <Checkbox.Group
                value={statusFilter}
                onChange={setStatusFilter}
              >
                <Checkbox value="active">Активен</Checkbox>
                <Checkbox value="inactive">Неактивен</Checkbox>
              </Checkbox.Group>
            </div>
          }
          trigger="click"
          placement="bottomLeft"
        >
          <Button
            type={statusFilter.length > 0 ? 'primary' : 'default'}
            icon={<FilterOutlined />}
          >
            Фильтр
          </Button>
        </Popover>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', paddingLeft: 24, paddingRight: 24, paddingBottom: 24 }}>
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Всего: ${total}`,
          }}
          scroll={{ x: 'max-content', y: 'calc(100vh - 400px)' }}
          style={{ height: '100%' }}
        />
      </div>

      {/* Modal для создания/редактирования пользователя */}
      <Modal
        title={editingUser ? 'Редактировать пользователя' : 'Добавить пользователя'}
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText={editingUser ? 'Сохранить' : 'Добавить'}
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Введите корректный email' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="user@example.com" />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="Пароль"
              rules={[
                { required: true, message: 'Введите пароль' },
                { min: 6, message: 'Пароль должен содержать минимум 6 символов' },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
            </Form.Item>
          )}

          <Form.Item
            name="firstName"
            label="ФИО"
            rules={[{ required: true, message: 'Введите ФИО' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="role"
            label="Роль"
            rules={[{ required: true, message: 'Выберите роль' }]}
            initialValue="user"
          >
            <Select>
              {Object.entries(roleLabels).map(([key, value]) => (
                <Select.Option key={key} value={key}>
                  {value.text}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="counterpartyId"
            label="Контрагент"
            tooltip="Необязательно. Если указан, пользователь привязан к конкретному контрагенту"
          >
            <Select
              placeholder="Не выбрано"
              allowClear
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {counterparties.map(c => (
                <Select.Option key={c.id} value={c.id}>
                  {c.name} ({c.inn})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal для изменения пароля */}
      <Modal
        title="Изменить пароль"
        open={isPasswordModalOpen}
        onOk={handlePasswordModalOk}
        onCancel={handlePasswordModalCancel}
        okText="Изменить"
        cancelText="Отмена"
      >
        <Form form={passwordForm} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="newPassword"
            label="Новый пароль"
            rules={[
              { required: true, message: 'Введите новый пароль' },
              { min: 6, message: 'Пароль должен содержать минимум 6 символов' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Подтвердите пароль"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Подтвердите пароль' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('Пароли не совпадают'))
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default UsersPage

