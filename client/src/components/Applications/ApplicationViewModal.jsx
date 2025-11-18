import { useState, useEffect } from 'react';
import { Modal, Spin, Typography, Button, Space, message } from 'antd';
import { FileExcelOutlined } from '@ant-design/icons';
import { applicationService } from '../../services/applicationService';
import BiometricTable from './BiometricTable';

const { Title } = Typography;

const ApplicationViewModal = ({ visible, applicationId, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState(null);
  const [exportFunction, setExportFunction] = useState(null);

  useEffect(() => {
    if (visible && applicationId) {
      fetchApplication();
    }
  }, [visible, applicationId]);

  const fetchApplication = async () => {
    setLoading(true);
    try {
      const { data } = await applicationService.getById(applicationId);
      setApplication(data.data);
    } catch (error) {
      message.error('Ошибка при загрузке заявки');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (exportFunction) {
      exportFunction();
      message.success('Файл экспортирован');
    }
  };

  const handleExportRef = (exportFn) => {
    setExportFunction(() => exportFn);
  };

  const isBiometric = application?.applicationType === 'biometric';

  return (
    <Modal
      title={`Заявка ${application?.applicationNumber || ''}`}
      open={visible}
      onCancel={onCancel}
      width={1200}
      footer={
        isBiometric ? (
          <Space>
            <Button onClick={onCancel}>Закрыть</Button>
            <Button 
              type="primary" 
              icon={<FileExcelOutlined />} 
              onClick={handleExport}
            >
              Экспорт в Excel
            </Button>
          </Space>
        ) : (
          <Button onClick={onCancel}>Закрыть</Button>
        )
      }
    >
      <Spin spinning={loading}>
        {application && (
          <div>
            {isBiometric && application.employees && application.employees.length > 0 && (
              <BiometricTable 
                employees={application.employees} 
                applicationNumber={application.applicationNumber}
                onExport={handleExportRef}
              />
            )}

            {!isBiometric && (
              <div>
                <Title level={5}>
                  Сотрудники: {application.employees?.length || 0}
                </Title>
                {/* Здесь будет отображение файлов для типа "Заказчик" в будущем */}
              </div>
            )}
          </div>
        )}
      </Spin>
    </Modal>
  );
};

export default ApplicationViewModal;

