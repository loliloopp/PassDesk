import { Result, Button, Card, Typography } from 'antd'
import { LockOutlined, IdcardOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'

const { Text, Title } = Typography

const BlockedAccountPage = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Форматирование УИН в формат XXX-XXX
  const formatUIN = (uin) => {
    if (!uin || uin.length !== 6) return uin
    return `${uin.slice(0, 3)}-${uin.slice(3)}`
  }

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
          maxWidth: 600,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
      >
        <Result
          icon={<LockOutlined style={{ color: '#faad14' }} />}
          title="Аккаунт заблокирован"
          subTitle="Обратитесь к администратору"
          extra={[
            <Button type="primary" key="logout" onClick={handleLogout}>
              Выйти
            </Button>,
          ]}
        >
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 16 }}>
                Ваш Уникальный Идентификационный Номер:
              </Text>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
              }}
            >
              <IdcardOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
                {formatUIN(user?.identificationNumber) || 'Не указан'}
              </Title>
            </div>
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">
                Сообщите этот номер администратору для активации аккаунта
              </Text>
            </div>
          </div>
        </Result>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            © 2025 PassDesk. Все права защищены.
          </Text>
        </div>
      </Card>
    </div>
  )
}

export default BlockedAccountPage

