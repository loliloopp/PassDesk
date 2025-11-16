import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { Result, Button } from 'antd'
import { Link } from 'react-router-dom'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Если указаны разрешенные роли, проверяем роль пользователя
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="У вас нет доступа к этой странице"
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

