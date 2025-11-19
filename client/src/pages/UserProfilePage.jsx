import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Form,
  Input,
  Select,
  Spin,
  message,
  Typography,
  Upload,
  List,
  Space,
  Modal,
  Alert,
  Grid,
  Badge,
  Progress
} from 'antd';
import {
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  UserOutlined,
  CameraOutlined,
  FileOutlined,
  UploadOutlined,
  EyeOutlined,
  DeleteOutlined,
  CheckCircleFilled,
  LogoutOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import imageCompression from 'browser-image-compression';
import userProfileService from '@/services/userProfileService';
import { citizenshipService } from '@/services/citizenshipService';
import { useAuthStore } from '@/store/authStore';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

// Функция для форматирования даты с автоматическими точками
const formatDateInput = (value) => {
  // Убираем все нецифровые символы (точки, запятые и т.д.)
  const numbers = value.replace(/\D/g, '');
  
  // Форматируем с точками: ДД.ММ.ГГГГ
  let result = '';
  
  for (let i = 0; i < numbers.length && i < 8; i++) {
    if (i === 2 || i === 4) {
      result += '.';
    }
    result += numbers[i];
  }
  
  return result;
};

// Маска для СНИЛС: форматирует ввод в 123-456-789 00
const formatSnils = (value) => {
  if (!value) return value;
  
  // Убираем все символы кроме цифр
  const snils = value.replace(/[^\d]/g, '');
  
  // Ограничиваем длину до 11 цифр
  const snilsLength = snils.length;
  
  if (snilsLength < 4) {
    return snils;
  }
  if (snilsLength < 7) {
    return `${snils.slice(0, 3)}-${snils.slice(3)}`;
  }
  if (snilsLength < 10) {
    return `${snils.slice(0, 3)}-${snils.slice(3, 6)}-${snils.slice(6)}`;
  }
  return `${snils.slice(0, 3)}-${snils.slice(3, 6)}-${snils.slice(6, 9)} ${snils.slice(9, 11)}`;
};

// Маска для КИГ: форматирует ввод в АА 1234567
const formatKig = (value) => {
  if (!value) return value;
  
  // Преобразуем в верхний регистр
  let kig = value.toUpperCase();
  
  // Убираем все символы кроме букв и цифр
  kig = kig.replace(/[^A-ZА-Я0-9]/g, '');
  
  // Разделяем на буквы и цифры
  const letters = kig.replace(/[^A-ZА-Я]/g, '');
  const numbers = kig.replace(/[^0-9]/g, '');
  
  // Ограничиваем: 2 буквы + 7 цифр
  const limitedLetters = letters.slice(0, 2);
  const limitedNumbers = numbers.slice(0, 7);
  
  // Форматируем: АА 1234567
  if (limitedLetters.length === 0) {
    return '';
  }
  if (limitedNumbers.length === 0) {
    return limitedLetters;
  }
  return `${limitedLetters} ${limitedNumbers}`;
};

// Маска для ИНН: форматирует ввод в XXXX-XXXXX-X (10 цифр) или XXXX-XXXXXX-XX (12 цифр)
const formatInn = (value) => {
  if (!value) return value;
  
  // Убираем все символы кроме цифр
  const inn = value.replace(/[^\d]/g, '');
  
  // Ограничиваем длину до 12 цифр
  const innLength = inn.length;
  
  if (innLength <= 4) {
    return inn;
  }
  if (innLength <= 9) {
    // Начинаем форматировать для 10-значного ИНН
    return `${inn.slice(0, 4)}-${inn.slice(4)}`;
  }
  if (innLength === 10) {
    // 10-значный ИНН: XXXX-XXXXX-X
    return `${inn.slice(0, 4)}-${inn.slice(4, 9)}-${inn.slice(9)}`;
  }
  if (innLength <= 10) {
    // Промежуточное состояние для 12-значного ИНН
    return `${inn.slice(0, 4)}-${inn.slice(4, 10)}`;
  }
  // 12-значный ИНН: XXXX-XXXXXX-XX
  return `${inn.slice(0, 4)}-${inn.slice(4, 10)}-${inn.slice(10, 12)}`;
};

const UserProfilePage = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [citizenships, setCitizenships] = useState([]);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [form] = Form.useForm();

  // Загрузка данных профиля
  useEffect(() => {
    loadProfile();
    loadCitizenships();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data } = await userProfileService.getMyProfile();
      setEmployee(data.employee);
      
      if (data.employee) {
        // Форматируем даты в DD.MM.YYYY
        const formatDate = (date) => {
          if (!date) return '';
          const d = dayjs(date);
          return d.isValid() ? d.format('DD.MM.YYYY') : '';
        };
        
        // Заполняем форму данными
        form.setFieldsValue({
          ...data.employee,
          birthDate: formatDate(data.employee.birthDate),
          passportDate: formatDate(data.employee.passportDate),
          patentIssueDate: formatDate(data.employee.patentIssueDate),
          // Форматируем ИНН, СНИЛС и КИГ
          inn: data.employee.inn ? formatInn(data.employee.inn) : '',
          snils: data.employee.snils ? formatSnils(data.employee.snils) : '',
          kig: data.employee.kig ? formatKig(data.employee.kig) : '',
        });
        
        // Загружаем файлы
        loadFiles(data.employee.id);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      message.error('Ошибка загрузки профиля');
    } finally {
      setLoading(false);
    }
  };

  const loadCitizenships = async () => {
    try {
      const response = await citizenshipService.getAll();
      
      // Сервер возвращает { success: true, data: { citizenships: [...] } }
      // Axios оборачивает это в response.data
      const citizenshipsData = response.data?.data?.citizenships || response.data?.citizenships || [];
      setCitizenships(citizenshipsData);
    } catch (error) {
      console.error('Error loading citizenships:', error);
      message.error('Ошибка загрузки списка гражданств');
    }
  };

  const loadFiles = async (employeeId) => {
    try {
      const response = await userProfileService.getFiles(employeeId);
      setFiles(response.data || []);
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Восстанавливаем исходные данные
    if (employee) {
      const formatDate = (date) => {
        if (!date) return '';
        const d = dayjs(date);
        return d.isValid() ? d.format('DD.MM.YYYY') : '';
      };
      
      form.setFieldsValue({
        ...employee,
        birthDate: formatDate(employee.birthDate),
        passportDate: formatDate(employee.passportDate),
        patentIssueDate: formatDate(employee.patentIssueDate),
        // Форматируем ИНН, СНИЛС и КИГ
        inn: employee.inn ? formatInn(employee.inn) : '',
        snils: employee.snils ? formatSnils(employee.snils) : '',
        kig: employee.kig ? formatKig(employee.kig) : '',
      });
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      // Преобразуем даты из DD.MM.YYYY в YYYY-MM-DD с валидацией
      const parseDate = (dateStr) => {
        if (!dateStr) return null;
        
        // Проверяем формат DD.MM.YYYY (должно быть ровно 10 символов с точками)
        if (dateStr.length !== 10 || dateStr.split('.').length !== 3) {
          return null; // Неполная дата - не сохраняем
        }
        
        const parts = dateStr.split('.');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          
          // Проверяем, что все части - числа
          if (!day || !month || !year || isNaN(day) || isNaN(month) || isNaN(year)) {
            return null;
          }
          
          // Проверяем валидность даты с помощью dayjs
          const dateString = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          const parsedDate = dayjs(dateString, 'YYYY-MM-DD', true);
          
          if (!parsedDate.isValid()) {
            return null; // Невалидная дата (например 32.13.2024)
          }
          
          return dateString;
        }
        return null;
      };

      const formattedValues = {
        ...values,
        birthDate: parseDate(values.birthDate),
        passportDate: parseDate(values.passportDate),
        patentIssueDate: parseDate(values.patentIssueDate),
        // Убираем дефисы и пробелы из ИНН, СНИЛС, КИГ перед отправкой
        inn: values.inn ? values.inn.replace(/[^\d]/g, '') : null,
        snils: values.snils ? values.snils.replace(/[^\d]/g, '') : null,
        kig: values.kig ? values.kig.replace(/[^A-ZА-Я0-9]/g, '') : null,
      };

      console.log('💾 Saving profile:', formattedValues);

      const { data } = await userProfileService.updateMyProfile(formattedValues);
      setEmployee(data.employee);
      setIsEditing(false);
      message.success('Профиль успешно обновлен');
    } catch (error) {
      console.error('Error saving profile:', error);
      
      // Детальное сообщение об ошибке
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors
          .map(err => `${err.field}: ${err.message}`)
          .join('\n');
        message.error({
          content: (
            <div>
              <div>Ошибка валидации:</div>
              <div style={{ marginTop: 8, fontSize: 12 }}>
                {error.response.data.errors.map((err, idx) => (
                  <div key={idx}>• {err.field}: {err.message}</div>
                ))}
              </div>
            </div>
          ),
          duration: 5
        });
      } else {
        message.error(error.response?.data?.message || 'Ошибка сохранения профиля');
      }
    } finally {
      setSaving(false);
    }
  };

  // Обработка загрузки файлов
  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('Выберите файлы для загрузки');
      return;
    }

    // Проверка лимитов
    const currentFilesCount = files.length;
    const totalFiles = currentFilesCount + fileList.length;
    if (totalFiles > 10) {
      message.error(`Превышен лимит файлов. У вас уже загружено ${currentFilesCount} файлов. Максимум 10.`);
      return;
    }

    try {
      setUploading(true);
      const processedFiles = [];
      
      // Обрабатываем каждый файл
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        let processedFile = file;
        
        // Если это изображение и размер больше 1MB - сжимаем
        if (file.type.startsWith('image/') && file.size > 1024 * 1024) {
          try {
            message.loading({ 
              content: `Сжатие изображения ${i + 1}/${fileList.length}...`, 
              key: 'compress',
              duration: 0 
            });
            
            const options = {
              maxSizeMB: 1, // Максимальный размер 1MB
              maxWidthOrHeight: 1920, // Максимальное разрешение
              useWebWorker: true,
              fileType: file.type
            };
            
            const compressedBlob = await imageCompression(file, options);
            
            // Создаем новый File объект из сжатого blob
            processedFile = new File([compressedBlob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            
            const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
            const compressedSizeMB = (processedFile.size / 1024 / 1024).toFixed(2);
            
            console.log(`Изображение сжато: ${originalSizeMB}MB -> ${compressedSizeMB}MB`);
            message.destroy('compress');
          } catch (compressionError) {
            console.error('Ошибка сжатия изображения:', compressionError);
            message.destroy('compress');
            // Продолжаем с оригинальным файлом
          }
        }
        
        // Проверка размера после сжатия
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (processedFile.size > maxSize) {
          message.error(`Файл "${file.name}" слишком большой даже после сжатия`);
          setUploading(false);
          return;
        }
        
        processedFiles.push(processedFile);
      }
      
      // Загружаем файлы
      message.loading({ content: 'Загрузка файлов...', key: 'upload', duration: 0 });
      
      try {
        const response = await userProfileService.uploadFiles(employee.id, processedFiles);
        console.log('✅ Upload successful:', response);
        
        message.destroy('upload');
        message.success({
          content: `✅ Успешно загружено ${processedFiles.length} файл(ов)!`,
          duration: 3,
          style: {
            marginTop: '20vh',
          }
        });
        
        setFileList([]);
        await loadFiles(employee.id);
      } catch (uploadError) {
        console.error('❌ Upload failed:', uploadError);
        message.destroy('upload');
        
        // Даже если произошла ошибка, пробуем обновить список файлов
        // так как файл мог быть сохранен на сервере
        await loadFiles(employee.id);
        
        // Проверяем, был ли файл действительно загружен
        const updatedFiles = files;
        const newFilesCount = updatedFiles.length - currentFilesCount;
        
        if (newFilesCount > 0) {
          // Файл сохранился несмотря на ошибку
          message.success({
            content: `✅ Файл успешно загружен (${newFilesCount} файл.)`,
            duration: 3
          });
          setFileList([]);
        } else {
          // Реальная ошибка загрузки
          throw uploadError;
        }
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      message.destroy('upload');
      message.destroy('compress');
      message.error(error.response?.data?.message || error.message || 'Ошибка загрузки файлов');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    try {
      await userProfileService.deleteFile(employee.id, fileId);
      message.success('Файл удален');
      loadFiles(employee.id);
    } catch (error) {
      console.error('Error deleting file:', error);
      message.error('Ошибка удаления файла');
    }
  };

  const handleViewFile = async (file) => {
    try {
      const { data } = await userProfileService.getFileViewLink(employee.id, file.id);
      setPreviewFile({
        url: data.viewUrl,
        name: file.fileName
      });
      setPreviewVisible(true);
    } catch (error) {
      console.error('Error viewing file:', error);
      message.error('Ошибка просмотра файла');
    }
  };

  const uploadProps = {
    multiple: true,
    fileList,
    beforeUpload: (file) => {
      setFileList(prev => [...prev, file]);
      return false;
    },
    onRemove: (file) => {
      setFileList(prev => prev.filter(f => f.uid !== file.uid));
    },
    accept: 'image/*,.pdf,.doc,.docx,.xls,.xlsx'
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!employee) {
    return (
      <Card>
        <Alert
          message="Профиль не найден"
          description="Пожалуйста, обратитесь к администратору"
          type="warning"
          showIcon
        />
      </Card>
    );
  }

  const isEmpty = !employee.firstName && !employee.lastName;

  return (
    <div style={{ 
      minHeight: '100vh',
      paddingTop: isMobile ? '56px' : '72px', // Отступ для фиксированного хедера
      background: '#f0f2f5'
    }}>
      {/* Закрепленная шапка */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: isMobile ? 0 : 250, // Учитываем ширину Sidebar на desktop
        right: 0,
        zIndex: 1000,
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        {/* Заголовок */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '12px 16px' : '16px 24px',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <Space>
            {!isMobile && <UserOutlined style={{ fontSize: 20, color: '#1890ff' }} />}
            <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
              Мой профиль
            </Title>
          </Space>
          
          {/* Кнопки редактирования */}
          {!isEditing ? (
            <Button 
              type="primary" 
              icon={<EditOutlined />} 
              onClick={handleEdit}
              size={isMobile ? 'middle' : 'large'}
            >
              {!isMobile && 'Редактировать'}
            </Button>
          ) : (
            <Space size={isMobile ? 'small' : 'middle'}>
              <Button 
                onClick={handleCancel} 
                icon={<CloseOutlined />}
                size={isMobile ? 'middle' : 'large'}
              >
                {!isMobile && 'Отмена'}
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={saving}
                size={isMobile ? 'middle' : 'large'}
              >
                {!isMobile && 'Сохранить'}
              </Button>
            </Space>
          )}
        </div>
      </div>

      {/* Основное содержимое */}
      <div style={{ 
        padding: isMobile ? '8px' : '24px',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {isEmpty && !isEditing && (
          <Alert
            message="Заполните ваш профиль"
            description="Пожалуйста, заполните информацию о себе и загрузите необходимые документы"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Card bordered={false}>

        <Form form={form} layout="vertical" disabled={!isEditing}>
          <Title level={4}>Личная информация</Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="lastName" label="Фамилия" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="firstName" label="Имя" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="middleName" label="Отчество">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="position" label="Должность">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="citizenshipId" label="Гражданство">
                <Select
                  showSearch
                  optionFilterProp="children"
                  placeholder="Выберите гражданство"
                >
                  {citizenships.map(c => (
                    <Select.Option key={c.id} value={c.id}>
                      {c.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="birthDate" label="Дата рождения">
                <Input 
                  placeholder="ДД.ММ.ГГГГ"
                  maxLength={10}
                  onChange={(e) => {
                    const formatted = formatDateInput(e.target.value);
                    form.setFieldValue('birthDate', formatted);
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Title level={4} style={{ marginTop: 24 }}>Контактная информация</Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item
                name="email"
                label="Email"
                rules={[{ type: 'email', message: 'Некорректный email' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="phone" label="Телефон">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Title level={4} style={{ marginTop: 24 }}>Документы</Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="passportNumber" label="Номер паспорта">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="passportDate" label="Дата выдачи паспорта">
                <Input 
                  placeholder="ДД.ММ.ГГГГ"
                  maxLength={10}
                  onChange={(e) => {
                    const formatted = formatDateInput(e.target.value);
                    form.setFieldValue('passportDate', formatted);
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="passportIssuer" label="Кем выдан">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="registrationAddress" label="Адрес регистрации">
                <TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="inn" label="ИНН">
                <Input 
                  maxLength={14}
                  placeholder="XXXX-XXXXX-X или XXXX-XXXXXX-XX"
                  onChange={(e) => {
                    const formatted = formatInn(e.target.value);
                    form.setFieldValue('inn', formatted);
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="snils" label="СНИЛС">
                <Input 
                  maxLength={14}
                  placeholder="123-456-789 00"
                  onChange={(e) => {
                    const formatted = formatSnils(e.target.value);
                    form.setFieldValue('snils', formatted);
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="kig" label="КИГ">
                <Input 
                  maxLength={10}
                  placeholder="АА 1234567"
                  onChange={(e) => {
                    const formatted = formatKig(e.target.value);
                    form.setFieldValue('kig', formatted);
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="patentNumber" label="Номер патента">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="patentIssueDate" label="Дата выдачи патента">
                <Input 
                  placeholder="ДД.ММ.ГГГГ"
                  maxLength={10}
                  onChange={(e) => {
                    const formatted = formatDateInput(e.target.value);
                    form.setFieldValue('patentIssueDate', formatted);
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Form.Item name="blankNumber" label="Номер бланка">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Title level={4} style={{ marginTop: 24 }}>Заметки</Title>
          <Row>
            <Col xs={24}>
              <Form.Item name="notes" label="Дополнительная информация">
                <TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* Секция загрузки файлов */}
      <Card
        title={
          <Space>
            <FileOutlined />
            <span>Документы ({files.length}/10)</span>
          </Space>
        }
        style={{ marginTop: 24 }}
      >
        <Alert
          message="Лимиты загрузки"
          description={
            <>
              <div>• Максимум 10 файлов</div>
              <div>• Размер каждого файла не более 5МБ</div>
              <div>• Изображения больше 1МБ автоматически сжимаются</div>
            </>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Upload {...uploadProps}>
          <Button icon={isMobile ? <CameraOutlined /> : <UploadOutlined />}>
            {isMobile ? 'Сделать фото / Выбрать файл' : 'Выбрать файлы'}
          </Button>
        </Upload>

        {fileList.length > 0 && (
          <Button
            type="primary"
            onClick={handleUpload}
            loading={uploading}
            style={{ marginTop: 16 }}
            block
          >
            Загрузить {fileList.length} файл(ов)
          </Button>
        )}

        {files.length > 0 && (
          <List
            style={{ marginTop: 24 }}
            dataSource={files}
            renderItem={(file) => (
              <List.Item
                actions={
                  isMobile 
                    ? [
                        <Button
                          type="link"
                          icon={<EyeOutlined />}
                          onClick={() => handleViewFile(file)}
                          size="small"
                        />,
                        <Button
                          type="link"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteFile(file.id)}
                          size="small"
                        />
                      ]
                    : [
                        <Button
                          type="link"
                          icon={<EyeOutlined />}
                          onClick={() => handleViewFile(file)}
                        >
                          Просмотр
                        </Button>,
                        <Button
                          type="link"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteFile(file.id)}
                        >
                          Удалить
                        </Button>
                      ]
                }
              >
                <List.Item.Meta
                  avatar={
                    <Badge 
                      count={
                        <CheckCircleFilled 
                          style={{ 
                            color: '#52c41a', 
                            fontSize: isMobile ? 18 : 20,
                            backgroundColor: 'white',
                            borderRadius: '50%'
                          }} 
                        />
                      }
                      offset={[-5, isMobile ? 32 : 35]}
                    >
                      <FileOutlined 
                        style={{ 
                          fontSize: isMobile ? 28 : 32,
                          color: file.mimeType.startsWith('image/') ? '#1890ff' : '#8c8c8c'
                        }} 
                      />
                    </Badge>
                  }
                  title={
                    <div style={{ 
                      fontSize: isMobile ? 13 : 16,
                      wordBreak: 'break-word',
                      lineHeight: isMobile ? '1.3' : '1.5'
                    }}>
                      {file.fileName}
                    </div>
                  }
                  description={
                    <Space direction={isMobile ? 'vertical' : 'horizontal'} size={4}>
                      <Text type="secondary" style={{ fontSize: isMobile ? 11 : 14 }}>
                        {file.fileSize > 1024 * 1024 
                          ? `${(file.fileSize / 1024 / 1024).toFixed(2)} МБ`
                          : `${(file.fileSize / 1024).toFixed(2)} КБ`
                        }
                      </Text>
                      {file.mimeType.startsWith('image/') && (
                        <Badge 
                          status="success" 
                          text={
                            <Text type="secondary" style={{ fontSize: isMobile ? 10 : 13 }}>
                              Изображение
                            </Text>
                          } 
                        />
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* Кнопка выхода */}
      <Card bordered={false} style={{ marginTop: 16, textAlign: 'center' }}>
        <Button 
          danger
          icon={<LogoutOutlined />}
          onClick={() => {
            useAuthStore.getState().logout();
            window.location.href = '/login';
          }}
          size="large"
          block={isMobile}
        >
          Выйти из аккаунта
        </Button>
      </Card>

      {/* Модальное окно предпросмотра файлов */}
      <Modal
        open={previewVisible}
        title={previewFile?.name}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width="80%"
        style={{ top: 20 }}
      >
        {previewFile && (
          <iframe
            src={previewFile.url}
            style={{ width: '100%', height: '70vh', border: 'none' }}
            title="File Preview"
          />
        )}
      </Modal>
      </div>
    </div>
  );
};

export default UserProfilePage;

