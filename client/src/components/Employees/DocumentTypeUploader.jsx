import { useState, useEffect } from 'react';
import { Row, Col, Button, Upload, App, Tooltip, Spin, List, Space, Popconfirm, Tag } from 'antd';
import { CheckCircleOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { employeeService } from '../../services/employeeService';

// Типы документов
const DOCUMENT_TYPES = [
  { value: 'passport', label: 'Паспорт' },
  { value: 'bank_details', label: 'Реквизиты счета' },
  { value: 'kig', label: 'КИГ' },
  { value: 'patent_front', label: 'Патент (лиц.)' },
  { value: 'patent_back', label: 'Патент (спин.)' },
  { value: 'biometric_consent', label: 'Согласие биоман.' },
  { value: 'diploma', label: 'Диплом' },
  { value: 'med_book', label: 'Мед.книжка' },
  { value: 'migration_card', label: 'Миграционная карта' },
  { value: 'arrival_notice', label: 'Уведомление о прибытии' },
  { value: 'patent_payment_receipt', label: 'Чек оплаты патента' },
  { value: 'mvd_notification', label: 'Уведомление МВД' }
];

/**
 * Компонент для загрузки документов по типам с автоматической загрузкой
 * Каждый тип документа имеет отдельную кнопку с множественным выбором файлов
 */
const DocumentTypeUploader = ({ employeeId, onFilesUpdated, readonly = false }) => {
  const { message } = App.useApp();
  const [uploadingTypes, setUploadingTypes] = useState({}); // { docType: true/false }
  const [fileCounts, setFileCounts] = useState({}); // { docType: count }
  const [allFiles, setAllFiles] = useState([]); // все загруженные файлы
  const [loading, setLoading] = useState(false);

  // Загрузить файлы при инициализации и при изменении employeeId
  useEffect(() => {
    if (employeeId) {
      fetchAllFiles();
    }
  }, [employeeId]);

  // Загрузить все файлы и обновить счетчики по типам
  const fetchAllFiles = async () => {
    setLoading(true);
    try {
      const response = await employeeService.getFiles(employeeId);
      const files = response.data || [];
      setAllFiles(files);

      // Подсчитываем файлы по типам документов
      const counts = {};
      DOCUMENT_TYPES.forEach(docType => {
        counts[docType.value] = files.filter(f => f.documentType === docType.value).length;
      });
      setFileCounts(counts);
    } catch (error) {
      console.error('Error loading files:', error);
      message.error('Ошибка загрузки файлов');
    } finally {
      setLoading(false);
    }
  };

  // Предотвращаем автоматическую загрузку через компонент Upload
  const handleUpload = async (file, documentType) => {
    return false;
  };

  // Получить файлы для конкретного типа документа
  const getFilesForType = (documentType) => {
    return allFiles.filter(f => f.documentType === documentType);
  };

  // Компонент для рендеринга одного типа документа
  const DocumentTypeItem = ({ docType }) => {
    const filesOfType = getFilesForType(docType.value);

    return (
      <div key={docType.value} className="document-uploader-item">
        <div className="document-uploader-header">
          <span className="document-uploader-label">
            <Tooltip title={docType.label}>
              {docType.label}
            </Tooltip>
          </span>

          {!readonly ? (
            <>
              <Upload
                accept="*"
                multiple={true}
                beforeUpload={(file, fileList) => handleUpload(file, docType.value)}
                onChange={(info) => handleChange(info, docType.value)}
                showUploadList={false}
                disabled={uploadingTypes[docType.value]}
              >
                <Button
                  size="small"
                  loading={uploadingTypes[docType.value]}
                  className="document-uploader-button"
                >
                  {uploadingTypes[docType.value] ? 'Загруз.' : 'Загрузить'}
                </Button>
              </Upload>

              <span className="document-uploader-count">
                {uploadingTypes[docType.value] ? (
                  <Spin size="small" />
                ) : (
                  <>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
                    {filesOfType.length}
                  </>
                )}
              </span>
            </>
          ) : (
            <span className="document-uploader-count">
              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
              {filesOfType.length}
            </span>
          )}
        </div>

        {/* Список загруженных файлов */}
        {filesOfType.length > 0 && (
          <div className="document-uploader-files">
            <List
              size="small"
              dataSource={filesOfType}
              renderItem={(file) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <span style={{ fontSize: '12px' }}>
                        {file.filename || file.originalName}
                      </span>
                    }
                    description={
                      <span style={{ fontSize: '11px', color: '#8c8c8c' }}>
                        {file.mimeType && `${file.mimeType} • `}
                        {file.size ? `${(file.size / 1024).toFixed(1)} KB` : ''}
                      </span>
                    }
                  />
                  {!readonly && (
                    <Space size="small">
                      <Button
                        type="text"
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownloadFile(file)}
                      />
                      <Popconfirm
                        title="Удалить файл?"
                        description="Вы уверены, что хотите удалить этот файл?"
                        onConfirm={() => handleDeleteFile(file.id)}
                        okText="Да"
                        cancelText="Отмена"
                      >
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  )}
                </List.Item>
              )}
            />
          </div>
        )}
      </div>
    );
  };

  // Обработка выбора файлов и их загрузка
  const handleChange = async (info, documentType) => {
    const { fileList } = info;

    if (fileList.length === 0) {
      return;
    }

    // Показываем индикатор загрузки
    setUploadingTypes(prev => ({ ...prev, [documentType]: true }));

    try {
      const formData = new FormData();
      
      // Добавляем все выбранные файлы
      fileList.forEach(fileObj => {
        const actualFile = fileObj.originFileObj || fileObj;
        formData.append('files', actualFile);
      });
      
      // Добавляем тип документа
      formData.append('documentType', documentType);

      // Загружаем файлы
      await employeeService.uploadFiles(employeeId, formData);
      
      message.success(`${DOCUMENT_TYPES.find(d => d.value === documentType)?.label} загружен(ы)`);
      
      // Перезагружаем все файлы чтобы обновить счетчики
      await fetchAllFiles();

      // Уведомляем родителя об обновлении
      if (onFilesUpdated) {
        onFilesUpdated();
      }
    } catch (error) {
      console.error(`Error uploading ${documentType}:`, error);
      message.error(`Ошибка загрузки файла`);
    } finally {
      setUploadingTypes(prev => ({ ...prev, [documentType]: false }));
    }
  };

  // Удаление файла
  const handleDeleteFile = async (fileId) => {
    try {
      await employeeService.deleteFile(fileId);
      message.success('Файл удален');
      await fetchAllFiles();
      if (onFilesUpdated) {
        onFilesUpdated();
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      message.error('Ошибка удаления файла');
    }
  };

  // Скачать файл
  const handleDownloadFile = async (file) => {
    try {
      const response = await employeeService.downloadFile(file.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.filename || 'file');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Error downloading file:', error);
      message.error('Ошибка скачивания файла');
    }
  };

  return (
    <div style={{ padding: '16px 0' }}>
      <style>{`
        .document-uploader-column {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .document-uploader-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 8px;
          border-radius: 4px;
          background: #fafafa;
          border: 1px solid #f0f0f0;
        }
        .document-uploader-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .document-uploader-label {
          min-width: 140px;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 0 0 auto;
        }
        .document-uploader-button {
          flex: 0 0 auto;
          width: 90px;
        }
        .document-uploader-count {
          font-size: 12px;
          color: #8c8c8c;
          min-width: 50px;
          text-align: right;
          flex: 0 0 auto;
        }
        .document-uploader-files {
          padding-left: 4px;
          margin-top: 4px;
          border-top: 1px solid #e8e8e8;
          padding-top: 6px;
        }
        .document-uploader-files .ant-list {
          padding: 0;
          background: transparent;
        }
        .document-uploader-files .ant-list-item {
          padding: 4px 0;
          border: none;
        }
      `}</style>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <div className="document-uploader-column">
            {DOCUMENT_TYPES.slice(0, 6).map(docType => (
              <DocumentTypeItem key={docType.value} docType={docType} />
            ))}
          </div>
        </Col>

        <Col xs={24} sm={12}>
          <div className="document-uploader-column">
            {DOCUMENT_TYPES.slice(6).map(docType => (
              <DocumentTypeItem key={docType.value} docType={docType} />
            ))}
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default DocumentTypeUploader;

