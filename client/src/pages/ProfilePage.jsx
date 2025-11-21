import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Space,
  Alert,
  Spin,
  message,
  Grid,
  Modal,
  Divider,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  IdcardOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import profileService from '@/services/profileService';
import { forbiddenPasswordValidator } from '@/utils/forbiddenPasswords';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const ProfilePage = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  // Загрузка профиля при монтировании
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await profileService.getMyProfile();
      setProfileData(response.data.user);
      profileForm.setFieldsValue({
        firstName: response.data.user.firstName,
        email: response.data.user.email,
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      // НЕ показываем message.error - пользователь и так видит что профиль не загрузился
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const values = await profileForm.validateFields();
      setSaving(true);

      await profileService.updateMyProfile(values);
      
      // Обновляем данные в store
      await useAuthStore.getState().getCurrentUser();
      
      message.success('Профиль успешно обновлен');
      setIsEditing(false);
      await loadProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      message.error(error.response?.data?.message || 'Ошибка сохранения профиля');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    profileForm.setFieldsValue({
      firstName: profileData.firstName,
      email: profileData.email,
    });
  };

  const handleChangePassword = async () => {
    try {
      const values = await passwordForm.validateFields();
      
      await profileService.changePassword(values.currentPassword, values.newPassword);
      
      message.success('Пароль успешно изменен');
      setPasswordModalVisible(false);
      passwordForm.resetFields();
    } catch (error) {
      console.error('Error changing password:', error);
      message.error(error.response?.data?.message || 'Ошибка смены пароля');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Форматирование УИН в формат XXX-XXX
  const formatUIN = (uin) => {
    if (!uin || uin.length !== 6) return uin;
    return `${uin.slice(0, 3)}-${uin.slice(3)}`;
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f0f2f5',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Основная карточка профиля */}
      <Card
          title={
            <Space>
              <UserOutlined />
              <span>Профиль пользователя</span>
            </Space>
          }
          extra={
            !isEditing ? (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => setIsEditing(true)}
                size={isMobile ? 'small' : 'default'}
              >
                {!isMobile && 'Редактировать'}
              </Button>
            ) : (
              <Space size="small">
                <Button 
                  icon={<CloseOutlined />} 
                  onClick={handleCancelEdit}
                  size={isMobile ? 'small' : 'default'}
                >
                  {!isMobile && 'Отмена'}
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSaveProfile}
                  loading={saving}
                  size={isMobile ? 'small' : 'default'}
                >
                  {!isMobile && 'Сохранить'}
                </Button>
              </Space>
            )
          }
        >
          {/* УИН */}
          <div style={{ 
            background: '#fafafa', 
            padding: '12px 16px', 
            borderRadius: 6,
            marginBottom: 16,
            border: '1px solid #d9d9d9'
          }}>
            <Space>
              <IdcardOutlined style={{ color: '#1890ff' }} />
              <Text strong>УИН:</Text>
              <Text style={{ fontSize: 16, fontWeight: 500 }}>
                {formatUIN(profileData?.identificationNumber)}
              </Text>
            </Space>
          </div>

          {/* Сообщение о неактивации */}
          {!user?.isActive && (
            <Alert
              message="Пользователь не активирован. Обратитесь к администратору"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Form form={profileForm} layout="vertical" disabled={!isEditing}>
            <Form.Item
              name="firstName"
              label="ФИО"
              rules={[
                { required: true, message: 'Пожалуйста, введите ФИО' },
                {
                  pattern: /^[А-Яа-яЁё\s-]+$/,
                  message: 'ФИО должно содержать только русские буквы',
                },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Иванов Иван Иванович"
              />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Пожалуйста, введите email' },
                { type: 'email', message: 'Введите корректный email' },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="user@example.com"
              />
            </Form.Item>
          </Form>

          <Divider style={{ margin: '16px 0' }} />

          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {profileData?.createdAt && (
              <Text type="secondary">
                Дата регистрации:{' '}
                <Text strong>
                  {new Date(profileData.createdAt).toLocaleDateString('ru-RU')}
                </Text>
              </Text>
            )}
          </Space>

          <Divider style={{ margin: '16px 0' }} />

          {/* Действия */}
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Button
              icon={<LockOutlined />}
              onClick={() => setPasswordModalVisible(true)}
              block
            >
              Сменить пароль
            </Button>
            
            <Button
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              block
            >
              Выйти из аккаунта
            </Button>
          </Space>
        </Card>

        {/* Модальное окно смены пароля */}
        <Modal
          title="Смена пароля"
          open={passwordModalVisible}
          onCancel={() => {
            setPasswordModalVisible(false);
            passwordForm.resetFields();
          }}
          footer={null}
          destroyOnClose
        >
          <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
            <Form.Item
              name="currentPassword"
              label="Текущий пароль"
              rules={[{ required: true, message: 'Введите текущий пароль' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="••••••••"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="newPassword"
              label="Новый пароль"
              rules={[
                { required: true, message: 'Введите новый пароль' },
                { min: 8, message: 'Пароль должен содержать минимум 8 символов' },
                forbiddenPasswordValidator
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="••••••••"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Подтверждение нового пароля"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: 'Подтвердите новый пароль' },
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
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="••••••••"
                size="large"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button
                  onClick={() => {
                    setPasswordModalVisible(false);
                    passwordForm.resetFields();
                  }}
                >
                  Отмена
                </Button>
                <Button type="primary" htmlType="submit">
                  Сменить пароль
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
    </div>
  );
};

export default ProfilePage;

