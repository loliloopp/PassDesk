import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Table, Checkbox, Button, App, Alert } from 'antd';
import { EMPLOYEE_FIELDS, FIELD_GROUPS, DEFAULT_FORM_CONFIG } from '../../shared/config/employeeFields';
import { useReferencesStore } from '../../store/referencesStore';
import settingsService from '../../services/settingsService';

const EmployeeFieldsSettingsModal = ({ visible, onCancel }) => {
  const { message } = App.useApp();
  const { formConfigDefault, formConfigExternal, updateFormConfig, fetchSettings } = useReferencesStore();
  
  const [loading, setLoading] = useState(false);
  
  // Локальное состояние для редактирования
  const [localConfigDefault, setLocalConfigDefault] = useState({});
  const [localConfigExternal, setLocalConfigExternal] = useState({});

  useEffect(() => {
    if (visible) {
      // Инициализация при открытии
      // Если конфига нет в сторе, берем дефолтный
      setLocalConfigDefault(formConfigDefault || DEFAULT_FORM_CONFIG);
      setLocalConfigExternal(formConfigExternal || DEFAULT_FORM_CONFIG);
      
      // На всякий случай обновляем настройки с сервера
      fetchSettings();
    }
  }, [visible, formConfigDefault, formConfigExternal, fetchSettings]);

  const handleChange = (type, key, property, value) => {
    const setConfig = type === 'default' ? setLocalConfigDefault : setLocalConfigExternal;
    
    setConfig(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [property]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Сохраняем оба конфига
      await Promise.all([
        settingsService.updateSetting('employee_form_config_default', JSON.stringify(localConfigDefault)),
        settingsService.updateSetting('employee_form_config_external', JSON.stringify(localConfigExternal))
      ]);
      
      // Обновляем стор
      updateFormConfig('default', localConfigDefault);
      updateFormConfig('external', localConfigExternal);
      
      message.success('Настройки полей сохранены');
      onCancel();
    } catch (error) {
      console.error('Error saving field settings:', error);
      message.error('Ошибка при сохранении настроек');
    } finally {
      setLoading(false);
    }
  };

  const columns = (type) => [
    {
      title: 'Группа',
      dataIndex: 'group',
      key: 'group',
      width: 150,
      render: (group) => FIELD_GROUPS[group] || group,
      onCell: (record, index) => {
        // Группировка строк по группе
        // Это простая реализация, можно улучшить
        return {};
      }
    },
    {
      title: 'Поле',
      dataIndex: 'label',
      key: 'label',
      width: 250,
    },
    {
      title: 'Отображать',
      key: 'visible',
      width: 100,
      render: (_, record) => {
        const config = type === 'default' ? localConfigDefault : localConfigExternal;
        const isVisible = config[record.key]?.visible ?? record.defaultVisible;
        
        return (
          <Checkbox 
            checked={isVisible}
            onChange={(e) => handleChange(type, record.key, 'visible', e.target.checked)}
          />
        );
      }
    },
    {
      title: 'Обязательное',
      key: 'required',
      width: 100,
      render: (_, record) => {
        const config = type === 'default' ? localConfigDefault : localConfigExternal;
        const isVisible = config[record.key]?.visible ?? record.defaultVisible;
        const isRequired = config[record.key]?.required ?? record.defaultRequired;
        
        return (
          <Checkbox 
            checked={isRequired}
            disabled={!isVisible} // Нельзя сделать обязательным скрытое поле
            onChange={(e) => handleChange(type, record.key, 'required', e.target.checked)}
          />
        );
      }
    },
  ];

  // Группируем и сортируем поля для таблицы
  const dataSource = EMPLOYEE_FIELDS;

  const items = [
    {
      key: 'default',
      label: 'Сотрудники организации (Default)',
      children: (
        <div>
          <Alert 
            message="Настройки для сотрудников, добавляемых вашей организацией" 
            type="info" 
            showIcon 
            style={{ marginBottom: 16 }} 
          />
          <Table 
            dataSource={dataSource} 
            columns={columns('default')} 
            pagination={false}
            rowKey="key"
            size="small"
            scroll={{ y: 500 }}
          />
        </div>
      ),
    },
    {
      key: 'external',
      label: 'Сотрудники контрагентов',
      children: (
        <div>
          <Alert 
            message="Настройки для сотрудников, добавляемых субподрядчиками" 
            type="warning" 
            showIcon 
            style={{ marginBottom: 16 }} 
          />
          <Table 
            dataSource={dataSource} 
            columns={columns('external')} 
            pagination={false}
            rowKey="key"
            size="small"
            scroll={{ y: 500 }}
          />
        </div>
      ),
    },
  ];

  return (
    <Modal
      title="Настройка полей формы сотрудника"
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Отмена
        </Button>,
        <Button key="save" type="primary" loading={loading} onClick={handleSave}>
          Сохранить
        </Button>,
      ]}
    >
      <Tabs defaultActiveKey="default" items={items} />
    </Modal>
  );
};

export default EmployeeFieldsSettingsModal;
