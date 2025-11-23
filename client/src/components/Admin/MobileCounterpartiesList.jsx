import { useState } from 'react';
import { Card, Avatar, Typography, Tag, Drawer, Spin, Empty, Button, App, Space } from 'antd';
import {
  ShopOutlined,
  CopyOutlined,
  LinkOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { counterpartyService } from '@/services/counterpartyService';

const { Text } = Typography;

// Маппинг типов контрагентов
const typeMap = {
  customer: { label: 'Заказчик', color: 'blue' },
  contractor: { label: 'Подрядчик', color: 'green' },
  general_contractor: { label: 'Генподрядчик', color: 'gold' }
};

/**
 * Мобильный список контрагентов (карточки)
 * Используется на устройствах с маленьким экраном
 */
const MobileCounterpartiesList = ({ 
  counterparties,
  loading,
  onRefresh,
  onEdit,
}) => {
  const { message } = App.useApp();
  const [selectedCounterparty, setSelectedCounterparty] = useState(null);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!counterparties || counterparties.length === 0) {
    return <Empty description="Нет контрагентов" />;
  }

  return (
    <>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 4, 
        overflowY: 'auto',
        overflowX: 'hidden',
        flex: 1,
        minHeight: 0,
        height: '100%',
        width: '100%',
        padding: '0 16px 16px 16px'
      }}>
        {counterparties.map((counterparty) => (
          <Card
            key={counterparty.id}
            size="small"
            onClick={() => setSelectedCounterparty(counterparty)}
            style={{ 
              cursor: 'pointer',
              borderRadius: 4,
            }}
            styles={{
              body: { padding: '8px 12px' }
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              {/* Левая часть - основная информация */}
              <div style={{ flex: 1, display: 'flex', gap: 8, minWidth: 0 }}>
                {/* Аватар */}
                <Avatar 
                  size={36} 
                  icon={<ShopOutlined />} 
                  style={{ backgroundColor: '#2563eb', flexShrink: 0 }}
                />

                {/* Информация */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Название */}
                  <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 2 }}>
                    {counterparty.name}
                  </Text>

                  {/* Тип */}
                  <Tag 
                    color={typeMap[counterparty.type]?.color}
                    style={{ fontSize: 11, margin: 0, marginBottom: 4 }}
                  >
                    {typeMap[counterparty.type]?.label}
                  </Tag>

                  {/* ИНН */}
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', color: '#999' }}>
                    ИНН: {counterparty.inn}
                  </Text>
                </div>
              </div>

              {/* Правая часть - кнопка копирования */}
              <div 
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  type="primary"
                  size="large"
                  icon={<CopyOutlined />}
                  onClick={() => handleCopyRegistrationLink(counterparty)}
                  title="Копировать ссылку для регистрации"
                  style={{ padding: '8px 16px', fontSize: 14 }}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Боковое окно просмотра контрагента */}
      {selectedCounterparty && (
        <CounterpartyDrawer
          counterparty={selectedCounterparty}
          open={!!selectedCounterparty}
          onClose={() => setSelectedCounterparty(null)}
          onCopyLink={() => {
            handleCopyRegistrationLink(selectedCounterparty);
          }}
          onEdit={(counterparty) => {
            setSelectedCounterparty(null);
            onEdit?.(counterparty);
          }}
          onRefresh={onRefresh}
        />
      )}
    </>
  );

  // Функция копирования ссылки регистрации
  async function handleCopyRegistrationLink(counterparty) {
    try {
      let registrationCode = counterparty.registrationCode;
      
      // Если кода нет - генерируем
      if (!registrationCode) {
        const response = await counterpartyService.generateRegistrationCode(counterparty.id);
        registrationCode = response.data.data.registrationCode;
        
        // Обновляем контрагента
        setSelectedCounterparty(prev => 
          prev ? { ...prev, registrationCode } : null
        );
        
        // Обновляем список
        onRefresh?.();
      }
      
      // Создаем ссылку для регистрации
      const baseUrl = window.location.origin;
      const registrationUrl = `${baseUrl}/login?registrationCode=${registrationCode}`;
      
      // Копируем в буфер обмена
      await navigator.clipboard.writeText(registrationUrl);
      
      message.success({
        content: 'Ссылка для регистрации скопирована в буфер обмена',
        duration: 3
      });
    } catch (error) {
      console.error('Error copying registration link:', error);
      message.error('Ошибка при копировании ссылки');
    }
  }
};

/**
 * Боковое окно для просмотра параметров контрагента
 */
const CounterpartyDrawer = ({ 
  counterparty, 
  open, 
  onClose,
  onCopyLink,
  onEdit,
}) => {
  const handleEdit = () => {
    onClose();
    onEdit?.(counterparty);
  };

  return (
    <Drawer
      title="Параметры контрагента"
      placement="right"
      onClose={onClose}
      open={open}
      width={300}
      bodyStyle={{ paddingBottom: 140 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Аватар и название */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Avatar 
            size={80}
            icon={<ShopOutlined />}
            style={{ backgroundColor: '#2563eb', marginBottom: 12 }}
          />
          <Text strong style={{ display: 'block', fontSize: 16 }}>
            {counterparty.name}
          </Text>
        </div>

        {/* Тип */}
        <div>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>Тип</Text>
          <Tag color={typeMap[counterparty.type]?.color}>
            {typeMap[counterparty.type]?.label}
          </Tag>
        </div>

        {/* ИНН */}
        <div>
          <Text strong style={{ display: 'block', marginBottom: 4 }}>ИНН</Text>
          <Text>{counterparty.inn}</Text>
        </div>

        {/* КПП */}
        {counterparty.kpp && (
          <div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>КПП</Text>
            <Text>{counterparty.kpp}</Text>
          </div>
        )}

        {/* Телефон */}
        {counterparty.phone && (
          <div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Телефон</Text>
            <Text>{counterparty.phone}</Text>
          </div>
        )}

        {/* Email */}
        {counterparty.email && (
          <div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Email</Text>
            <Text>{counterparty.email}</Text>
          </div>
        )}

        {/* Адрес */}
        {counterparty.address && (
          <div>
            <Text strong style={{ display: 'block', marginBottom: 4 }}>Адрес</Text>
            <Text>{counterparty.address}</Text>
          </div>
        )}

        {/* Кнопки внизу */}
        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button 
            type="primary" 
            block
            icon={<LinkOutlined />}
            onClick={onCopyLink}
          >
            Копировать ссылку
          </Button>
          <Button 
            block
            icon={<EditOutlined />}
            onClick={handleEdit}
          >
            Редактировать
          </Button>
        </div>
      </div>
    </Drawer>
  );
};

export default MobileCounterpartiesList;

