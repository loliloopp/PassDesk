import { useNavigate, useLocation } from 'react-router-dom'
import { Menu, Layout } from 'antd'
import { useState, useEffect } from 'react'
import {
  DashboardOutlined,
  UserOutlined,
  FileTextOutlined,
  ControlOutlined,
  ProfileOutlined,
  LogoutOutlined,
  ShopOutlined,
  BookOutlined
} from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import settingsService from '@/services/settingsService'

const { Footer } = Layout

const MobileMenu = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuthStore()
  const [defaultCounterpartyId, setDefaultCounterpartyId] = useState(null)

  // Загружаем настройки при монтировании компонента
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await settingsService.getPublicSettings()
        setDefaultCounterpartyId(response.data.defaultCounterpartyId)
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }
    
    if (user) {
      loadSettings()
    }
  }, [user])

  // Меню для обычных пользователей
  const userMenuItems = [
    {
      key: '/profile',
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

  // Проверяем, должен ли пользователь видеть дашборд
  const canSeeDashboard = user?.counterpartyId === defaultCounterpartyId

  // Меню для админов
  const adminMenuItems = []

  // Добавляем "Дашборд" только если пользователь принадлежит к контрагенту по умолчанию
  if (canSeeDashboard) {
    adminMenuItems.push({
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Дашборд',
    })
  }

  // Остальные пункты меню
  adminMenuItems.push(
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
    },
    {
      key: '/directories',
      icon: <BookOutlined />,
      label: 'Подразделения',
    }
  )

  // Добавляем Администрирование для админов
  if (user?.role === 'admin') {
    adminMenuItems.push({
      key: '/administration',
      icon: <ControlOutlined />,
      label: 'Админ',
    })
  }

  // Добавляем выход для всех
  adminMenuItems.push({
    key: 'logout',
    icon: <LogoutOutlined />,
    label: 'Выйти',
    danger: true
  })

  const menuItems = user?.role === 'user' ? userMenuItems : adminMenuItems

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

