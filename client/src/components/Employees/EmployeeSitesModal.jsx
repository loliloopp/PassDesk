import { useState, useEffect } from 'react';
import { Modal, Checkbox, Space, App } from 'antd';
import { employeeApi } from '@/entities/employee';
import api from '@/services/api';

const EmployeeSitesModal = ({ visible, employee, onCancel, onSuccess }) => {
  const { message } = App.useApp();
  const [constructionSites, setConstructionSites] = useState([]);
  const [selectedSites, setSelectedSites] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchConstructionSites();
      // Устанавливаем уже выбранные объекты
      if (employee?.employeeCounterpartyMappings) {
        const siteIds = employee.employeeCounterpartyMappings
          .map(mapping => mapping.constructionSiteId)
          .filter(Boolean); // Убираем null значения
        setSelectedSites(siteIds);
      }
    }
  }, [visible, employee]);

  const fetchConstructionSites = async () => {
    try {
      const response = await api.get('/construction-sites');
      const sites = response.data.data.constructionSites || [];
      setConstructionSites(sites);
    } catch (error) {
      message.error('Ошибка загрузки объектов');
    }
  };

  const handleSiteChange = (siteId, checked) => {
    if (checked) {
      setSelectedSites([...selectedSites, siteId]);
    } else {
      setSelectedSites(selectedSites.filter(id => id !== siteId));
    }
  };

  const handleOk = async () => {
    try {
      setLoading(true);
      // Отправляем выбранные объекты на сервер
      await employeeApi.updateConstructionSites(employee.id, selectedSites);
      message.success('Объекты обновлены');
      onCancel(); // Закрываем модальное окно
      onSuccess(); // Обновляем данные в родительском компоненте
    } catch (error) {
      message.error('Ошибка при сохранении объектов');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Выбор объектов строительства"
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      okText="ОК"
      cancelText="Отмена"
      confirmLoading={loading}
      width={600}
    >
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          {constructionSites.map((site) => (
            <Checkbox
              key={site.id}
              checked={selectedSites.includes(site.id)}
              onChange={(e) => handleSiteChange(site.id, e.target.checked)}
            >
              {site.shortName || site.name}
            </Checkbox>
          ))}
        </Space>
      </div>
    </Modal>
  );
};

export default EmployeeSitesModal;

