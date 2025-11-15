import { Outlet } from 'react-router-dom'
import { Layout as AntLayout } from 'antd'
import Sidebar from './Sidebar'
import Header from './Header'

const { Content } = AntLayout

const Layout = () => {
  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <AntLayout>
        <Header />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', borderRadius: 8 }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}

export default Layout
