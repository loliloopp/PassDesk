import { Layout as AntLayout, Badge, Avatar, Dropdown, Space, Typography, Grid } from 'antd'
import { BellOutlined, UserOutlined, DownOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'

const { Header: AntHeader } = AntLayout
const { Text } = Typography
const { useBreakpoint } = Grid

const Header = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const screens = useBreakpoint()
  const isMobile = !screens.md

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Профиль',
      icon: <UserOutlined />,
      onClick: () => {
        if (user?.role === 'user') {
          navigate('/my-profile')
        }
      }
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
        padding: isMobile ? '0 16px' : '0 24px',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isMobile ? 'space-between' : 'flex-end',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      {/* Логотип на мобильных */}
      {isMobile && (
        <Text strong style={{ fontSize: 18, color: '#2563eb' }}>
          PassDesk
        </Text>
      )}

      <Space size={isMobile ? 'middle' : 'large'}>
        {/* Уведомления скрываем на мобильных */}
        {!isMobile && (
          <Badge count={0} showZero={false}>
            <BellOutlined style={{ fontSize: 20, cursor: 'pointer', color: '#666' }} />
          </Badge>
        )}

        <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
          <Space style={{ cursor: 'pointer' }} size="small">
            <Avatar
              size={isMobile ? 'small' : 'default'}
              style={{ backgroundColor: '#2563eb' }}
              icon={<UserOutlined />}
            />
            {/* Имя пользователя скрываем на мобильных */}
            {!isMobile && (
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                <Text strong style={{ fontSize: 14, margin: 0 }}>
                  {user?.firstName} {user?.lastName}
                </Text>
                <Text type="secondary" style={{ fontSize: 12, margin: 0 }}>
                  {getRoleLabel(user?.role)}
                </Text>
              </div>
            )}
            {!isMobile && <DownOutlined style={{ fontSize: 12, color: '#666' }} />}
          </Space>
        </Dropdown>
      </Space>
    </AntHeader>
  )
}

export default Header
