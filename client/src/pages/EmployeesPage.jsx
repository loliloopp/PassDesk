import { useState } from 'react'
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
  message,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
} from '@ant-design/icons'

const { Title } = Typography

const EmployeesPage = () => {
  const [searchText, setSearchText] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form] = Form.useForm()
  const [editingEmployee, setEditingEmployee] = useState(null)

  // Временные данные (позже заменим на реальные из API)
  const [employees] = useState([
    {
      id: 1,
      firstName: 'Алексей',
      lastName: 'Смирнов',
      middleName: 'Иванович',
      position: 'Менеджер по продажам',
      department: 'Отдел продаж',
      email: 'smirnov@company.com',
      phone: '+7 (999) 123-45-67',
      isActive: true,
    },
    {
      id: 2,
      firstName: 'Мария',
      lastName: 'Петрова',
      middleName: 'Сергеевна',
      position: 'Бухгалтер',
      department: 'Бухгалтерия',
      email: 'petrova@company.com',
      phone: '+7 (999) 234-56-78',
      isActive: true,
    },
    {
      id: 3,
      firstName: 'Дмитрий',
      lastName: 'Козлов',
      middleName: 'Александрович',
      position: 'Программист',
      department: 'IT отдел',
      email: 'kozlov@company.com',
      phone: '+7 (999) 345-67-89',
      isActive: true,
    },
    {
      id: 4,
      firstName: 'Елена',
      lastName: 'Новикова',
      position: 'HR менеджер',
      department: 'Кадры',
      email: 'novikova@company.com',
      phone: '+7 (999) 456-78-90',
      isActive: true,
    },
    {
      id: 5,
      firstName: 'Сергей',
      lastName: 'Волков',
      middleName: 'Петрович',
      position: 'Охранник',
      department: 'Безопасность',
      phone: '+7 (999) 567-89-01',
      isActive: true,
    },
  ])

  const columns = [
    {
      title: 'ФИО',
      key: 'fullName',
      render: (_, record) => (
        <Space>
          <UserOutlined style={{ color: '#2563eb' }} />
          <span>
            {record.lastName} {record.firstName} {record.middleName || ''}
          </span>
        </Space>
      ),
      sorter: (a, b) => a.lastName.localeCompare(b.lastName),
    },
    {
      title: 'Должность',
      dataIndex: 'position',
      key: 'position',
      sorter: (a, b) => a.position.localeCompare(b.position),
    },
    {
      title: 'Отдел',
      dataIndex: 'department',
      key: 'department',
      sorter: (a, b) => a.department.localeCompare(b.department),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => email || '-',
    },
    {
      title: 'Телефон',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Статус',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Активен' : 'Неактивен'}
        </Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="Редактировать">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Удалить">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ]

  const handleAdd = () => {
    setEditingEmployee(null)
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleEdit = (employee) => {
    setEditingEmployee(employee)
    form.setFieldsValue(employee)
    setIsModalOpen(true)
  }

  const handleDelete = (employee) => {
    Modal.confirm({
      title: 'Удаление сотрудника',
      content: `Вы уверены, что хотите удалить сотрудника ${employee.firstName} ${employee.lastName}?`,
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: () => {
        message.success('Сотрудник удален')
      },
    })
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      console.log('Form values:', values)
      message.success(
        editingEmployee ? 'Сотрудник обновлен' : 'Сотрудник добавлен'
      )
      setIsModalOpen(false)
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const handleModalCancel = () => {
    setIsModalOpen(false)
    form.resetFields()
  }

  const filteredEmployees = employees.filter((emp) => {
    const searchLower = searchText.toLowerCase()
    return (
      emp.firstName.toLowerCase().includes(searchLower) ||
      emp.lastName.toLowerCase().includes(searchLower) ||
      emp.position.toLowerCase().includes(searchLower) ||
      emp.department.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          Сотрудники
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Добавить сотрудника
        </Button>
      </div>

      <Space style={{ marginBottom: 16, width: '100%' }} direction="vertical">
        <Input
          placeholder="Поиск по имени, должности, отделу..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          size="large"
          style={{ maxWidth: 500 }}
        />
      </Space>

      <Table
        columns={columns}
        dataSource={filteredEmployees}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total}`,
        }}
      />

      <Modal
        title={editingEmployee ? 'Редактировать сотрудника' : 'Добавить сотрудника'}
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText={editingEmployee ? 'Сохранить' : 'Добавить'}
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="lastName"
            label="Фамилия"
            rules={[{ required: true, message: 'Введите фамилию' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="firstName"
            label="Имя"
            rules={[{ required: true, message: 'Введите имя' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="middleName" label="Отчество">
            <Input />
          </Form.Item>

          <Form.Item
            name="position"
            label="Должность"
            rules={[{ required: true, message: 'Введите должность' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="department"
            label="Отдел"
            rules={[{ required: true, message: 'Введите отдел' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[{ type: 'email', message: 'Введите корректный email' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="phone" label="Телефон">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default EmployeesPage
