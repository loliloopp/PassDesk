import { Drawer, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';

/**
 * Мобильное выдвижное меню (Drawer)
 * Открывается по клику на гамбургер-меню
 */
const MobileDrawerMenu = ({ visible, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuthStore();

  const menuItems = [
    // Пункты только для админов
    ...(user?.role === 'admin' ? [
      {
        key: '/employees',
        icon: <TeamOutlined />,
        label: 'Сотрудники',
      },
      {
        key: '/admin',
        icon: <SettingOutlined />,
        label: 'Администирование',
      },
      {
        type: 'divider',
      },
    ] : []),
    {
      key: '/profile',
      icon: <UserOutlined />,
      label: 'Профиль',
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Выход',
      danger: true,
    },
  ];

  const handleMenuClick = ({ key }) => {
    if (key === 'logout') {
      logout();
      navigate('/login');
    } else {
      navigate(key);
    }
    onClose(); // Закрываем меню после клика
  };

  return (
    <Drawer
      title="PassDesk"
      placement="left"
      onClose={onClose}
      open={visible}
      width={280}
      styles={{
        body: { padding: 0 },
        header: {
          borderBottom: '1px solid #f0f0f0',
          fontSize: 20,
          fontWeight: 700,
          color: '#2563eb',
        },
      }}
    >
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ border: 'none' }}
      />
    </Drawer>
  );
};

export default MobileDrawerMenu;

