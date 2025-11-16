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
        navigate('/dashboard')
      }
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.userMessage || err.response?.data?.message || 'Ошибка входа. Проверьте данные.'
      message.error(errorMessage)
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
      navigate('/my-profile')
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
    >
      <Form.Item
        name="lastName"
        label="Фамилия"
        rules={[
          { required: true, message: 'Пожалуйста, введите фамилию' },
          { 
            pattern: /^[А-Яа-яЁё-]+$/,
            message: 'Фамилия должна содержать только русские буквы'
          }
        ]}
      >
        <Input
          placeholder="Иванов"
          size="large"
        />
      </Form.Item>

      <Form.Item
        name="firstName"
        label="Имя"
        rules={[
          { required: true, message: 'Пожалуйста, введите имя' },
          { 
            pattern: /^[А-Яа-яЁё-]+$/,
            message: 'Имя должно содержать только русские буквы'
          }
        ]}
      >
        <Input
          placeholder="Иван"
          size="large"
        />
      </Form.Item>

      <Form.Item
        name="middleName"
        label="Отчество"
        rules={[
          { 
            pattern: /^[А-Яа-яЁё-]+$/,
            message: 'Отчество должно содержать только русские буквы'
          }
        ]}
      >
        <Input
          placeholder="Иванович"
          size="large"
        />
      </Form.Item>

      <Form.Item
        name="position"
        label="Должность"
        rules={[
          { required: true, message: 'Пожалуйста, введите должность' }
        ]}
      >
        <Input
          placeholder="Например: Инженер, Прораб, Монтажник"
          size="large"
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
        />
      </Form.Item>

      <Form.Item
        name="password"
        label="Пароль"
        rules={[
          { required: true, message: 'Пожалуйста, введите пароль' },
          { min: 6, message: 'Пароль должен содержать минимум 6 символов' }
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
