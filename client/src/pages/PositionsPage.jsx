import { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Modal, Form, message, Popconfirm, Upload } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons';
import positionService from '../services/positionService';
import settingsService from '../services/settingsService';
import { useAuthStore } from '../store/authStore';
import * as XLSX from 'xlsx';

const PositionsPage = () => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [defaultCounterpartyId, setDefaultCounterpartyId] = useState(null);
  const [form] = Form.useForm();
  const { user } = useAuthStore();

  // Проверяем, является ли текущий пользователь пользователем контрагента по умолчанию
  const canEditAndDelete = user?.counterpartyId === defaultCounterpartyId;

  // Загрузка должностей
  const fetchPositions = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const response = await positionService.getAll({
        page,
        limit: 50,
        search
      });
      setPositions(response.data.data.positions);
      setTotalCount(response.data.data.totalCount);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching positions:', error);
      message.error(error.userMessage || 'Ошибка загрузки должностей');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
    fetchDefaultCounterparty();
  }, []);

  // Загрузка настроек контрагента по умолчанию
  const fetchDefaultCounterparty = async () => {
    try {
      const response = await settingsService.getPublicSettings();
      setDefaultCounterpartyId(response.data.defaultCounterpartyId);
    } catch (error) {
      console.error('Error loading default counterparty:', error);
    }
  };

  // Поиск
  const handleSearch = (value) => {
    setSearchText(value);
    fetchPositions(1, value);
  };

  // Открыть модальное окно
  const handleAdd = () => {
    setEditingPosition(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (position) => {
    setEditingPosition(position);
    form.setFieldsValue({ name: position.name });
    setIsModalVisible(true);
  };

  // Сохранить должность
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (editingPosition) {
        await positionService.update(editingPosition.id, values);
        message.success('Должность обновлена');
      } else {
        await positionService.create(values);
        message.success('Должность создана');
      }

      setIsModalVisible(false);
      form.resetFields();
      fetchPositions(currentPage, searchText);
    } catch (error) {
      console.error('Error saving position:', error);
      if (error.errorFields) {
        // Ошибка валидации формы
        return;
      }
      message.error(error.response?.data?.message || 'Ошибка сохранения должности');
    } finally {
      setLoading(false);
    }
  };

  // Удалить должность
  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await positionService.delete(id);
      message.success('Должность удалена');
      fetchPositions(currentPage, searchText);
    } catch (error) {
      console.error('Error deleting position:', error);
      message.error(error.response?.data?.message || 'Ошибка удаления должности');
    } finally {
      setLoading(false);
    }
  };

  // Импорт из Excel
  const handleImportExcel = (file) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Читаем первый лист
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        // Извлекаем названия должностей из столбца A (индекс 0)
        const positionNames = jsonData
          .map(row => row[0]) // Берём первый столбец
          .filter(name => name && typeof name === 'string' && name.trim() !== '');
        
        if (positionNames.length === 0) {
          message.warning('В файле Excel не найдено должностей в столбце A');
          return;
        }

        // Отправляем на сервер
        setLoading(true);
        const response = await positionService.import(positionNames);
        
        const { processed, errors, total } = response.data.data;
        
        // Формируем сообщение о результатах
        Modal.success({
          title: 'Импорт завершён',
          content: (
            <div>
              <p><strong>Всего записей в файле:</strong> {total}</p>
              <p><strong>Успешно обработано:</strong> {processed}</p>
              {errors.length > 0 && (
                <>
                  <p style={{ color: 'red' }}><strong>Ошибок:</strong> {errors.length}</p>
                  <div style={{ maxHeight: 200, overflow: 'auto', marginTop: 8 }}>
                    <ul>
                      {errors.map((item, index) => (
                        <li key={index} style={{ color: 'red' }}>
                          {item.name} - {item.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          ),
          width: 600
        });

        fetchPositions(currentPage, searchText);
      } catch (error) {
        console.error('Error importing Excel:', error);
        message.error('Ошибка импорта файла Excel');
      } finally {
        setLoading(false);
      }
    };
    
    reader.readAsArrayBuffer(file);
    return false; // Предотвращаем автоматическую загрузку
  };

  // Колонки таблицы
  const columns = [
    {
      title: '№',
      key: 'index',
      width: 60,
      render: (_, __, index) => (currentPage - 1) * 50 + index + 1
    },
    {
      title: 'Название должности',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name)
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          {canEditAndDelete ? (
            <>
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                Редактировать
              </Button>
              <Popconfirm
                title="Удалить должность?"
                description="Вы уверены, что хотите удалить эту должность?"
                onConfirm={() => handleDelete(record.id)}
                okText="Да"
                cancelText="Нет"
              >
                <Button type="link" danger icon={<DeleteOutlined />}>
                  Удалить
                </Button>
              </Popconfirm>
            </>
          ) : (
            <span style={{ color: '#999' }}>Нет прав</span>
          )}
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '12px 16px' }}>
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Должности</h1>
        <Space size="small">
          <Input.Search
            placeholder="Поиск"
            allowClear
            style={{ width: 200 }}
            onSearch={handleSearch}
            size="small"
          />
          {canEditAndDelete && (
            <>
              <Upload
                accept=".xlsx, .xls"
                beforeUpload={handleImportExcel}
                showUploadList={false}
              >
                <Button icon={<UploadOutlined />} size="small">
                  Импорт
                </Button>
              </Upload>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} size="small">
                Добавить
              </Button>
            </>
          )}
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={positions}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ y: 'calc(100vh - 380px)' }}
        pagination={{
          current: currentPage,
          pageSize: 50,
          total: totalCount,
          onChange: (page) => fetchPositions(page, searchText),
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total) => `Всего: ${total}`,
          size: 'small'
        }}
      />

      {/* Модальное окно для добавления/редактирования */}
      <Modal
        title={editingPosition ? 'Редактировать должность' : 'Добавить должность'}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Название должности"
            rules={[
              { required: true, message: 'Введите название должности' },
              { max: 255, message: 'Максимум 255 символов' }
            ]}
          >
            <Input placeholder="Введите название должности" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PositionsPage;

