import { Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { antdTheme } from './theme/antd-theme'
import Layout from './components/Layout/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import EmployeesPage from './pages/EmployeesPage'
import PassesPage from './pages/PassesPage'
import CounterpartiesPage from './pages/CounterpartiesPage'
import ConstructionSitesPage from './pages/ConstructionSitesPage'
import ContractsPage from './pages/ContractsPage'
import ApplicationsPage from './pages/ApplicationsPage'
import UserProfilePage from './pages/UserProfilePage'
import AdministrationPage from './pages/AdministrationPage'
import DebugPage from './pages/DebugPage'
import NotFoundPage from './pages/NotFoundPage'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import { useAuthStore } from './store/authStore'

// Компонент для перенаправления на основе роли
const RoleBasedRedirect = () => {
  const { user } = useAuthStore()
  
  if (user?.role === 'user') {
    return <Navigate to="/my-profile" replace />
  }
  
  return <Navigate to="/dashboard" replace />
}

function App() {
  return (
    <ConfigProvider theme={antdTheme} locale={ruRU}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/debug" element={<DebugPage />} />
        
        {/* Protected routes */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<RoleBasedRedirect />} />
          
          {/* Routes for admin and manager */}
          <Route 
            path="dashboard" 
            element={<ProtectedRoute allowedRoles={['admin', 'manager']}><DashboardPage /></ProtectedRoute>} 
          />
          <Route 
            path="employees" 
            element={<ProtectedRoute allowedRoles={['admin', 'manager']}><EmployeesPage /></ProtectedRoute>} 
          />
          <Route 
            path="applications" 
            element={<ProtectedRoute allowedRoles={['admin', 'manager']}><ApplicationsPage /></ProtectedRoute>} 
          />
          <Route 
            path="passes" 
            element={<ProtectedRoute allowedRoles={['admin', 'manager']}><PassesPage /></ProtectedRoute>} 
          />
          <Route 
            path="counterparties" 
            element={<ProtectedRoute allowedRoles={['admin', 'manager']}><CounterpartiesPage /></ProtectedRoute>} 
          />
          <Route 
            path="construction-sites" 
            element={<ProtectedRoute allowedRoles={['admin', 'manager']}><ConstructionSitesPage /></ProtectedRoute>} 
          />
          <Route 
            path="contracts" 
            element={<ProtectedRoute allowedRoles={['admin', 'manager']}><ContractsPage /></ProtectedRoute>} 
          />
          
          {/* Route for admin only */}
          <Route 
            path="administration" 
            element={<ProtectedRoute allowedRoles={['admin']}><AdministrationPage /></ProtectedRoute>} 
          />
          
          {/* Route for regular users */}
          <Route path="my-profile" element={<UserProfilePage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ConfigProvider>
  )
}

export default App

