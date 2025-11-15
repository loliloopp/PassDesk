import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-primary-600">404</h1>
        <h2 className="text-3xl font-bold text-gray-900 mt-4 mb-2">Страница не найдена</h2>
        <p className="text-gray-600 mb-8">
          Запрашиваемая страница не существует или была перемещена.
        </p>
        <Link to="/dashboard" className="btn-primary inline-flex items-center">
          <Home className="h-5 w-5 mr-2" />
          Вернуться на главную
        </Link>
      </div>
    </div>
  )
}

export default NotFoundPage

