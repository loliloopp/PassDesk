import { useState } from 'react'
import { Layout as AntLayout, Badge, Avatar, Dropdown, Space, Typography, Grid, Tag, Tooltip, Button } from 'antd'
import { BellOutlined, UserOutlined, DownOutlined, IdcardOutlined, MenuOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import MobileDrawerMenu from './MobileDrawerMenu'

const { Header: AntHeader } = AntLayout
const { Text } = Typography
const { useBreakpoint } = Grid

const Header = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [drawerVisible, setDrawerVisible] = useState(false)

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Профиль',
      icon: <UserOutlined />,
      onClick: () => {
        navigate('/profile')
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
      user: 'Пользователь',
    }
    return roles[role] || role
  }

  // Форматирование УИН в формат XXX-XXX
  const formatUIN = (uin) => {
    if (!uin || uin.length !== 6) return uin;
    return `${uin.slice(0, 3)}-${uin.slice(3)}`;
  }

  return (
    <>
      <AntHeader
        style={{
          padding: isMobile ? '0 16px' : '0 24px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          // Закрепление header для всех версий
          position: 'sticky',
          top: 0,
          zIndex: 1000,
        }}
      >
        {/* Левая часть - гамбургер-меню на мобильных или пусто на десктопе */}
        {isMobile ? (
          <Button
            type="text"
            icon={<MenuOutlined style={{ fontSize: 20 }} />}
            onClick={() => setDrawerVisible(true)}
          />
        ) : (
          <div />
        )}

        {/* Правая часть */}
        <Space size={isMobile ? 'middle' : 'large'}>
          {/* УИН - показываем всегда если есть */}
          {user?.identificationNumber && (
            <Tooltip title="Уникальный идентификационный номер">
              <Tag 
                icon={<IdcardOutlined />} 
                color="blue"
                style={{ 
                  fontSize: isMobile ? 12 : 14, 
                  padding: isMobile ? '2px 8px' : '4px 12px',
                  fontWeight: 'bold'
                }}
              >
                {formatUIN(user.identificationNumber)}
              </Tag>
            </Tooltip>
          )}

          {/* Уведомления скрываем на мобильных */}
          {!isMobile && (
            <Badge count={0} showZero={false}>
              <BellOutlined style={{ fontSize: 20, cursor: 'pointer', color: '#666' }} />
            </Badge>
          )}

          {/* Меню пользователя только на десктопе */}
          {!isMobile && (
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <Space style={{ cursor: 'pointer' }} size="small">
                <Avatar
                  size="default"
                  style={{ backgroundColor: '#2563eb' }}
                  icon={<UserOutlined />}
                />
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                  <Text strong style={{ fontSize: 14, margin: 0 }}>
                    {user?.firstName} {user?.lastName}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12, margin: 0 }}>
                    {getRoleLabel(user?.role)}
                  </Text>
                </div>
                <DownOutlined style={{ fontSize: 12, color: '#666' }} />
              </Space>
            </Dropdown>
          )}
        </Space>
      </AntHeader>

      {/* Мобильное выдвижное меню */}
      <MobileDrawerMenu visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </>
  )
}

export default Header
