import { useState, useEffect } from 'react';
import { Upload, Button, List, Popconfirm, App, Space, Tooltip, Modal, Select, Form } from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  FileOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  DownloadOutlined
} from '@ant-design/icons';
import { employeeService } from '../../services/employeeService';

const { Option } = Select;

// Типы документов
const DOCUMENT_TYPES = [
  { value: 'passport', label: 'Паспорт' },
  { value: 'patent_front', label: 'Лицевая сторона патента (с фото)' },
  { value: 'patent_back', label: 'Задняя сторона патента' },
  { value: 'biometric_consent', label: 'Согласие на обработку биометрических данных' },
  { value: 'other', label: 'Другое' }
];

const EmployeeFileUpload = ({ employeeId, readonly = false }) => {
  const { message } = App.useApp();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [documentTypeModalVisible, setDocumentTypeModalVisible] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => {
    if (employeeId) {
      fetchFiles();
    }
  }, [employeeId]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await employeeService.getFiles(employeeId);
      setFiles(response.data || []);
    } catch (error) {
      console.error('Error loading files:', error);
      message.error('Ошибка загрузки списка файлов');
    } finally {
      setLoading(false);
    }
  };

  // Открываем модальное окно выбора типа документа
  const handleSelectFiles = () => {
    if (fileList.length === 0) {
      message.warning('Выберите файлы для загрузки');
      return;
    }
    setSelectedFiles(fileList);
    setDocumentTypeModalVisible(true);
  };

  // Загрузка файлов с типом документа
  const handleUploadWithDocumentType = async () => {
    try {
      const values = await form.validateFields();
      const documentType = values.documentType;

      const formData = new FormData();
      selectedFiles.forEach(fileObj => {
        const actualFile = fileObj.originFileObj || fileObj;
        formData.append('files', actualFile);
      });
      
      // Добавляем тип документа в formData
      formData.append('documentType', documentType);

      setUploading(true);
      await employeeService.uploadFiles(employeeId, formData);
      message.success('Файлы успешно загружены');
      setFileList([]);
      setSelectedFiles([]);
      setDocumentTypeModalVisible(false);
      form.resetFields();
      fetchFiles();
    } catch (error) {
      if (error.errorFields) {
        // Ошибка валидации формы
        return;
      }
      console.error('Error uploading files:', error);
      message.error(error.response?.data?.message || 'Ошибка загрузки файлов');
    } finally {
      setUploading(false);
    }
  };

  // Отмена выбора типа документа
  const handleCancelDocumentType = () => {
    setDocumentTypeModalVisible(false);
    setSelectedFiles([]);
    form.resetFields();
  };

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

  const handleDownload = async (file) => {
    try {
      const response = await employeeService.getFileDownloadLink(employeeId, file.id);
      if (response.data.downloadUrl) {
        window.open(response.data.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Error getting download link:', error);
      message.error('Ошибка получения ссылки для скачивания');
    }
  };

  const handleView = async (file) => {
    // Для изображений показываем превью в модальном окне
    if (file.mimeType.startsWith('image/')) {
      try {
        const response = await employeeService.getFileViewLink(employeeId, file.id);
        if (response.data.viewUrl) {
          setPreviewFile({
            url: response.data.viewUrl,
            name: file.originalName
          });
          setPreviewVisible(true);
        }
      } catch (error) {
        console.error('Error getting view link:', error);
        message.error('Ошибка получения ссылки для просмотра');
      }
    } else {
      // Для других файлов открываем в новой вкладке
      try {
        const response = await employeeService.getFileViewLink(employeeId, file.id);
        if (response.data.viewUrl) {
          window.open(response.data.viewUrl, '_blank');
        }
      } catch (error) {
        console.error('Error getting view link:', error);
        message.error('Ошибка получения ссылки для просмотра');
      }
    }
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) {
      return <FileImageOutlined style={{ fontSize: 24, color: '#52c41a' }} />;
    } else if (mimeType.includes('pdf')) {
      return <FilePdfOutlined style={{ fontSize: 24, color: '#f5222d' }} />;
    } else if (mimeType.includes('sheet') || mimeType.includes('excel')) {
      return <FileExcelOutlined style={{ fontSize: 24, color: '#52c41a' }} />;
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return <FileWordOutlined style={{ fontSize: 24, color: '#1890ff' }} />;
    }
    return <FileOutlined style={{ fontSize: 24, color: '#8c8c8c' }} />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Получить название типа документа
  const getDocumentTypeName = (documentType) => {
    const type = DOCUMENT_TYPES.find(t => t.value === documentType);
    return type ? type.label : 'Не указан';
  };

  const uploadProps = {
    multiple: true,
    accept: '.jpg,.jpeg,.png,.pdf,.xls,.xlsx,.doc,.docx',
    fileList: fileList,
    beforeUpload: (file) => {
      // Проверка размера файла (макс. 10 МБ)
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error(`${file.name}: размер файла превышает 10 МБ`);
        return Upload.LIST_IGNORE;
      }

      // Проверка типа файла
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        message.error(`${file.name}: неподдерживаемый тип файла`);
        return Upload.LIST_IGNORE;
      }

      return false; // Не загружать автоматически
    },
    onChange: (info) => {
      // Обновляем fileList при изменениях
      setFileList(info.fileList);
    },
    onRemove: (file) => {
      return true; // Разрешить удаление
    },
    showUploadList: true
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {!readonly && (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />} disabled={uploading}>
              Выбрать файлы
            </Button>
          </Upload>
          {fileList.length > 0 && (
            <Button
              type="primary"
              icon={<UploadOutlined />}
              loading={uploading}
              onClick={handleSelectFiles}
            >
              Загрузить {fileList.length} файл(ов)
            </Button>
          )}
          <div style={{ color: '#8c8c8c', fontSize: '12px' }}>
            Поддерживаемые форматы: JPG, PNG, PDF, XLS, XLSX, DOC, DOCX (макс. 10 МБ)
          </div>
        </Space>
      )}

      <List
        loading={loading}
        dataSource={files}
        locale={{ emptyText: 'Нет загруженных файлов' }}
        renderItem={(file) => (
          <List.Item
            actions={[
              <Tooltip key="view" title="Просмотр">
                <Button
                  icon={<EyeOutlined />}
                  size="small"
                  onClick={() => handleView(file)}
                />
              </Tooltip>,
              <Tooltip key="download" title="Скачать">
                <Button
                  icon={<DownloadOutlined />}
                  size="small"
                  onClick={() => handleDownload(file)}
                />
              </Tooltip>,
              !readonly && (
                <Popconfirm
                  key="delete"
                  title="Удалить файл?"
                  description="Это действие нельзя отменить"
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
              )
            ].filter(Boolean)}
          >
            <List.Item.Meta
              avatar={getFileIcon(file.mimeType)}
              title={file.fileName}
              description={
                <Space direction="vertical" size={0}>
                  <Space split="|">
                    <span>{formatFileSize(file.fileSize)}</span>
                    <span>{new Date(file.createdAt).toLocaleDateString('ru-RU')}</span>
                  </Space>
                  {file.documentType && (
                    <span style={{ color: '#1890ff', fontSize: '12px' }}>
                      📄 {getDocumentTypeName(file.documentType)}
                    </span>
                  )}
                </Space>
              }
            />
          </List.Item>
        )}
      />

      {/* Модальное окно для выбора типа документа */}
      <Modal
        title="Выбор типа документа"
        open={documentTypeModalVisible}
        onOk={handleUploadWithDocumentType}
        onCancel={handleCancelDocumentType}
        okText="Загрузить"
        cancelText="Отмена"
        confirmLoading={uploading}
        width={500}
        centered
      >
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            label="Тип документа"
            name="documentType"
            rules={[
              { required: true, message: 'Пожалуйста, выберите тип документа' }
            ]}
          >
            <Select
              placeholder="Выберите тип документа"
              size="large"
              autoComplete="off"
            >
              {DOCUMENT_TYPES.map(type => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <div style={{ marginTop: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
            <strong>Выбрано файлов:</strong> {selectedFiles.length}
          </div>
        </Form>
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
    </Space>
  );
};

export default EmployeeFileUpload;

