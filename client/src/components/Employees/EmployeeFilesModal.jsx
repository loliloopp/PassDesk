import { useState, useEffect } from 'react';
import { Modal, List, Button, Tooltip, Space, Spin } from 'antd';
import {
  FileOutlined,
  EyeOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  FileWordOutlined,
} from '@ant-design/icons';
import { employeeService } from '../../services/employeeService';

const EmployeeFilesModal = ({ visible, employeeId, employeeName, onClose }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  // Загрузка файлов при открытии модального окна
  useEffect(() => {
    if (visible && employeeId) {
      fetchFiles();
    }
  }, [visible, employeeId]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await employeeService.getFiles(employeeId);
      setFiles(response.data || []);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) {
      return <FileImageOutlined style={{ fontSize: 32, color: '#52c41a' }} />;
    } else if (mimeType.includes('pdf')) {
      return <FilePdfOutlined style={{ fontSize: 32, color: '#f5222d' }} />;
    } else if (mimeType.includes('sheet') || mimeType.includes('excel')) {
      return <FileExcelOutlined style={{ fontSize: 32, color: '#52c41a' }} />;
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return <FileWordOutlined style={{ fontSize: 32, color: '#1890ff' }} />;
    }
    return <FileOutlined style={{ fontSize: 32, color: '#8c8c8c' }} />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleDownload = async (file) => {
    try {
      const response = await employeeService.getFileDownloadLink(employeeId, file.id);
      if (response.data.downloadUrl) {
        window.open(response.data.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Error getting download link:', error);
    }
  };

  const handleView = async (file) => {
    try {
      const response = await employeeService.getFileViewLink(employeeId, file.id);
      if (response.data.viewUrl) {
        window.open(response.data.viewUrl, '_blank');
      }
    } catch (error) {
      console.error('Error getting view link:', error);
    }
  };

  const handlePreview = async (file) => {
    // Для изображений показываем превью в модальном окне
    if (file.mimeType.startsWith('image/')) {
      try {
        console.log('Requesting view link for file:', file.id, file.originalName);
        const response = await employeeService.getFileViewLink(employeeId, file.id);
        console.log('Received view link response:', response);
        
        if (response.data.viewUrl) {
          console.log('Opening preview with URL:', response.data.viewUrl);
          setPreviewFile({
            url: response.data.viewUrl,
            name: file.originalName
          });
          setPreviewVisible(true);
        } else {
          console.error('No viewUrl in response');
        }
      } catch (error) {
        console.error('Error getting preview:', error);
        console.error('Error response:', error.response?.data);
      }
    } else {
      // Для других файлов открываем в новой вкладке
      handleView(file);
    }
  };

  return (
    <>
      <Modal
        title={`Файлы сотрудника: ${employeeName}`}
        open={visible}
        onCancel={onClose}
        width={700}
        footer={[
          <Button key="close" onClick={onClose}>
            Закрыть
          </Button>
        ]}
      >
        <Spin spinning={loading}>
          <List
            dataSource={files}
            locale={{ emptyText: 'Нет загруженных файлов' }}
            renderItem={(file) => (
              <List.Item
                actions={[
                  <Tooltip title="Просмотр">
                    <Button
                      icon={<EyeOutlined />}
                      size="small"
                      onClick={() => handlePreview(file)}
                    />
                  </Tooltip>,
                  <Tooltip title="Скачать">
                    <Button
                      icon={<DownloadOutlined />}
                      size="small"
                      onClick={() => handleDownload(file)}
                    />
                  </Tooltip>
                ]}
              >
                <List.Item.Meta
                  avatar={getFileIcon(file.mimeType)}
                  title={file.originalName}
                  description={
                    <Space split="|">
                      <span>{formatFileSize(file.fileSize)}</span>
                      <span>{new Date(file.createdAt).toLocaleDateString('ru-RU')}</span>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Spin>
      </Modal>

      {/* Модальное окно для предпросмотра изображений */}
      <Modal
        open={previewVisible}
        title={previewFile?.name}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        centered
      >
        {previewFile && (
          <div style={{ textAlign: 'center' }}>
            <img
              src={previewFile.url}
              alt={previewFile.name}
              style={{ 
                maxWidth: '100%', 
                maxHeight: '70vh',
                objectFit: 'contain'
              }}
              onError={(e) => {
                console.error('Error loading image:', previewFile.url);
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
            <div style={{ display: 'none', padding: '40px', textAlign: 'center' }}>
              <FileImageOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
              <p style={{ marginTop: 16, color: '#8c8c8c' }}>
                Не удалось загрузить изображение
              </p>
              <Button 
                type="primary" 
                onClick={() => window.open(previewFile.url, '_blank')}
              >
                Открыть в новой вкладке
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default EmployeeFilesModal;

