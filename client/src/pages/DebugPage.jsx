import { useState } from 'react';
import { Card, Button, Typography, Space, Descriptions, Tag } from 'antd';
import api, { getBaseURL } from '@/services/api';

const { Title, Text, Paragraph } = Typography;

const DebugPage = () => {
  const [logs, setLogs] = useState([]);

  const addLog = (type, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { type, message, data, timestamp }]);
  };

  const testConnection = async () => {
    setLogs([]);
    addLog('info', 'Начало проверки подключения...');

    try {
      // Проверка health endpoint
      addLog('info', 'Проверка health endpoint...');
      const healthResponse = await fetch(`${window.location.protocol}//${window.location.hostname}:5000/health`);
      const healthData = await healthResponse.json();
      addLog('success', 'Health check успешен', healthData);
    } catch (error) {
      addLog('error', 'Health check провалился', {
        message: error.message,
        name: error.name
      });
    }

    try {
      // Проверка через API instance
      addLog('info', 'Проверка через axios API instance...');
      addLog('info', `API defaults.baseURL: ${api.defaults.baseURL}`);
      addLog('info', `Computed baseURL: ${getBaseURL()}`);
      
      const testData = {
        lastName: 'Тест',
        firstName: 'Отладка',
        middleName: 'Проверка',
        position: 'Тестировщик',
        email: `debug_${Date.now()}@test.com`,
        password: 'test123456'
      };

      const response = await api.post('/auth/register', testData);
      addLog('success', 'Регистрация через API прошла успешно', response.data);
    } catch (error) {
      addLog('error', 'Регистрация через API провалилась', {
        message: error.message,
        code: error.code,
        userMessage: error.userMessage,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          baseURL: error.config?.baseURL,
          url: error.config?.url,
          fullURL: error.config?.baseURL ? `${error.config.baseURL}${error.config.url}` : error.config?.url
        }
      });
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return 'green';
      case 'error': return 'red';
      case 'info': return 'blue';
      default: return 'default';
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>🔍 Страница отладки</Title>
      
      <Card style={{ marginBottom: 20 }}>
        <Descriptions title="Информация о подключении" bordered column={1}>
          <Descriptions.Item label="Current URL (href)">
            <Text copyable>{window.location.href}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Hostname">
            <Text strong>{window.location.hostname}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Protocol">
            {window.location.protocol}
          </Descriptions.Item>
          <Descriptions.Item label="Port">
            {window.location.port || '(default)'}
          </Descriptions.Item>
          <Descriptions.Item label="API defaults.baseURL">
            <Text code>{api.defaults.baseURL || '(not set)'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Current computed baseURL">
            <Text code>{getBaseURL()}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Expected API URL (если IP = 192.168.1.9)">
            <Text code>http://192.168.1.9:5000/api/v1</Text>
          </Descriptions.Item>
          <Descriptions.Item label="User Agent">
            <Text style={{ fontSize: '12px', wordBreak: 'break-all' }}>{navigator.userAgent}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card style={{ marginBottom: 20 }}>
        <Space>
          <Button type="primary" onClick={testConnection}>
            Запустить тесты
          </Button>
          <Button onClick={() => setLogs([])}>
            Очистить логи
          </Button>
        </Space>
      </Card>

      {logs.length > 0 && (
        <Card title="Логи" style={{ marginBottom: 20 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {logs.map((log, index) => (
              <Card
                key={index}
                size="small"
                style={{
                  borderLeft: `4px solid ${
                    log.type === 'success' ? '#52c41a' :
                    log.type === 'error' ? '#ff4d4f' :
                    '#1890ff'
                  }`
                }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Tag color={getLogColor(log.type)}>{log.type.toUpperCase()}</Tag>
                    <Text type="secondary">{log.timestamp}</Text>
                  </div>
                  <Text strong>{log.message}</Text>
                  {log.data && (
                    <pre style={{
                      background: '#f5f5f5',
                      padding: '10px',
                      borderRadius: '4px',
                      overflow: 'auto',
                      maxHeight: '300px'
                    }}>
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </Space>
              </Card>
            ))}
          </Space>
        </Card>
      )}

      <Card title="Инструкции">
        <Paragraph>
          <Text strong>Эта страница помогает диагностировать проблемы с подключением.</Text>
        </Paragraph>
        <Paragraph>
          <ol>
            <li>Нажмите "Запустить тесты"</li>
            <li>Проверьте логи - они покажут где именно возникает ошибка</li>
            <li>Откройте консоль браузера (F12) для дополнительной информации</li>
          </ol>
        </Paragraph>
        <Paragraph>
          <Text type="secondary">
            Если тесты проходят здесь, но не работают на странице регистрации - 
            проблема в компоненте LoginPage.
          </Text>
        </Paragraph>
      </Card>
    </div>
  );
};

export default DebugPage;

