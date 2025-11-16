import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Typography,
  Tag,
  Tooltip,
  Modal,
  message,
  Input,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { applicationService } from '../services/applicationService';
import ApplicationFormModal from '../components/Applications/ApplicationFormModal';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Search } = Input;

const statusMap = {
  draft: { label: 'Черновик', color: 'default' },
  submitted: { label: 'Подана', color: 'blue' },
  approved: { label: 'Одобрена', color: 'success' },
  rejected: { label: 'Отклонена', color: 'error' }
};

const ApplicationsPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: response } = await applicationService.getAll();
      setData(response.data.applications);
    } catch (error) {
      message.error('Ошибка при загрузке заявок');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    setModalVisible(true);
  };

  const handleCopy = async (id) => {
    try {
      await applicationService.copy(id);
      message.success('Заявка скопирована');
      fetchData();
    } catch (error) {
      message.error('Ошибка при копировании');
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Удалить заявку?',
      content: 'Это действие нельзя отменить',
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          await applicationService.delete(id);
          message.success('Заявка удалена');
          fetchData();
        } catch (error) {
          message.error('Ошибка при удалении');
        }
      },
    });
  };

  const columns = [
    {
      title: '№ заявки',
      dataIndex: 'applicationNumber',
      key: 'applicationNumber',
      width: 200,
    },
    {
      title: 'Объект',
      dataIndex: ['constructionSite', 'shortName'],
      key: 'constructionSite',
      ellipsis: true,
    },
    {
      title: 'Договор генподряда',
      dataIndex: ['generalContract', 'contractNumber'],
      key: 'generalContract',
    },
    {
      title: 'Договор подряда',
      dataIndex: ['subcontract', 'contractNumber'],
      key: 'subcontract',
      render: (value) => value || '-',
    },
    {
      title: 'Сотрудников',
      dataIndex: 'employees',
      key: 'employees',
      render: (employees) => (employees && employees.length) || 0,
      width: 100,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusMap[status]?.color}>
          {statusMap[status]?.label}
        </Tag>
      ),
      filters: Object.entries(statusMap).map(([key, value]) => ({
        text: value.label,
        value: key,
      })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Дата создания',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('DD.MM.YYYY HH:mm'),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="Редактировать">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Копировать">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => handleCopy(record.id)}
            />
          </Tooltip>
          <Tooltip title="Удалить">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const filteredData = data.filter((item) => {
    const searchLower = searchText.toLowerCase();
    return (
      item.applicationNumber.toLowerCase().includes(searchLower) ||
      item.counterparty?.name.toLowerCase().includes(searchLower) ||
      item.constructionSite?.shortName.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={2} style={{ margin: 0 }}>
          Заявки
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Создать заявку
        </Button>
      </div>

      <Space style={{ marginBottom: 16 }}>
        <Search
          placeholder="Поиск по номеру, контрагенту, объекту..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 400 }}
          allowClear
        />
      </Space>

      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1400 }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total}`,
        }}
      />

      <ApplicationFormModal
        visible={modalVisible}
        editingId={editingId}
        onCancel={() => setModalVisible(false)}
        onSuccess={() => {
          setModalVisible(false);
          fetchData();
        }}
      />
    </div>
  );
};

export default ApplicationsPage;

