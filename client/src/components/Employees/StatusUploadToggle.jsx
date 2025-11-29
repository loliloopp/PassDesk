import { Button, Spin, App } from 'antd';
import { useState } from 'react';
import { employeeApi } from '@/entities/employee';

/**
 * Компонент для переключения флага is_upload всех активных статусов сотрудника
 * Зеленая кнопка "ДА" (обработанный) / Оранжевая кнопка "НЕТ" (необработанный)
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

  // Если все загружено - показываем "ДА" с зеленым контуром
  if (allUploaded) {
    return (
      <Button
        size="small"
        onClick={handleToggle}
        style={{
          color: '#52c41a',
          borderColor: '#52c41a',
          backgroundColor: 'transparent',
        }}
      >
        ДА
      </Button>
    );
  }

  // Если не загружено - показываем "НЕТ" с оранжевым контуром
  return (
    <Button
      size="small"
      onClick={handleToggle}
      style={{
        color: '#fa8c16',
        borderColor: '#fa8c16',
        backgroundColor: 'transparent',
      }}
    >
      НЕТ
    </Button>
  );
};

export default StatusUploadToggle;
