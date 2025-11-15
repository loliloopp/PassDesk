import { Row, Col, Card, Statistic, Typography } from 'antd'
import {
  UserOutlined,
  IdcardOutlined,
  ClockCircleOutlined,
  RiseOutlined,
} from '@ant-design/icons'

const { Title } = Typography

const DashboardPage = () => {
  const stats = [
    {
      title: 'Всего сотрудников',
      value: 5,
      icon: <UserOutlined style={{ fontSize: 24, color: '#3b82f6' }} />,
      color: '#3b82f6',
      bgColor: '#eff6ff',
    },
    {
      title: 'Активных пропусков',
      value: 4,
      icon: <IdcardOutlined style={{ fontSize: 24, color: '#10b981' }} />,
      color: '#10b981',
      bgColor: '#f0fdf4',
    },
    {
      title: 'Истекающих',
      value: 1,
      icon: <ClockCircleOutlined style={{ fontSize: 24, color: '#f59e0b' }} />,
      color: '#f59e0b',
      bgColor: '#fffbeb',
    },
    {
      title: 'За этот месяц',
      value: 5,
      icon: <RiseOutlined style={{ fontSize: 24, color: '#8b5cf6' }} />,
      color: '#8b5cf6',
      bgColor: '#f5f3ff',
    },
  ]

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        Дашборд
      </Title>

      <Row gutter={[16, 16]}>
        {stats.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: stat.bgColor,
                    borderRadius: 12,
                  }}
                >
                  {stat.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <Statistic
                    title={stat.title}
                    value={stat.value}
                    valueStyle={{ color: stat.color, fontSize: 28, fontWeight: 600 }}
                  />
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Последние сотрудники" style={{ height: '100%' }}>
            <p style={{ textAlign: 'center', color: '#999', padding: '60px 0' }}>
              Нет данных
            </p>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Недавние пропуска" style={{ height: '100%' }}>
            <p style={{ textAlign: 'center', color: '#999', padding: '60px 0' }}>
              Нет данных
            </p>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default DashboardPage
