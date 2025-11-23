import { Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, App as AntApp } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { antdTheme } from './theme/antd-theme'
import Layout from './components/Layout/Layout'
import LoginPage from './pages/LoginPage'
import BlockedAccountPage from './pages/BlockedAccountPage'
import ProfilePage from './pages/ProfilePage'
import EmployeesPage from './pages/employees'
import AddEmployeePage from './pages/employees/AddEmployeePage'
import ApplicationRequestPage from './pages/employees/ApplicationRequestPage'
import PassesPage from './pages/PassesPage'
import CounterpartiesPage from './pages/CounterpartiesPage'
import ConstructionSitesPage from './pages/ConstructionSitesPage'
import ContractsPage from './pages/ContractsPage'
import UserProfilePage from './pages/UserProfilePage'
import AdministrationPage from './pages/AdministrationPage'
import DirectoriesPage from './pages/DirectoriesPage'
import DebugPage from './pages/DebugPage'
import NotFoundPage from './pages/NotFoundPage'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import { useAuthStore } from './store/authStore'

// Компонент для перенаправления на employees для всех ролей
const RoleBasedRedirect = () => {
  return <Navigate to="/employees" replace />
}

function App() {
  return (
    <ConfigProvider theme={antdTheme} locale={ruRU}>
      <AntApp>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/blocked" element={<BlockedAccountPage />} />
          <Route path="/debug" element={<DebugPage />} />
          
          {/* Protected routes с Layout */}
          <Route path="/" element={<ProtectedRoute requiresActivation={false}><Layout /></ProtectedRoute>}>
            <Route index element={<RoleBasedRedirect />} />
            
            {/* Profile route - доступен всем авторизованным (даже неактивным) */}
            <Route path="profile" element={<ProfilePage />} />
            
            {/* Routes for admin and user - требуют активации */}
            <Route 
              path="employees" 
              element={<ProtectedRoute allowedRoles={['admin', 'user']}><EmployeesPage /></ProtectedRoute>} 
            />
            <Route 
              path="employees/add" 
              element={<ProtectedRoute allowedRoles={['admin', 'user']}><AddEmployeePage /></ProtectedRoute>} 
            />
            <Route 
              path="employees/edit/:id" 
              element={<ProtectedRoute allowedRoles={['admin', 'user']}><AddEmployeePage /></ProtectedRoute>} 
            />
            <Route 
              path="employees/request" 
              element={<ProtectedRoute allowedRoles={['admin', 'user']}><ApplicationRequestPage /></ProtectedRoute>} 
            />
            <Route 
              path="passes" 
              element={<ProtectedRoute allowedRoles={['admin']}><PassesPage /></ProtectedRoute>} 
            />
            <Route 
              path="counterparties" 
              element={<ProtectedRoute allowedRoles={['admin']}><CounterpartiesPage /></ProtectedRoute>} 
            />
            <Route 
              path="construction-sites" 
              element={<ProtectedRoute allowedRoles={['admin']}><ConstructionSitesPage /></ProtectedRoute>} 
            />
            <Route 
              path="contracts" 
              element={<ProtectedRoute allowedRoles={['admin']}><ContractsPage /></ProtectedRoute>} 
            />
            
            {/* Route for directories (admin only) */}
            <Route 
              path="directories" 
              element={<ProtectedRoute allowedRoles={['admin']}><DirectoriesPage /></ProtectedRoute>} 
            />
            
            {/* Route for admin only */}
            <Route 
              path="administration" 
              element={<ProtectedRoute allowedRoles={['admin']}><AdministrationPage /></ProtectedRoute>} 
            />
            
            {/* Route for regular users (employee profile) */}
            <Route path="my-profile" element={<UserProfilePage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AntApp>
    </ConfigProvider>
  )
}

export default App

