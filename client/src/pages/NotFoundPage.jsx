import { Result, Button } from 'antd'
import { useNavigate } from 'react-router-dom'
import { HomeOutlined } from '@ant-design/icons'

const NotFoundPage = () => {
  const navigate = useNavigate()

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
      }}
    >
      <Result
        status="404"
        title="404"
        subTitle="Извините, запрашиваемая страница не существует или была перемещена."
        extra={
          <Button
            type="primary"
            icon={<HomeOutlined />}
            onClick={() => navigate('/dashboard')}
            size="large"
          >
            Вернуться на главную
          </Button>
        }
      />
    </div>
  )
}

export default NotFoundPage
