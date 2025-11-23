import { useState, useEffect, useRef } from 'react';
import { Upload, Button, Image, App, Space, Popconfirm, Tooltip, Spin } from 'antd';
import { UploadOutlined, DeleteOutlined, EyeOutlined, FileImageOutlined, CameraOutlined } from '@ant-design/icons';
import { employeeService } from '@/services/employeeService';
import { DocumentScannerModal as DocumentCamera } from '@/features/document-scanner';

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
  const [cameraVisible, setCameraVisible] = useState(false);
  
  // Ссылка на скрытый инпут для системной камеры (резервный вариант)
  const nativeCameraInputRef = useRef(null);
  
  // Ссылка на скрытый инпут для выбора файлов
  const fileInputRef = useRef(null);

  // Загружаем файлы только при изменении employeeId или documentType
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
      const filteredFiles = response.data?.filter(file => {
        const typeValue = file.documentType || file.document_type;
        return typeValue === documentType;
      }) || [];
      
      setFiles(filteredFiles);
    } catch (error) {
      console.error('Error loading files:', error);
      message.error('Ошибка загрузки файлов');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка файла (универсальная функция)
  const uploadFile = async (file) => {
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

  // Загрузка файла через Upload компонент
  const handleUpload = async (options) => {
    const { file } = options;
    await uploadFile(file);
  };

  // Обработка захвата с камеры (OpenCV)
  const handleCameraCapture = async (blob) => {
    // Конвертируем Blob в File
    const file = new File([blob], `document-${Date.now()}.jpg`, { type: 'image/jpeg' });
    setCameraVisible(false);
    await uploadFile(file);
  };

  // Обработка захвата с системной камеры (Fallback)
  const handleNativeCameraCapture = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await uploadFile(file);
    }
    // Очищаем инпут, чтобы можно было снять то же самое фото снова
    e.target.value = '';
  };

  // Обработка выбора файлов из файлового менеджера
  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Если multiple не разрешен, загружаем только первый файл
      const filesToUpload = multiple ? Array.from(files) : [files[0]];
      
      for (const file of filesToUpload) {
        await uploadFile(file);
      }
    }
    // Очищаем инпут для следующей загрузки
    e.target.value = '';
  };

  // Открыть файловый менеджер
  const handleOpenFileManager = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Умный запуск камеры
  const handleStartCamera = () => {
    // Проверяем поддержку API и контекст безопасности (HTTPS/localhost)
    const isApiSupported = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    // const isSecure = window.isSecureContext; // Обычно isApiSupported уже false если не secure

    if (isApiSupported) {
      setCameraVisible(true);
    } else {
      // Если API недоступен (например, HTTP), используем системную камеру
      console.warn('Camera API not supported or insecure context. Fallback to native input.');
      if (!window.isSecureContext) {
        message.warning('Умный режим недоступен по HTTP. Запуск системной камеры.');
      }
      nativeCameraInputRef.current?.click();
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
                        <Button
                          icon={<DeleteOutlined />}
                          size="small"
                          danger
                        />
                      </Popconfirm>
                    )}
                  </Space>
                </div>
              ))}
            </Space>
          )}

          {/* Кнопки загрузки */}
          {!readonly && (!multiple && files.length < 1 || multiple) && (
            <>
              <Space style={{ width: '100%' }}>
                {/* Кнопка фотографирования */}
                <Button 
                  icon={<CameraOutlined />}
                  type="primary"
                  size="middle"
                  onClick={handleStartCamera}
                  disabled={uploading}
                >
                  Фото
                </Button>
                
                {/* Скрытый инпут для системной камеры (Fallback) */}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  ref={nativeCameraInputRef}
                  onChange={handleNativeCameraCapture}
                />

                {/* Кнопка загрузки файла */}
                <Button 
                  icon={<UploadOutlined />} 
                  loading={uploading}
                  size="middle"
                  onClick={handleOpenFileManager}
                  disabled={uploading}
                >
                  {uploading ? 'Загрузка...' : 'Файлы'}
                </Button>

                {/* Скрытый инпут для выбора файлов */}
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  multiple={multiple}
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                />
              </Space>
            </>
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

      {/* Компонент камеры с режимом документа */}
      <DocumentCamera
        visible={cameraVisible}
        onCapture={handleCameraCapture}
        onCancel={() => setCameraVisible(false)}
      />
    </div>
  );
};

export default EmployeeDocumentUpload;

