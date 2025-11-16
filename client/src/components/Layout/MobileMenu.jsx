import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, Layout } from 'antd'
import {
  DashboardOutlined,
  UserOutlined,
  FileTextOutlined,
  ControlOutlined,
  ProfileOutlined,
  LogoutOutlined,
  ShopOutlined
} from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'

const { Footer } = Layout

const MobileMenu = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuthStore()

  // Меню для обычных пользователей
  const userMenuItems = [
    {
      key: '/my-profile',
      icon: <ProfileOutlined />,
      label: 'Профиль',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Выйти',
      danger: true
    }
  ]

  // Меню для админов и менеджеров
  const adminManagerMenuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Дашборд',
    },
    {
      key: '/employees',
      icon: <UserOutlined />,
      label: 'Сотрудники',
    },
    {
      key: '/applications',
      icon: <FileTextOutlined />,
      label: 'Заявки',
    },
    {
      key: '/counterparties',
      icon: <ShopOutlined />,
      label: 'Справочники',
    }
  ]

  // Добавляем Администрирование для админов
  if (user?.role === 'admin') {
    adminManagerMenuItems.push({
      key: '/administration',
      icon: <ControlOutlined />,
      label: 'Админ',
    })
  }

  // Добавляем выход для всех
  adminManagerMenuItems.push({
    key: 'logout',
    icon: <LogoutOutlined />,
    label: 'Выйти',
    danger: true
  })

  const menuItems = user?.role === 'user' ? userMenuItems : adminManagerMenuItems

  const handleMenuClick = ({ key }) => {
    if (key === 'logout') {
      logout()
      navigate('/login')
    } else {
      navigate(key)
    }
  }

  return (
    <Footer
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 0,
        background: '#fff',
        borderTop: '1px solid #f0f0f0',
        zIndex: 999
      }}
    >
      <Menu
        mode="horizontal"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          border: 'none',
          fontSize: '12px'
        }}
      />
    </Footer>
  )
}

export default MobileMenu

