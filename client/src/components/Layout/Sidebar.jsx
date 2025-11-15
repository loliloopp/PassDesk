import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, FileText, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

const navigation = [
  { name: 'Дашборд', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Сотрудники', href: '/employees', icon: Users },
  { name: 'Пропуска', href: '/passes', icon: FileText },
]

const Sidebar = () => {
  const { logout } = useAuthStore()

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4 mb-5">
            <h1 className="text-2xl font-bold text-primary-600">PassDesk</h1>
          </div>
          
          {/* Navigation */}
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Logout button */}
          <div className="px-2 mt-auto">
            <button
              onClick={logout}
              className="group flex items-center w-full px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Выйти
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar

