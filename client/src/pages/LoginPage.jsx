import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Card, Typography, message, Tabs } from 'antd'
import { UserOutlined, LockOutlined, LoginOutlined, UserAddOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { Title, Text } = Typography

const LoginPage = () => {
  const navigate = useNavigate()
  const { login, register } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [loginForm] = Form.useForm()
  const [registerForm] = Form.useForm()
  const [activeTab, setActiveTab] = useState('login')

  const handleLogin = async (values) => {
    setLoading(true)
    try {
      const response = await login(values)
      message.success('Вход выполнен успешно!')
      
      // Перенаправление на основе роли пользователя
      const userRole = response.data.user.role
      if (userRole === 'user') {
        navigate('/my-profile')
      } else {
        navigate('/employees')
      }
    } catch (err) {
      console.error('Login error:', err);
      
      // Детальное сообщение об ошибке для входа
      let errorMessage = 'Ошибка входа. Попробуйте снова.';
      
      if (err.response?.data?.message) {
        // Сообщение с сервера (например, "Неверный email или пароль")
        errorMessage = err.response.data.message;
      } else if (err.userMessage) {
        // Улучшенное сообщение из interceptor (например, "Ошибка сети")
        errorMessage = err.userMessage;
      } else if (err.code === 'ERR_NETWORK') {
        errorMessage = 'Не удается подключиться к серверу. Проверьте, что сервер запущен.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Неверный email или пароль';
      } else if (err.response?.status === 403) {
        errorMessage = 'Доступ запрещен. Ваш аккаунт может быть деактивирован.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      message.error(errorMessage, 5); // Показываем на 5 секунд
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (values) => {
    setLoading(true)
    try {
      console.log('Attempting registration with:', { ...values, password: '***' }); // Безопасное логирование
      await register(values)
      message.success('Регистрация прошла успешно!')
      navigate('/employees')
    } catch (err) {
      console.error('Registration error:', err);
      
      // Детальное сообщение об ошибке
      let errorMessage = 'Ошибка регистрации. Попробуйте снова.';
      
      if (err.userMessage) {
        // Используем улучшенное сообщение из interceptor
        errorMessage = err.userMessage;
      } else if (err.response?.data?.errors) {
        // Если есть массив ошибок валидации
        const errors = err.response.data.errors;
        errorMessage = errors.map(e => e.msg || e.message).join('; ');
      } else if (err.response?.data?.message) {
        // Обычное сообщение с сервера
        errorMessage = err.response.data.message;
      } else if (err.code === 'ERR_NETWORK') {
        errorMessage = 'Не удается подключиться к серверу. Проверьте, что сервер запущен.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      message.error(errorMessage, 5); // Показываем на 5 секунд
    } finally {
      setLoading(false)
    }
  }

  const loginTabContent = (
    <Form
      form={loginForm}
      name="login"
      onFinish={handleLogin}
      layout="vertical"
      requiredMark={false}
    >
      <Form.Item
        name="email"
        label="Email"
        rules={[
          { required: true, message: 'Пожалуйста, введите email' },
          { type: 'email', message: 'Введите корректный email' },
        ]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder="user@example.com"
          size="large"
        />
      </Form.Item>

      <Form.Item
        name="password"
        label="Пароль"
        rules={[{ required: true, message: 'Пожалуйста, введите пароль' }]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="••••••••"
          size="large"
        />
      </Form.Item>

      <Form.Item style={{ marginBottom: 0 }}>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          loading={loading}
          block
        >
          Войти
        </Button>
      </Form.Item>
    </Form>
  )

  const registerTabContent = (
    <Form
      form={registerForm}
      name="register"
      onFinish={handleRegister}
      layout="vertical"
      requiredMark={true}
      autoComplete="off"
    >
      <Form.Item
        name="fullName"
        label="ФИО"
        rules={[
          { required: true, message: 'Пожалуйста, введите ФИО' },
          { 
            pattern: /^[А-Яа-яЁё\s-]+$/,
            message: 'ФИО должно содержать только русские буквы'
          },
          {
            validator: (_, value) => {
              if (!value) return Promise.resolve();
              const parts = value.trim().split(/\s+/);
              if (parts.length < 2) {
                return Promise.reject(new Error('Введите фамилию и имя (минимум 2 слова)'));
              }
              return Promise.resolve();
            }
          }
        ]}
      >
        <Input
          placeholder="Иванов Иван Иванович"
          size="large"
          autoComplete="off"
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
          prefix={<UserOutlined />}
          placeholder="user@example.com"
          size="large"
          autoComplete="off"
        />
      </Form.Item>

      <Form.Item
        name="password"
        label="Пароль"
        rules={[
          { required: true, message: 'Пожалуйста, введите пароль' },
          { min: 8, message: 'Пароль должен содержать минимум 8 символов' }
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="••••••••"
          size="large"
          autoComplete="new-password"
        />
      </Form.Item>

      <Form.Item
        name="confirmPassword"
        label="Подтверждение пароля"
        dependencies={['password']}
        rules={[
          { required: true, message: 'Пожалуйста, подтвердите пароль' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve()
              }
              return Promise.reject(new Error('Пароли не совпадают'))
            },
          }),
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="••••••••"
          size="large"
          autoComplete="new-password"
        />
      </Form.Item>

      <Form.Item style={{ marginBottom: 0 }}>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          loading={loading}
          block
          icon={<UserAddOutlined />}
        >
          Зарегистрироваться
        </Button>
      </Form.Item>
    </Form>
  )

  const tabItems = [
    {
      key: 'login',
      label: (
        <span>
          <LoginOutlined />
          Вход
        </span>
      ),
      children: loginTabContent
    },
    {
      key: 'register',
      label: (
        <span>
          <UserAddOutlined />
          Регистрация
        </span>
      ),
      children: registerTabContent
    }
  ]

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 500,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '12px',
            marginBottom: 8
          }}>
            <div
              style={{
                width: 40,
                height: 40,
                background: '#2563eb',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LoginOutlined style={{ fontSize: 20, color: '#fff' }} />
            </div>
            <Title level={2} style={{ margin: 0 }}>
              PassDesk
            </Title>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">Портал управления пропусками</Text>
          </div>
        </div>

        <Tabs 
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          centered
        />

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            © 2025 PassDesk. Все права защищены.
          </Text>
        </div>
      </Card>
    </div>
  )
}

export default LoginPage
