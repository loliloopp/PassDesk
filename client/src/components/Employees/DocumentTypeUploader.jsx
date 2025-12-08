import { useState } from 'react';
import { Row, Col, Button, Upload, App, Tooltip, Spin } from 'antd';
import { UploadOutlined, CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons';
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

  // Загрузить файлы для конкретного типа документа
  const handleUpload = async (file, documentType) => {
    // Предотвращаем автоматическую загрузку через компонент Upload
    return false;
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
      
      // Обновляем счетчик файлов для этого типа
      const filesOfType = await employeeService.getFiles(employeeId);
      const countForType = filesOfType.data?.filter(f => f.documentType === documentType).length || 0;
      
      setFileCounts(prev => ({ 
        ...prev, 
        [documentType]: countForType 
      }));

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

  return (
    <div style={{ padding: '16px 0' }}>
      <style>{`
        .document-uploader-column {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .document-uploader-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          border-radius: 4px;
          background: #fafafa;
          min-height: 36px;
        }
        .document-uploader-label {
          min-width: 140px;
          font-size: 13px;
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
      `}</style>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <div className="document-uploader-column">
            {DOCUMENT_TYPES.slice(0, 6).map(docType => (
              <div key={docType.value} className="document-uploader-item">
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
                        icon={uploadingTypes[docType.value] ? <LoadingOutlined /> : <UploadOutlined />}
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
                          {fileCounts[docType.value] || 0}
                        </>
                      )}
                    </span>
                  </>
                ) : (
                  <span className="document-uploader-count">
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
                    {fileCounts[docType.value] || 0}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Col>

        <Col xs={24} sm={12}>
          <div className="document-uploader-column">
            {DOCUMENT_TYPES.slice(6).map(docType => (
              <div key={docType.value} className="document-uploader-item">
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
                        icon={uploadingTypes[docType.value] ? <LoadingOutlined /> : <UploadOutlined />}
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
                          {fileCounts[docType.value] || 0}
                        </>
                      )}
                    </span>
                  </>
                ) : (
                  <span className="document-uploader-count">
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
                    {fileCounts[docType.value] || 0}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default DocumentTypeUploader;

