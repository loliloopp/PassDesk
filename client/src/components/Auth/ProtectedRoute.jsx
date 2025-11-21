import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Result, Button } from 'antd'
import { Link } from 'react-router-dom'

const ProtectedRoute = ({ children, allowedRoles, requiresActivation = true }) => {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Если пользователь неактивен и страница требует активации - перенаправляем на профиль БЕЗ алертов
  if (requiresActivation && !user?.isActive && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />
  }

  // Если указаны разрешенные роли, проверяем роль пользователя
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return (
      <Result
        status="403"
        title="403 - Доступ запрещен"
        subTitle={`У вас нет доступа к этой странице. Требуется роль: ${allowedRoles.join(' или ')}`}
        extra={
          <Link to="/">
            <Button type="primary">На главную</Button>
          </Link>
        }
      />
    )
  }

  return children
}

export default ProtectedRoute


