import { Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { antdTheme } from './theme/antd-theme'
import Layout from './components/Layout/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import EmployeesPage from './pages/EmployeesPage'
import PassesPage from './pages/PassesPage'
import UsersPage from './pages/UsersPage'
import CounterpartiesPage from './pages/CounterpartiesPage'
import ConstructionSitesPage from './pages/ConstructionSitesPage'
import ContractsPage from './pages/ContractsPage'
import ApplicationsPage from './pages/ApplicationsPage'
import NotFoundPage from './pages/NotFoundPage'
import ProtectedRoute from './components/Auth/ProtectedRoute'

function App() {
  return (
    <ConfigProvider theme={antdTheme} locale={ruRU}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="applications" element={<ApplicationsPage />} />
            <Route path="passes" element={<PassesPage />} />
            <Route path="counterparties" element={<CounterpartiesPage />} />
            <Route path="construction-sites" element={<ConstructionSitesPage />} />
            <Route path="contracts" element={<ContractsPage />} />
            <Route path="users" element={<UsersPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ConfigProvider>
  )
}

export default App

