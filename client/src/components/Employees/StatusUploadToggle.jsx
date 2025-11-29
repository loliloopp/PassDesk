import { Button, Spin, App } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { employeeApi } from '@/entities/employee';

/**
 * Компонент для переключения флага is_upload всех активных статусов сотрудника
 * Логика: Если хотя бы один статус false - оранжевая. Если все true - зеленая.
 */
const StatusUploadToggle = ({ employeeId, statusMappings, onUpdate }) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  // Определяем состояние: если все активные статусы имеют is_upload=true - зеленая, иначе оранжевая
  const allUploaded = statusMappings?.length > 0 && statusMappings.every(sm => sm.isUpload);

  const handleToggle = async (e) => {
    e.stopPropagation();
    setLoading(true);

    try {
      const response = await employeeApi.updateAllStatusesUploadFlag(
        employeeId,
        !allUploaded
      );

      if (response.success) {
        message.success(
          !allUploaded ? 'Сотрудник отмечен как обработанный' : 'Сотрудник отмечен как необработанный'
        );
        
        // Обновляем все статусы
        const updatedMappings = statusMappings?.map(sm => ({
          ...sm,
          isUpload: !allUploaded
        })) || [];
        
        onUpdate?.(updatedMappings);
      }
    } catch (error) {
      console.error('Error updating upload flag:', error);
      message.error('Ошибка при обновлении статуса');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Spin size="small" />;
  }

  if (!statusMappings || statusMappings.length === 0) {
    return '-';
  }

  return (
    <Button
      type="text"
      shape="circle"
      icon={allUploaded ? <CheckOutlined /> : <CloseOutlined />}
      style={{
        color: allUploaded ? '#52c41a' : '#ff7a45',
        border: `2px solid ${allUploaded ? '#52c41a' : '#ff7a45'}`,
        fontSize: '16px',
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={handleToggle}
    />
  );
};

export default StatusUploadToggle;

