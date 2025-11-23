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
import { FileViewer } from '../../shared/ui/FileViewer';
import { employeeService } from '../../services/employeeService';

const EmployeeFilesModal = ({ visible, employeeId, employeeName, onClose }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);

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
    // Открываем файл во встроенном просмотрщике с увеличением
    try {
      const response = await employeeService.getFileViewLink(employeeId, file.id);
      if (response.data.viewUrl) {
        setViewingFile({
          url: response.data.viewUrl,
          name: file.fileName,
          mimeType: file.mimeType,
          fileId: file.id
        });
        setViewerVisible(true);
      }
    } catch (error) {
      console.error('Error getting view link:', error);
    }
  };

  // Скачивание файла из просмотрщика
  const handleDownloadFromViewer = async () => {
    if (viewingFile) {
      try {
        const response = await employeeService.getFileDownloadLink(employeeId, viewingFile.fileId);
        if (response.data.downloadUrl) {
          window.open(response.data.downloadUrl, '_blank');
        }
      } catch (error) {
        console.error('Error getting download link:', error);
      }
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
                  title={file.fileName}
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

      {/* Встроенный просмотрщик файлов с увеличением */}
      <FileViewer
        visible={viewerVisible}
        fileUrl={viewingFile?.url}
        fileName={viewingFile?.name}
        mimeType={viewingFile?.mimeType}
        onClose={() => setViewerVisible(false)}
        onDownload={handleDownloadFromViewer}
      />
    </>
  );
};

export default EmployeeFilesModal;

