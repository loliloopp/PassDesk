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
  Select,
  DatePicker,
  message,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

const { Title } = Typography
const { RangePicker } = DatePicker

const DATE_FORMAT = 'DD.MM.YYYY'

const PassesPage = () => {
  const [searchText, setSearchText] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form] = Form.useForm()
  const [editingPass, setEditingPass] = useState(null)

  // Временные данные (позже заменим на реальные из API)
  const [passes] = useState([
    {
      id: 1,
      passNumber: 'PASS-1731676800974-001',
      employeeName: 'Алексей Смирнов',
      passType: 'permanent',
      validFrom: '2024-11-15',
      validUntil: '2025-05-15',
      accessZones: ['building_a', 'floor_1', 'floor_2'],
      status: 'active',
    },
    {
      id: 2,
      passNumber: 'PASS-1731676800974-002',
      employeeName: 'Мария Петрова',
      passType: 'permanent',
      validFrom: '2024-11-15',
      validUntil: '2025-05-15',
      accessZones: ['building_a', 'floor_3'],
      status: 'active',
    },
    {
      id: 3,
      passNumber: 'PASS-1731676800974-003',
      employeeName: 'Дмитрий Козлов',
      passType: 'permanent',
      validFrom: '2024-11-15',
      validUntil: '2025-05-15',
      accessZones: ['building_b', 'server_room'],
      status: 'active',
    },
    {
      id: 4,
      passNumber: 'PASS-1731676800974-004',
      employeeName: 'Елена Новикова',
      passType: 'temporary',
      validFrom: '2024-10-15',
      validUntil: '2024-11-15',
      accessZones: ['building_a', 'floor_1'],
      status: 'expired',
    },
    {
      id: 5,
      passNumber: 'PASS-1731676800974-005',
      employeeName: 'Сергей Волков',
      passType: 'permanent',
      validFrom: '2024-11-15',
      validUntil: '2025-05-15',
      accessZones: ['building_a', 'building_b', 'parking'],
      status: 'active',
    },
  ])

  const passTypeLabels = {
    temporary: 'Временный',
    permanent: 'Постоянный',
    visitor: 'Посетитель',
    contractor: 'Подрядчик',
  }

  const statusColors = {
    active: 'success',
    expired: 'default',
    revoked: 'error',
    pending: 'warning',
  }

  const statusLabels = {
    active: 'Активен',
    expired: 'Истек',
    revoked: 'Отозван',
    pending: 'Ожидание',
  }

  const columns = [
    {
      title: '№ Пропуска',
      dataIndex: 'passNumber',
      key: 'passNumber',
      width: 200,
    },
    {
      title: 'Сотрудник',
      dataIndex: 'employeeName',
      key: 'employeeName',
      sorter: (a, b) => a.employeeName.localeCompare(b.employeeName),
    },
    {
      title: 'Тип',
      dataIndex: 'passType',
      key: 'passType',
      render: (type) => passTypeLabels[type],
      filters: Object.entries(passTypeLabels).map(([key, label]) => ({
        text: label,
        value: key,
      })),
      onFilter: (value, record) => record.passType === value,
    },
    {
      title: 'Действителен до',
      dataIndex: 'validUntil',
      key: 'validUntil',
      sorter: (a, b) => new Date(a.validUntil) - new Date(b.validUntil),
      render: (date) => date ? dayjs(date).format(DATE_FORMAT) : '-'
    },
    {
      title: 'Зоны доступа',
      dataIndex: 'accessZones',
      key: 'accessZones',
      render: (zones) => (
        <Space size={4} wrap>
          {zones.slice(0, 2).map((zone, index) => (
            <Tag key={index} color="blue">
              {zone}
            </Tag>
          ))}
          {zones.length > 2 && <Tag>+{zones.length - 2}</Tag>}
        </Space>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColors[status]}>{statusLabels[status]}</Tag>
      ),
      filters: Object.entries(statusLabels).map(([key, label]) => ({
        text: label,
        value: key,
      })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Tooltip title="Редактировать">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          {record.status === 'active' && (
            <Tooltip title="Отозвать">
              <Button
                type="text"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleRevoke(record)}
              />
            </Tooltip>
          )}
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
    setEditingPass(null)
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleEdit = (pass) => {
    setEditingPass(pass)
    form.setFieldsValue({
      ...pass,
      dateRange: [dayjs(pass.validFrom), dayjs(pass.validUntil)],
    })
    setIsModalOpen(true)
  }

  const handleRevoke = (pass) => {
    Modal.confirm({
      title: 'Отозвать пропуск',
      content: `Вы уверены, что хотите отозвать пропуск ${pass.passNumber}?`,
      okText: 'Отозвать',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: () => {
        message.success('Пропуск отозван')
      },
    })
  }

  const handleDelete = (pass) => {
    Modal.confirm({
      title: 'Удаление пропуска',
      content: `Вы уверены, что хотите удалить пропуск ${pass.passNumber}?`,
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: () => {
        message.success('Пропуск удален')
      },
    })
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      console.log('Form values:', values)
      message.success(editingPass ? 'Пропуск обновлен' : 'Пропуск создан')
      setIsModalOpen(false)
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const handleModalCancel = () => {
    setIsModalOpen(false)
    form.resetFields()
  }

  const filteredPasses = passes.filter((pass) => {
    const searchLower = searchText.toLowerCase()
    return (
      pass.passNumber.toLowerCase().includes(searchLower) ||
      pass.employeeName.toLowerCase().includes(searchLower)
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
          Пропуска
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Создать пропуск
        </Button>
      </div>

      <Space style={{ marginBottom: 16, width: '100%' }} direction="vertical">
        <Input
          placeholder="Поиск по номеру пропуска или сотруднику..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          size="large"
          style={{ maxWidth: 500 }}
        />
      </Space>

      <Table
        columns={columns}
        dataSource={filteredPasses}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total}`,
        }}
      />

      <Modal
        title={editingPass ? 'Редактировать пропуск' : 'Создать пропуск'}
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={600}
        okText={editingPass ? 'Сохранить' : 'Создать'}
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="employeeId"
            label="Сотрудник"
            rules={[{ required: true, message: 'Выберите сотрудника' }]}
          >
            <Select placeholder="Выберите сотрудника">
              <Select.Option value={1}>Алексей Смирнов</Select.Option>
              <Select.Option value={2}>Мария Петрова</Select.Option>
              <Select.Option value={3}>Дмитрий Козлов</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="passType"
            label="Тип пропуска"
            rules={[{ required: true, message: 'Выберите тип пропуска' }]}
          >
            <Select placeholder="Выберите тип">
              {Object.entries(passTypeLabels).map(([key, label]) => (
                <Select.Option key={key} value={key}>
                  {label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="Период действия"
            rules={[{ required: true, message: 'Выберите период действия' }]}
          >
            <RangePicker 
              style={{ width: '100%' }} 
              format={DATE_FORMAT}
              placeholder={['ДД.ММ.ГГГГ', 'ДД.ММ.ГГГГ']}
            />
          </Form.Item>

          <Form.Item
            name="accessZones"
            label="Зоны доступа"
            rules={[{ required: true, message: 'Выберите зоны доступа' }]}
          >
            <Select
              mode="multiple"
              placeholder="Выберите зоны доступа"
              options={[
                { label: 'Здание А', value: 'building_a' },
                { label: 'Здание Б', value: 'building_b' },
                { label: 'Этаж 1', value: 'floor_1' },
                { label: 'Этаж 2', value: 'floor_2' },
                { label: 'Этаж 3', value: 'floor_3' },
                { label: 'Серверная', value: 'server_room' },
                { label: 'Парковка', value: 'parking' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default PassesPage
