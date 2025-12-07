import { useState, useEffect } from 'react';
import { Modal, Checkbox, Space, Spin, Empty, message, App } from 'antd';
import { constructionSiteService } from '../../services/constructionSiteService';

export const CounterpartyObjectsModal = ({ 
  visible, 
  counterpartyId, 
  onCancel, 
  onSave,
  currentObjects = []
}) => {
  const { message: msg } = App.useApp();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && counterpartyId) {
      fetchSites();
      fetchCurrentObjects();
    }
  }, [visible, counterpartyId]);

  const fetchSites = async () => {
    setLoading(true);
    try {
      const response = await constructionSiteService.getAll({ limit: 10000 });
      setSites(response.data.data.constructionSites);
    } catch (error) {
      msg.error('Ошибка при загрузке объектов');
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
      msg.error('Ошибка при сохранении');
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

