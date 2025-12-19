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
import { FileViewer } from '../../shared/ui/FileViewer';
import { employeeService } from '../../services/employeeService';
import { ALLOWED_MIME_TYPES, SUPPORTED_FORMATS, ALLOWED_EXTENSIONS } from '../../shared/constants/fileTypes.js';

const { Option } = Select;

// Типы документов
const DOCUMENT_TYPES = [
  { value: 'passport', label: 'Паспорт' },
  { value: 'bank_details', label: 'Реквизиты счета' },
  { value: 'kig', label: 'КИГ (Карта иностранного гражданина)' },
  { value: 'patent_front', label: 'Лицевая сторона патента (с фото)' },
  { value: 'patent_back', label: 'Задняя сторона патента' },
  { value: 'biometric_consent', label: 'Согласие на перс.дан. Генподряд' },
  { value: 'biometric_consent_developer', label: 'Согласие на перс.дан. Застройщ' },
  { value: 'diploma', label: 'Диплом / Документ об образовании' },
  { value: 'med_book', label: 'Мед.книжка' },
  { value: 'migration_card', label: 'Миграционная карта' },
  { value: 'arrival_notice', label: 'Уведомление о прибытии (регистрация)' },
  { value: 'patent_payment_receipt', label: 'Чек об оплате патента' },
  { value: 'mvd_notification', label: 'Уведомление МВД' }
];

const EmployeeFileUpload = ({ employeeId, readonly = false, onFilesChange, hideUploadButton = false }) => {
  const { message } = App.useApp();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [documentTypeModalVisible, setDocumentTypeModalVisible] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewingFile, setViewingFile] = useState(null);
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
      const filesList = response.data || [];
      setFiles(filesList);
      
      // Уведомляем родителя об изменении файлов (только для информации, без обновления сотрудника)
      // onFilesChange используется только для обновления отображения количества файлов в таблице
      if (onFilesChange) {
        onFilesChange(filesList.length);
      }
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
        // S3 URL теперь имеет правильный заголовок Content-Disposition от бэкэнда
        window.open(response.data.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Error getting download link:', error);
      message.error('Ошибка получения ссылки для скачивания');
    }
  };

  const handleView = async (file) => {
    // Открываем файл во встроенном просмотрщике с увеличением
    try {
      const response = await employeeService.getFileViewLink(employeeId, file.id);
      if (response.data.viewUrl) {
        setViewingFile({
          url: response.data.viewUrl,
          name: file.originalName,
          mimeType: file.mimeType,
          fileId: file.id
        });
        setViewerVisible(true);
      }
    } catch (error) {
      console.error('Error getting view link:', error);
      message.error('Ошибка получения ссылки для просмотра');
    }
  };

  // Скачивание файла из просмотрщика
  const handleDownloadFromViewer = async () => {
    if (viewingFile) {
      try {
        const response = await employeeService.getFileDownloadLink(employeeId, viewingFile.fileId);
        if (response.data.downloadUrl) {
          // S3 URL теперь имеет правильный заголовок Content-Disposition от бэкэнда
          window.open(response.data.downloadUrl, '_blank');
          message.success('Скачивание начато');
        }
      } catch (error) {
        console.error('Error getting download link:', error);
        message.error('Ошибка получения ссылки для скачивания');
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
    accept: ALLOWED_EXTENSIONS,
    fileList: fileList,
    beforeUpload: (file) => {
      // Проверка типа файла
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        message.error(
          `❌ ${file.name}: неподдерживаемый тип файла\n` +
          `✅ Поддерживаются: ${SUPPORTED_FORMATS}`
        );
        return Upload.LIST_IGNORE;
      }

      // Проверка размера файла (макс. 100 МБ)
      const fileSizeMB = file.size / 1024 / 1024;
      if (fileSizeMB > 100) {
        message.error(`❌ ${file.name}: размер файла ${fileSizeMB.toFixed(2)}MB превышает максимум 100MB`);
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
      {!readonly && !hideUploadButton && (
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
            ✅ Поддерживаемые форматы: {SUPPORTED_FORMATS} (макс. 100 МБ)
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

      {/* Встроенный просмотрщик файлов с увеличением */}
      <FileViewer
        visible={viewerVisible}
        fileUrl={viewingFile?.url}
        fileName={viewingFile?.name}
        mimeType={viewingFile?.mimeType}
        onClose={() => setViewerVisible(false)}
        onDownload={handleDownloadFromViewer}
      />
    </Space>
  );
};

export default EmployeeFileUpload;