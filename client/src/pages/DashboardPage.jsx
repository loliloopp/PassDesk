import { Users, FileText, AlertCircle, TrendingUp } from 'lucide-react'

const stats = [
  { name: 'Всего сотрудников', value: '0', icon: Users, color: 'bg-blue-500' },
  { name: 'Активных пропусков', value: '0', icon: FileText, color: 'bg-green-500' },
  { name: 'Истекающих', value: '0', icon: AlertCircle, color: 'bg-yellow-500' },
  { name: 'За этот месяц', value: '0', icon: TrendingUp, color: 'bg-purple-500' },
]

const DashboardPage = () => {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Дашборд</h1>
        <p className="text-gray-600 mt-1">Обзор системы управления пропусками</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Последние сотрудники</h2>
          <div className="text-center py-8 text-gray-500">
            <p>Нет данных</p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Недавние пропуска</h2>
          <div className="text-center py-8 text-gray-500">
            <p>Нет данных</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage

