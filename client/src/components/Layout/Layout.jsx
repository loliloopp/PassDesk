import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Layout as AntLayout, Grid } from 'antd'
import Sidebar from './Sidebar'
import Header from './Header'

const { Content } = AntLayout
const { useBreakpoint } = Grid

const Layout = () => {
  const screens = useBreakpoint()
  const isMobile = !screens.md // md = 768px

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {/* Desktop - показываем Sidebar */}
      {!isMobile && <Sidebar />}
      
      <AntLayout>
        <Header />
        <Content style={{ 
          margin: isMobile ? '16px 8px' : '24px 16px', 
          padding: isMobile ? 16 : 24, 
          background: '#fff', 
          borderRadius: 8 
        }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}

export default Layout
