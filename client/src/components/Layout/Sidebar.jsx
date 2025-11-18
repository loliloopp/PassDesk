import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu } from 'antd'
import {
  DashboardOutlined,
  UserOutlined,
  IdcardOutlined,
  LogoutOutlined,
  TeamOutlined,
  ShopOutlined,
  BankOutlined,
  FileTextOutlined,
  SettingOutlined,
  ProfileOutlined,
  ControlOutlined,
  BookOutlined
} from '@ant-design/icons'
import { useAuthStore } from '@/store/authStore'
import settingsService from '@/services/settingsService'

const { Sider } = Layout

const Sidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)
  const [defaultCounterpartyId, setDefaultCounterpartyId] = useState(null)

  // Загружаем настройки при монтировании компонента
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await settingsService.getPublicSettings()
        console.log('🔍 Sidebar: loaded settings', response.data)
        setDefaultCounterpartyId(response.data.defaultCounterpartyId)
      } catch (error) {
        console.error('Error loading settings:', error)
      }
    }
    
    if (user) {
      loadSettings()
    }
  }, [user])

  // Меню для обычных пользователей (role: user)
  const userMenuItems = [
    {
      key: '/my-profile',
      icon: <ProfileOutlined />,
      label: 'Мой профиль',
    }
  ]

  // Проверяем, должен ли пользователь видеть дашборд
  const canSeeDashboard = user?.counterpartyId === defaultCounterpartyId

  console.log('🔍 Sidebar: dashboard access check', {
    userCounterpartyId: user?.counterpartyId,
    defaultCounterpartyId,
    canSeeDashboard
  })

  // Меню для администраторов и менеджеров
  const adminManagerMenuItems = []

  // Добавляем "Дашборд" только если пользователь принадлежит к контрагенту по умолчанию
  if (canSeeDashboard) {
    adminManagerMenuItems.push({
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Дашборд',
    })
  }

  // Остальные пункты меню
  adminManagerMenuItems.push(
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
      key: 'references',
      icon: <BankOutlined />,
      label: 'Справочники',
      children: [
        {
          key: '/counterparties',
          icon: <ShopOutlined />,
          label: 'Контрагенты',
        },
        {
          key: '/construction-sites',
          icon: <BankOutlined />,
          label: 'Объекты',
        },
        {
          key: '/contracts',
          icon: <FileTextOutlined />,
          label: 'Договора',
        },
        {
          key: '/directories',
          icon: <BookOutlined />,
          label: 'Подразделения',
        },
      ],
    }
  )

  // Выбираем меню на основе роли пользователя
  let menuItems = []
  if (user?.role === 'user') {
    menuItems = userMenuItems
  } else {
    menuItems = [...adminManagerMenuItems]
    
    // Добавляем "Администрирование" только для администраторов
    if (user?.role === 'admin') {
      menuItems.push({
        key: '/administration',
        icon: <ControlOutlined />,
        label: 'Администрирование',
      })
    }
  }

  const handleMenuClick = ({ key }) => {
    if (key === 'logout') {
      logout()
      navigate('/login')
    } else {
      navigate(key)
    }
  }

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      width={250}
      style={{
        overflow: 'auto',
        height: '100vh',
        position: 'sticky',
        left: 0,
        top: 0,
        bottom: 0,
      }}
    >
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: collapsed ? 18 : 24,
          fontWeight: 700,
          color: '#2563eb',
          padding: '0 16px',
        }}
      >
        {collapsed ? 'PD' : 'PassDesk'}
      </div>

      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ border: 'none' }}
      />

      <div style={{ position: 'absolute', bottom: 16, width: '100%', padding: '0 16px' }}>
        <Menu
          mode="inline"
          items={[
            {
              key: 'logout',
              icon: <LogoutOutlined />,
              label: 'Выйти',
              danger: true,
            },
          ]}
          onClick={handleMenuClick}
          style={{ border: 'none' }}
        />
      </div>
    </Sider>
  )
}

export default Sidebar
