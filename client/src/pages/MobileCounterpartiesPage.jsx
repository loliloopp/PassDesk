import { useState, useEffect } from 'react';
import { Input, App, Button, Modal, Form, Select } from 'antd';
import { SearchOutlined, LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { counterpartyService } from '@/services/counterpartyService';
import MobileCounterpartiesList from '@/components/Admin/MobileCounterpartiesList';

/**
 * Мобильная страница управления контрагентами
 * Адаптирована для мобильных устройств
 */
const typeMap = {
  customer: { label: 'Заказчик', color: 'blue' },
  contractor: { label: 'Подрядчик', color: 'green' },
  general_contractor: { label: 'Генподрядчик', color: 'gold' }
};

const MobileCounterpartiesPage = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [counterparties, setCounterparties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCounterparty, setEditingCounterparty] = useState(null);
  const [form] = Form.useForm();

  // Загрузка данных при монтировании
  useEffect(() => {
    fetchCounterparties();
  }, []);

  // Загрузить контрагентов
  const fetchCounterparties = async () => {
    setLoading(true);
    try {
      const { data } = await counterpartyService.getAll({ limit: 100 });
      setCounterparties(data.data.counterparties || []);
    } catch (error) {
      console.error('Error fetching counterparties:', error);
      setCounterparties([]);
      message.error('Ошибка загрузки контрагентов');
    } finally {
      setLoading(false);
    }
  };

  // Отфильтрованный список контрагентов
  const filteredCounterparties = counterparties.filter((counterparty) => {
    const searchLower = searchText.toLowerCase();
    return (
      counterparty.name.toLowerCase().includes(searchLower) ||
      counterparty.inn.toLowerCase().includes(searchLower)
    );
  });

  // Открыть форму редактирования
  const handleEdit = (counterparty) => {
    setEditingCounterparty(counterparty);
    form.setFieldsValue(counterparty);
    setIsModalOpen(true);
  };

  // Сохранить изменения контрагента
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      await counterpartyService.update(editingCounterparty.id, values);
      message.success('Контрагент обновлен');
      setIsModalOpen(false);
      fetchCounterparties();
    } catch (error) {
      if (error.errorFields) {
        return;
      }
      message.error(error.response?.data?.message || 'Ошибка сохранения контрагента');
    }
  };

  // Закрыть модальное окно
  const handleModalCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
    setEditingCounterparty(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Поиск и кнопка Выход */}
      <div style={{ padding: '12px 16px 8px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <Input
          placeholder="Поиск по названию или ИНН..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          size="large"
          style={{ borderRadius: 4, flex: 1 }}
        />
        <Button
          type="default"
          icon={<LogoutOutlined />}
          onClick={() => navigate('/admin')}
          style={{ flexShrink: 0 }}
        >
          Назад
        </Button>
      </div>

      {/* Список контрагентов */}
      <MobileCounterpartiesList
        counterparties={filteredCounterparties}
        loading={loading}
        onRefresh={fetchCounterparties}
        onEdit={handleEdit}
      />

      {/* Modal для редактирования контрагента */}
      <Modal
        title="Редактировать контрагента"
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={320}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="inn"
            label="ИНН"
            rules={[{ required: true, message: 'Введите ИНН' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="kpp"
            label="КПП"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="type"
            label="Тип"
            rules={[{ required: true, message: 'Выберите тип' }]}
          >
            <Select>
              {Object.entries(typeMap).map(([key, value]) => (
                <Select.Option key={key} value={key}>
                  {value.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="phone"
            label="Телефон"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="address"
            label="Адрес"
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MobileCounterpartiesPage;

