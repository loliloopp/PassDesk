import { useState, useEffect } from 'react';
import { Upload, Button, Image, App, Space, Popconfirm, Tooltip, Spin } from 'antd';
import { UploadOutlined, DeleteOutlined, EyeOutlined, FileImageOutlined } from '@ant-design/icons';
import { employeeService } from '@/services/employeeService';

/**
 * Компонент для загрузки типизированных документов сотрудника
 * Используется для мобильной версии формы
 * 
 * @param {string} employeeId - ID сотрудника
 * @param {string} documentType - Тип документа (passport, consent, bank_details, kig, patent_front, patent_back)
 * @param {string} label - Название поля для отображения
 * @param {boolean} readonly - Режим только для чтения
 * @param {boolean} multiple - Разрешить загрузку нескольких файлов
 */
const EmployeeDocumentUpload = ({ 
  employeeId, 
  documentType, 
  label, 
  readonly = false,
  multiple = true 
}) => {
  const { message } = App.useApp();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => {
    if (employeeId) {
      fetchFiles();
    }
  }, [employeeId, documentType]);

  // Загрузка файлов с сервера
  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await employeeService.getFiles(employeeId);
      // Фильтруем файлы по типу документа
      const filteredFiles = response.data?.filter(file => file.documentType === documentType) || [];
      setFiles(filteredFiles);
    } catch (error) {
      console.error('Error loading files:', error);
      message.error('Ошибка загрузки файлов');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка файла
  const handleUpload = async (options) => {
    const { file } = options;
    
    // Проверка размера файла (макс. 10 МБ)
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('Размер файла превышает 10 МБ');
      return;
    }

    // Проверка типа файла (только изображения и PDF)
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/pdf'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      message.error('Поддерживаются только изображения (JPG, PNG) и PDF');
      return;
    }

    const formData = new FormData();
    formData.append('files', file);
    formData.append('documentType', documentType);

    setUploading(true);
    try {
      await employeeService.uploadFiles(employeeId, formData);
      message.success('Файл успешно загружен');
      fetchFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
      message.error(error.response?.data?.message || 'Ошибка загрузки файла');
    } finally {
      setUploading(false);
    }
  };

  // Удаление файла
  const handleDelete = async (fileId) => {
    try {
      await employeeService.deleteFile(employeeId, fileId);
      message.success('Файл удален');
      fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      message.error('Ошибка удаления файла');
    }
  };

  // Просмотр файла
  const handleView = async (file) => {
    try {
      const response = await employeeService.getFileViewLink(employeeId, file.id);
      if (response.data.viewUrl) {
        if (file.mimeType.startsWith('image/')) {
          setPreviewImage(response.data.viewUrl);
          setPreviewVisible(true);
        } else {
          window.open(response.data.viewUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Error getting view link:', error);
      message.error('Ошибка получения ссылки для просмотра');
    }
  };

  const uploadProps = {
    accept: 'image/jpeg,image/jpg,image/png,application/pdf',
    showUploadList: false,
    customRequest: handleUpload,
    multiple: multiple,
    disabled: uploading || readonly
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ 
        fontSize: 14, 
        marginBottom: 8,
        color: 'rgba(0, 0, 0, 0.88)'
      }}>
        {label}
      </div>

      {loading ? (
        <Spin />
      ) : (
        <>
          {/* Отображение загруженных файлов */}
          {files.length > 0 && (
            <Space direction="vertical" size={8} style={{ width: '100%', marginBottom: 8 }}>
              {files.map((file) => (
                <div
                  key={file.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 8,
                    background: '#f5f5f5',
                    borderRadius: 4,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <FileImageOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                    <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.fileName}
                    </span>
                  </div>
                  
                  <Space size={4}>
                    <Tooltip title="Просмотр">
                      <Button
                        icon={<EyeOutlined />}
                        size="small"
                        onClick={() => handleView(file)}
                      />
                    </Tooltip>
                    {!readonly && (
                      <Popconfirm
                        title="Удалить файл?"
                        onConfirm={() => handleDelete(file.id)}
                        okText="Удалить"
                        cancelText="Отмена"
                      >
                        <Tooltip title="Удалить">
                          <Button
                            icon={<DeleteOutlined />}
                            size="small"
                            danger
                          />
                        </Tooltip>
                      </Popconfirm>
                    )}
                  </Space>
                </div>
              ))}
            </Space>
          )}

          {/* Кнопка загрузки */}
          {!readonly && (!multiple && files.length < 1 || multiple) && (
            <Upload {...uploadProps}>
              <Button 
                icon={<UploadOutlined />} 
                loading={uploading}
                size="large"
                block
              >
                {uploading ? 'Загрузка...' : 'Загрузить'}
              </Button>
            </Upload>
          )}

          <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 4 }}>
            JPG, PNG, PDF (макс. 10 МБ)
          </div>
        </>
      )}

      {/* Модальное окно предпросмотра */}
      <Image
        style={{ display: 'none' }}
        preview={{
          visible: previewVisible,
          src: previewImage,
          onVisibleChange: (visible) => setPreviewVisible(visible),
        }}
      />
    </div>
  );
};

export default EmployeeDocumentUpload;

