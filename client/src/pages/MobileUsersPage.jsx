import { useState, useEffect } from 'react';
import { Input, App, Modal, Form, Select, Space, Button, Popover, Checkbox } from 'antd';
import { SearchOutlined, LockOutlined, UserOutlined, LogoutOutlined, FilterOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { userService } from '@/services/userService';
import { counterpartyService } from '@/services/counterpartyService';
import { useAuthStore } from '@/store/authStore';
import MobileUsersList from '@/components/Admin/MobileUsersList';

/**
 * Мобильная страница управления пользователями
 * Адаптирована для мобильных устройств
 */
const MobileUsersPage = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [counterparties, setCounterparties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [editingUser, setEditingUser] = useState(null);
  const { user: currentUser } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState([]); // [] - нет фильтра, ['active'] - только активные, ['inactive'] - только неактивные

  // Роли
  const roleLabels = {
    admin: { text: 'Администратор', color: 'red' },
    user: { text: 'Пользователь', color: 'default' },
  };

  // Загрузка данных при монтировании
  useEffect(() => {
    fetchUsers();
    fetchCounterparties();
  }, []);

  // Загрузить пользователей
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await userService.getAll();
      setUsers(response?.data?.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      message.error('Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  // Загрузить контрагентов
  const fetchCounterparties = async () => {
    try {
      const { data } = await counterpartyService.getAll({ limit: 100 });
      setCounterparties(data.data.counterparties);
    } catch (error) {
      console.error('Error loading counterparties:', error);
      message.error('Ошибка загрузки контрагентов');
    }
  };

  // Отфильтрованный список пользователей
  const filteredUsers = users.filter((user) => {
    const searchLower = searchText.toLowerCase();
    const searchMatch =
      user.email.toLowerCase().includes(searchLower) ||
      user.firstName.toLowerCase().includes(searchLower) ||
      user.lastName.toLowerCase().includes(searchLower);

    // Фильтрация по статусу
    let statusMatch = true;
    if (statusFilter.length > 0) {
      const isActive = user.isActive;
      statusMatch = 
        (statusFilter.includes('active') && isActive) ||
        (statusFilter.includes('inactive') && !isActive);
    }

    return searchMatch && statusMatch;
  });

  // Переключить статус пользователя
  const handleToggleStatus = async (id) => {
    try {
      await userService.toggleStatus(id);
      message.success('Статус пользователя изменен');
      fetchUsers();
    } catch (error) {
      message.error(error.response?.data?.message || 'Ошибка изменения статуса');
    }
  };

  // Открыть форму редактирования
  const handleEdit = (user) => {
    setEditingUser(user);
    form.setFieldsValue(user);
    setIsModalOpen(true);
  };

  // Открыть форму изменения пароля
  const handleChangePassword = (user) => {
    setEditingUser(user);
    passwordForm.resetFields();
    setIsPasswordModalOpen(true);
  };

  // Сохранить изменения пользователя
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();

      if (editingUser) {
        await userService.update(editingUser.id, values);
        message.success('Пользователь обновлен');
      } else {
        await userService.create(values);
        message.success('Пользователь создан');
      }

      setIsModalOpen(false);
      form.resetFields();
      fetchUsers();
    } catch (error) {
      if (error.errorFields) {
        return;
      }
      message.error(error.response?.data?.message || 'Ошибка сохранения пользователя');
    }
  };

  // Сохранить новый пароль
  const handlePasswordModalOk = async () => {
    try {
      const values = await passwordForm.validateFields();

      await userService.updatePassword(editingUser.id, values);
      message.success('Пароль обновлен');

      setIsPasswordModalOpen(false);
      passwordForm.resetFields();
    } catch (error) {
      if (error.errorFields) {
        return;
      }
      message.error(error.response?.data?.message || 'Ошибка обновления пароля');
    }
  };

  // Закрыть модальное окно редактирования
  const handleModalCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
    setEditingUser(null);
  };

  // Закрыть модальное окно изменения пароля
  const handlePasswordModalCancel = () => {
    setIsPasswordModalOpen(false);
    passwordForm.resetFields();
  };

  // Содержимое Popover фильтра
  const filterContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 'bold', color: '#666' }}>Статус</div>
      <Checkbox.Group
        value={statusFilter}
        onChange={setStatusFilter}
      >
        <Checkbox value="active">Активен</Checkbox>
        <Checkbox value="inactive">Неактивен</Checkbox>
      </Checkbox.Group>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Поиск и фильтр */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, borderBottom: '1px solid #f0f0f0' }}>
        <Input
          placeholder="Поиск по email или ФИО..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          size="large"
          style={{ borderRadius: 4, flex: 1 }}
        />
        <Popover
          content={filterContent}
          trigger="click"
          placement="bottomRight"
        >
          <Button
            type={statusFilter.length > 0 ? 'primary' : 'default'}
            icon={<FilterOutlined />}
            size="large"
            style={{ flexShrink: 0 }}
          />
        </Popover>
      </div>

      {/* Список пользователей */}
      <MobileUsersList
        users={filteredUsers}
        counterparties={counterparties}
        loading={loading}
        currentUser={currentUser}
        onStatusToggle={handleToggleStatus}
        onEdit={handleEdit}
      />

      {/* Modal для редактирования пользователя */}
      <Modal
        title={editingUser ? 'Редактировать пользователя' : 'Добавить пользователя'}
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        width={320}
        okText={editingUser ? 'Сохранить' : 'Добавить'}
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
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
            label="Имя"
            rules={[{ required: true, message: 'Введите имя' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="lastName"
            label="Фамилия"
            rules={[{ required: true, message: 'Введите фамилию' }]}
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
        width={320}
      >
        <Form form={passwordForm} layout="vertical" style={{ marginTop: 16 }}>
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
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Пароли не совпадают'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MobileUsersPage;

