import { useState, useEffect } from 'react';
import { Form, Select, Button, message, Spin, Typography, Space, Divider } from 'antd';
import { SaveOutlined, UploadOutlined, FormOutlined } from '@ant-design/icons';
import settingsService from '@/services/settingsService';
import { counterpartyService } from '@/services/counterpartyService';
import EmployeeImportModal from '@/components/Employees/EmployeeImportModal';
import EmployeeFieldsSettingsModal from '@/components/Admin/EmployeeFieldsSettingsModal';

const { Title, Text } = Typography;

const SettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [counterparties, setCounterparties] = useState([]);
  const [defaultCounterpartyId, setDefaultCounterpartyId] = useState('');
  const [form] = Form.useForm();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFieldsSettingsOpen, setIsFieldsSettingsOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Загружаем все контрагенты без ограничения
      const counterpartiesResponse = await counterpartyService.getAll({ limit: 10000, page: 1 });
      console.log('Counterparties response:', counterpartiesResponse);
      
      // Проверяем разные варианты структуры ответа
      const counterpartiesList = 
        counterpartiesResponse?.data?.data?.counterparties || 
        counterpartiesResponse?.data?.counterparties || 
        counterpartiesResponse?.data?.data ||
        counterpartiesResponse?.data ||
        [];
      
      console.log('Counterparties list:', counterpartiesList);
      setCounterparties(counterpartiesList);

      // Загружаем настройки
      const settingsResponse = await settingsService.getSettings();
      console.log('Settings response:', settingsResponse);
      
      // Проверяем структуру ответа
      const settingsArray = settingsResponse?.data?.data || settingsResponse?.data || [];
      const defaultCounterpartySetting = settingsArray.find(
        s => s.key === 'default_counterparty_id'
      );
      
      if (defaultCounterpartySetting && defaultCounterpartySetting.value) {
        setDefaultCounterpartyId(defaultCounterpartySetting.value);
        form.setFieldsValue({
          defaultCounterpartyId: defaultCounterpartySetting.value
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      message.error('Ошибка загрузки настроек');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      await settingsService.updateSetting(
        'default_counterparty_id',
        values.defaultCounterpartyId
      );

      setDefaultCounterpartyId(values.defaultCounterpartyId);
      message.success('Настройки успешно сохранены');
    } catch (error) {
      console.error('Error saving settings:', error);
      message.error(error.response?.data?.message || 'Ошибка сохранения настроек');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden', padding: 24 }}>
      <div style={{ flexShrink: 0 }}>
        <Title level={4}>Регистрация новых пользователей</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          При регистрации новые пользователи автоматически будут привязаны к выбранному контрагенту
        </Text>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', maxWidth: '800px' }}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
        <Form.Item
          name="defaultCounterpartyId"
          label="Контрагент по умолчанию"
          rules={[
            { required: true, message: 'Выберите контрагента по умолчанию' }
          ]}
        >
          <Select
            showSearch
            placeholder="Выберите контрагента"
            optionFilterProp="children"
            size="large"
            filterOption={(input, option) =>
              (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {counterparties.map(c => (
              <Select.Option key={c.id} value={c.id}>
                {c.name} ({c.type === 'customer' ? 'Заказчик' : c.type === 'contractor' ? 'Подрядчик' : 'Генподрядчик'})
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={saving}
            size="large"
          >
            Сохранить настройки
          </Button>
        </Form.Item>
        </Form>
      </div>

      <Divider />

      <div style={{ flexShrink: 0, marginTop: '24px' }}>
        <Title level={4}>Настройка форм</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Управление отображением и обязательностью полей в форме сотрудника
        </Text>
        <Button
          icon={<FormOutlined />}
          onClick={() => setIsFieldsSettingsOpen(true)}
          size="large"
        >
          Настройка полей сотрудника
        </Button>
      </div>

      <Divider />

      <div style={{ flexShrink: 0, marginTop: '24px' }}>
        <Title level={4}>Загрузка данных</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Импортируйте сотрудников из файла Excel
        </Text>
        <Button
          type="primary"
          icon={<UploadOutlined />}
          onClick={() => setIsImportModalOpen(true)}
          size="large"
        >
          Загрузка сотрудников из Excel
        </Button>
      </div>

      <EmployeeImportModal
        visible={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          message.success('Сотрудники успешно импортированы');
          setIsImportModalOpen(false);
        }}
      />
      
      <EmployeeFieldsSettingsModal 
        visible={isFieldsSettingsOpen}
        onCancel={() => setIsFieldsSettingsOpen(false)}
      />
    </div>
  );
};

export default SettingsPage;

