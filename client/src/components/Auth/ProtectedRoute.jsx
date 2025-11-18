import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Result, Button } from 'antd'
import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { message } from 'antd'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore()

  // Проверяем аутентификацию
  useEffect(() => {
    if (!isAuthenticated) {
      console.warn('🚫 ProtectedRoute: User not authenticated, redirecting to login');
      message.info('Пожалуйста, войдите в систему');
    }
  }, [isAuthenticated])

  // Проверяем права доступа
  useEffect(() => {
    if (isAuthenticated && allowedRoles && user && !allowedRoles.includes(user?.role)) {
      console.warn(`🚫 ProtectedRoute: User role "${user.role}" not allowed. Required: [${allowedRoles.join(', ')}]`);
      message.error({
        content: `У вас нет доступа к этой странице. Требуется роль: ${allowedRoles.join(' или ')}`,
        duration: 5
      });
    }
  }, [isAuthenticated, allowedRoles, user])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
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

