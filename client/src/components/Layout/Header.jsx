import { Layout as AntLayout, Badge, Avatar, Dropdown, Space, Typography } from 'antd'
import { BellOutlined, UserOutlined, DownOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'

const { Header: AntHeader } = AntLayout
const { Text } = Typography

const Header = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Профиль',
      icon: <UserOutlined />,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: 'Выйти',
      danger: true,
      onClick: () => {
        logout()
        navigate('/login')
      },
    },
  ]

  const getRoleLabel = (role) => {
    const roles = {
      admin: 'Администратор',
      manager: 'Менеджер',
      user: 'Пользователь',
    }
    return roles[role] || role
  }

  return (
    <AntHeader
      style={{
        padding: '0 24px',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <Space size="large">
        <Badge count={0} showZero={false}>
          <BellOutlined style={{ fontSize: 20, cursor: 'pointer', color: '#666' }} />
        </Badge>

        <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
          <Space style={{ cursor: 'pointer' }}>
            <Avatar
              size="default"
              style={{ backgroundColor: '#2563eb' }}
              icon={<UserOutlined />}
            />
            <Space direction="vertical" size={0}>
              <Text strong style={{ fontSize: 14 }}>
                {user?.firstName} {user?.lastName}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {getRoleLabel(user?.role)}
              </Text>
            </Space>
            <DownOutlined style={{ fontSize: 12, color: '#666' }} />
          </Space>
        </Dropdown>
      </Space>
    </AntHeader>
  )
}

export default Header
