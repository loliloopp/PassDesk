import { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Spin, Typography, Button, Space, message } from 'antd';
import { FileExcelOutlined, EyeOutlined, DownloadOutlined } from '@ant-design/icons';
import { applicationService } from '../../services/applicationService';
import { fileService } from '../../services/fileService';
import BiometricTable from './BiometricTable';

const { Title } = Typography;

const ApplicationViewModal = ({ visible, applicationId, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState(null);
  const exportFunctionRef = useRef(null);

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
    if (exportFunctionRef.current) {
      exportFunctionRef.current();
      message.success('Файл экспортирован');
    }
  };

  const handleExportRef = useCallback((exportFn) => {
    exportFunctionRef.current = exportFn;
  }, []);

  // Обработчик просмотра скана заявки
  const handleViewScan = async () => {
    if (!application?.scanFile?.id) {
      message.error('Файл не найден');
      return;
    }

    try {
      // Используем ID файла для получения ссылки
      const response = await fileService.getFileUrlById(application.scanFile.id);
      window.open(response.data.url, '_blank');
    } catch (error) {
      message.error('Ошибка при открытии файла');
      console.error(error);
    }
  };

  // Обработчик скачивания скана заявки
  const handleDownloadScan = async () => {
    if (!application?.scanFile?.id) {
      message.error('Файл не найден');
      return;
    }

    try {
      const response = await fileService.getFileUrlById(application.scanFile.id);
      const link = document.createElement('a');
      link.href = response.data.url;
      link.download = application.scanFile.originalName || application.scanFile.fileName || 'application-scan.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Файл скачивается');
    } catch (error) {
      message.error('Ошибка при скачивании файла');
      console.error(error);
    }
  };

  const isBiometric = application?.applicationType === 'biometric';

  return (
    <Modal
      title={
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <div>{`Заявка ${application?.applicationNumber || ''}`}</div>
          {application?.scanFile && (
            <div style={{ fontSize: '14px', fontWeight: 'normal' }}>
              <Space>
                <span>Скан заявки:</span>
                <Button 
                  type="link" 
                  size="small" 
                  icon={<EyeOutlined />}
                  onClick={handleViewScan}
                >
                  Просмотр
                </Button>
                <Button 
                  type="link" 
                  size="small" 
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadScan}
                >
                  Скачать
                </Button>
              </Space>
            </div>
          )}
        </Space>
      }
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

