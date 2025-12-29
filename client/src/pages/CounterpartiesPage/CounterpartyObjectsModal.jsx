import { useState, useEffect } from 'react';
import { Modal, Checkbox, Space, Spin, Empty, message, App, Alert } from 'antd';
import { constructionSiteService } from '../../services/constructionSiteService';
import { counterpartyService } from '../../services/counterpartyService';
import { useAuthStore } from '../../store/authStore';
import settingsService from '../../services/settingsService';

export const CounterpartyObjectsModal = ({ 
  visible, 
  counterpartyId, 
  onCancel, 
  onSave,
  currentObjects = []
}) => {
  const { message: msg } = App.useApp();
  const { user } = useAuthStore();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [defaultCounterpartyId, setDefaultCounterpartyId] = useState(null);

  useEffect(() => {
    const loadDefaultCounterpartyId = async () => {
      try {
        const response = await settingsService.getPublicSettings();
        if (response.success && response.data.defaultCounterpartyId) {
          setDefaultCounterpartyId(response.data.defaultCounterpartyId);
        }
      } catch (error) {
        console.error('Error loading default counterparty ID:', error);
      }
    };
    
    loadDefaultCounterpartyId();
  }, []);

  useEffect(() => {
    if (visible && counterpartyId) {
      fetchSites();
      fetchCurrentObjects();
    }
  }, [visible, counterpartyId]);

  const fetchSites = async () => {
    setLoading(true);
    try {
      // Для user (не default) загружаем только объекты своего контрагента
      if (user?.role === 'user' && user?.counterpartyId !== defaultCounterpartyId) {
        const response = await counterpartyService.getConstructionSites(user.counterpartyId);
        if (response.data.success && Array.isArray(response.data.data)) {
          setSites(response.data.data);
        } else {
          setSites([]);
        }
      } else {
        // Для admin - все объекты
        const response = await constructionSiteService.getAll({ limit: 10000 });
        setSites(response.data.data.constructionSites);
      }
    } catch (error) {
      msg.error('Ошибка при загрузке объектов');
      setSites([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentObjects = async () => {
    try {
      const response = await constructionSiteService.getCounterpartyObjects(counterpartyId);
      if (response.data.success && Array.isArray(response.data.data)) {
        setSelectedIds(response.data.data.map(obj => obj.id));
      } else {
        setSelectedIds([]);
      }
    } catch (error) {
      setSelectedIds([]);
    }
  };

  const handleCheckboxChange = (siteId) => {
    setSelectedIds(prev => 
      prev.includes(siteId)
        ? prev.filter(id => id !== siteId)
        : [...prev, siteId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selectedIds);
      setSaving(false);
      onCancel();
    } catch (error) {
      msg.error(error.response?.data?.message || 'Ошибка при сохранении');
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  return (
    <Modal
      title="Выбрать объекты для контрагента"
      open={visible}
      onOk={handleSave}
      onCancel={handleCancel}
      width={600}
      okText="Сохранить"
      cancelText="Отмена"
      okButtonProps={{ loading: saving }}
    >
      {user?.role === 'user' && user?.counterpartyId !== defaultCounterpartyId && (
        <Alert
          message="Информация"
          description="Вы можете назначать только те объекты, которые назначены вашему контрагенту"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      <Spin spinning={loading} tip="Загрузка объектов...">
        {sites.length === 0 ? (
          <Empty description="Нет доступных объектов" />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {sites.map(site => (
              <div key={site.id} style={{ padding: '8px', border: '1px solid #f0f0f0', borderRadius: '4px' }}>
                <Checkbox
                  checked={selectedIds.includes(site.id)}
                  onChange={() => handleCheckboxChange(site.id)}
                >
                  <strong>{site.shortName}</strong>
                  {site.fullName && <div style={{ fontSize: '12px', color: '#666' }}>{site.fullName}</div>}
                </Checkbox>
              </div>
            ))}
          </Space>
        )}
      </Spin>
    </Modal>
  );
};

