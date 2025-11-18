import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, Row, Col, message, Tabs, Button, Space } from 'antd';
import { CheckCircleFilled, CheckCircleOutlined } from '@ant-design/icons';
import { citizenshipService } from '../../services/citizenshipService';
import EmployeeFileUpload from './EmployeeFileUpload';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;
const DATE_FORMAT = 'DD.MM.YYYY';

const EmployeeFormModal = ({ visible, employee, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [citizenships, setCitizenships] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('1');
  const [tabsValidation, setTabsValidation] = useState({
    '1': false, // Основная информация
    '2': false, // Документы
    '3': false, // Патент
  });
  const [selectedCitizenship, setSelectedCitizenship] = useState(null);

  // Определяем, требуется ли патент для выбранного гражданства
  const requiresPatent = selectedCitizenship?.requiresPatent !== false;

  // Определяем обязательные поля для каждой вкладки (динамически)
  const getRequiredFieldsByTab = () => {
    const baseFields = {
      '1': ['lastName', 'firstName', 'position', 'citizenshipId', 'birthDate', 'registrationAddress', 'phone'],
      '2': requiresPatent 
        ? ['inn', 'snils', 'kig', 'passportNumber', 'passportDate', 'passportIssuer']
        : ['inn', 'snils', 'passportNumber', 'passportDate', 'passportIssuer'], // без КИГ
      '3': ['patentNumber', 'patentIssueDate', 'blankNumber'],
    };
    
    // Если патент не требуется, убираем вкладку "Патент" из валидации
    if (!requiresPatent) {
      delete baseFields['3'];
    }
    
    return baseFields;
  };
  
  const requiredFieldsByTab = getRequiredFieldsByTab();

  useEffect(() => {
    if (visible) {
      fetchCitizenships();
      if (employee) {
        form.setFieldsValue({
          ...employee,
          birthDate: employee.birthDate ? dayjs(employee.birthDate) : null,
          passportDate: employee.passportDate ? dayjs(employee.passportDate) : null,
          patentIssueDate: employee.patentIssueDate ? dayjs(employee.patentIssueDate) : null,
        });
        // Устанавливаем выбранное гражданство
        if (employee.citizenshipId) {
          updateSelectedCitizenship(employee.citizenshipId);
        }
        // Проверяем валидность вкладок при загрузке существующего сотрудника
        setTimeout(() => validateAllTabs(), 100);
      } else {
        form.resetFields();
        setActiveTab('1');
        setTabsValidation({ '1': false, '2': false, '3': false });
        setSelectedCitizenship(null);
      }
    }
  }, [visible, employee]);

  // Обновляем selectedCitizenship при изменении списка citizenships
  useEffect(() => {
    if (employee?.citizenshipId && citizenships.length > 0) {
      updateSelectedCitizenship(employee.citizenshipId);
    }
  }, [citizenships, employee]);

  // Обновляем валидацию при изменении requiresPatent
  useEffect(() => {
    if (visible) {
      validateAllTabs();
    }
  }, [requiresPatent]);

  const updateSelectedCitizenship = (citizenshipId) => {
    const citizenship = citizenships.find(c => c.id === citizenshipId);
    setSelectedCitizenship(citizenship || null);
  };

  const handleCitizenshipChange = (citizenshipId) => {
    updateSelectedCitizenship(citizenshipId);
    // Сбрасываем валидацию
    validateAllTabs();
  };

  const fetchCitizenships = async () => {
    try {
      const { data } = await citizenshipService.getAll();
      setCitizenships(data.data.citizenships || []);
    } catch (error) {
      console.error('Error loading citizenships:', error);
    }
  };

  // Проверяем, заполнены ли все обязательные поля на вкладке
  const validateTab = async (tabKey) => {
    const requiredFields = requiredFieldsByTab[tabKey];
    if (!requiredFields) return false;

    try {
      const values = form.getFieldsValue();
      const allFilled = requiredFields.every(field => {
        const value = values[field];
        return value !== undefined && value !== null && value !== '';
      });
      return allFilled;
    } catch {
      return false;
    }
  };

  // Проверяем все вкладки
  const validateAllTabs = async () => {
    const validation = {};
    for (const tabKey of Object.keys(requiredFieldsByTab)) {
      validation[tabKey] = await validateTab(tabKey);
    }
    setTabsValidation(validation);
    return validation;
  };

  // Проверяем, все ли вкладки валидны
  const allTabsValid = () => {
    return Object.values(tabsValidation).every(valid => valid === true);
  };

  // Обработчик изменения полей формы
  const handleFieldsChange = () => {
    validateAllTabs();
  };

  // Переход на следующую вкладку
  const handleNext = () => {
    const tabOrder = ['1', '2', '3'];
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1]);
    }
  };

  // Сохранение как черновик
  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      const values = form.getFieldsValue();
      
      const formattedValues = {};
      Object.keys(values).forEach(key => {
        const value = values[key];
        if (value === '' || value === undefined) {
          formattedValues[key] = null;
        } else if (key === 'birthDate' || key === 'passportDate' || key === 'patentIssueDate') {
          formattedValues[key] = value ? value.format('YYYY-MM-DD') : null;
        } else {
          formattedValues[key] = value;
        }
      });

      formattedValues.statusCard = 'draft';
      await onSuccess(formattedValues);
    } catch (error) {
      console.error('Save draft error:', error);
      // Ошибка уже показана в родительском компоненте через message.error
      // Не закрываем модальное окно
    } finally {
      setLoading(false);
    }
  };

  // Полное сохранение
  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      const formattedValues = {};
      Object.keys(values).forEach(key => {
        const value = values[key];
        if (value === '' || value === undefined) {
          formattedValues[key] = null;
        } else if (key === 'birthDate' || key === 'passportDate' || key === 'patentIssueDate') {
          formattedValues[key] = value ? value.format('YYYY-MM-DD') : null;
        } else {
          formattedValues[key] = value;
        }
      });

      formattedValues.statusCard = 'completed';
      await onSuccess(formattedValues);
      // Закрываем модальное окно ТОЛЬКО после успешного сохранения
      onCancel();
    } catch (error) {
      console.error('Validation or save error:', error);
      // Если это ошибка валидации формы, показываем сообщение
      if (error.errorFields) {
        message.error('Пожалуйста, заполните все обязательные поля');
      }
      // Если это ошибка сохранения (дубликат ИНН и т.д.), сообщение уже показано в родителе
      // Не закрываем модальное окно
    } finally {
      setLoading(false);
    }
  };

  // Определяем стиль вкладки (обычный черный текст)
  const getTabStyle = () => {
    return {};
  };

  // Рендерим иконку статуса вкладки
  const getTabIcon = (tabKey) => {
    if (tabsValidation[tabKey]) {
      return <CheckCircleFilled style={{ color: '#52c41a', fontSize: 16, marginRight: 8 }} />;
    }
    return <CheckCircleOutlined style={{ color: '#d9d9d9', fontSize: 16, marginRight: 8 }} />;
  };

  return (
    <Modal
      title={employee ? 'Редактировать сотрудника' : 'Добавить сотрудника'}
      open={visible}
      onCancel={onCancel}
      width={1200}
      footer={
        <Space>
          <Button onClick={onCancel}>
            {employee ? 'Закрыть' : 'Отмена'}
          </Button>
          <Button onClick={handleSaveDraft} loading={loading}>
            Сохранить черновик
          </Button>
          {allTabsValid() ? (
            <Button type="primary" onClick={handleSave} loading={loading}>
              Сохранить
            </Button>
          ) : (
            <Button type="primary" onClick={handleNext}>
              Следующая
            </Button>
          )}
        </Space>
      }
    >
      <Form 
        form={form} 
        layout="vertical"
        onFieldsChange={handleFieldsChange}
      >
        <Tabs 
          activeKey={activeTab}
          onChange={setActiveTab}
          style={{ marginTop: 16 }}
        >
          {/* Вкладка: Основная информация */}
          <Tabs.TabPane 
            tab={
              <span style={getTabStyle()}>
                {getTabIcon('1')}
                Основная информация
              </span>
            } 
            key="1"
          >
            {/* ФИО и должность - 4 столбца */}
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item
                  name="lastName"
                  label="Фамилия"
                  rules={[{ required: true, message: 'Введите фамилию' }]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="firstName"
                  label="Имя"
                  rules={[{ required: true, message: 'Введите имя' }]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="middleName" label="Отчество">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="position"
                  label="Должность"
                  rules={[{ required: true, message: 'Введите должность' }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            {/* Гражданство и дата рождения */}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  name="citizenshipId" 
                  label="Гражданство"
                  rules={[{ required: true, message: 'Выберите гражданство' }]}
                >
                  <Select
                    placeholder="Выберите гражданство"
                    allowClear
                    showSearch
                    optionFilterProp="children"
                    onChange={handleCitizenshipChange}
                  >
                    {citizenships.map((c) => (
                      <Option key={c.id} value={c.id}>
                        {c.name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="birthDate" 
                  label="Дата рождения"
                  rules={[{ required: true, message: 'Введите дату рождения' }]}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    format={DATE_FORMAT}
                    placeholder="ДД.ММ.ГГГГ"
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Адрес регистрации */}
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item 
                  name="registrationAddress" 
                  label="Адрес регистрации"
                  rules={[{ required: true, message: 'Введите адрес регистрации' }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            {/* Контакты */}
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="email"
                  label="Email"
                  rules={[
                    { 
                      type: 'email', 
                      message: 'Введите корректный email (например: ivanov@example.com)' 
                    }
                  ]}
                >
                  <Input placeholder="ivanov@example.com" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="phone" 
                  label="Телефон"
                  rules={[{ required: true, message: 'Введите телефон' }]}
                >
                  <Input placeholder="+7 (999) 123-45-67" />
                </Form.Item>
              </Col>
            </Row>

            {/* Примечания */}
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="notes" label="Примечания">
                  <TextArea rows={2} />
                </Form.Item>
              </Col>
            </Row>
          </Tabs.TabPane>

          {/* Вкладка: Документы */}
          <Tabs.TabPane 
            tab={
              <span style={getTabStyle()}>
                {getTabIcon('2')}
                Документы
              </span>
            } 
            key="2"
          >
            <Row gutter={16}>
              <Col span={requiresPatent ? 8 : 12}>
                <Form.Item 
                  name="inn" 
                  label="ИНН"
                  rules={[
                    { required: true, message: 'Введите ИНН' },
                    {
                      pattern: /^\d{10}$|^\d{12}$/,
                      message: 'ИНН должен содержать 10 или 12 цифр'
                    }
                  ]}
                >
                  <Input maxLength={12} placeholder="10 или 12 цифр" />
                </Form.Item>
              </Col>
              <Col span={requiresPatent ? 8 : 12}>
                <Form.Item 
                  name="snils" 
                  label="СНИЛС"
                  rules={[
                    { required: true, message: 'Введите СНИЛС' },
                    {
                      pattern: /^\d{3}-\d{3}-\d{3}\s\d{2}$/,
                      message: 'СНИЛС должен быть в формате XXX-XXX-XXX XX'
                    }
                  ]}
                >
                  <Input maxLength={14} placeholder="123-456-789 00" />
                </Form.Item>
              </Col>
              {requiresPatent && (
                <Col span={8}>
                  <Form.Item 
                    name="kig" 
                    label="КИГ"
                    rules={[{ required: true, message: 'Введите КИГ' }]}
                  >
                    <Input placeholder="КИГ" />
                  </Form.Item>
                </Col>
              )}
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item 
                  name="passportNumber" 
                  label="№ паспорта"
                  rules={[{ required: true, message: 'Введите номер паспорта' }]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item 
                  name="passportDate" 
                  label="Дата выдачи паспорта"
                  rules={[{ required: true, message: 'Введите дату выдачи паспорта' }]}
                >
                  <DatePicker
                    style={{ width: '100%' }}
                    format={DATE_FORMAT}
                    placeholder="ДД.ММ.ГГГГ"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item 
                  name="passportIssuer" 
                  label="Кем выдан паспорт"
                  rules={[{ required: true, message: 'Введите кем выдан паспорт' }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>
          </Tabs.TabPane>

          {/* Вкладка: Патент (только если требуется) */}
          {requiresPatent && (
            <Tabs.TabPane 
              tab={
                <span style={getTabStyle()}>
                  {getTabIcon('3')}
                  Патент
                </span>
              } 
              key="3"
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item 
                    name="patentNumber" 
                    label="Номер патента"
                    rules={[{ required: true, message: 'Введите номер патента' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item 
                    name="patentIssueDate" 
                    label="Дата выдачи патента"
                    rules={[{ required: true, message: 'Введите дату выдачи патента' }]}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      format={DATE_FORMAT}
                      placeholder="ДД.ММ.ГГГГ"
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item 
                    name="blankNumber" 
                    label="Номер бланка"
                    rules={[{ required: true, message: 'Введите номер бланка' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </Tabs.TabPane>
          )}

          {/* Вкладка: Файлы (только для существующих сотрудников) */}
          {employee?.id && (
            <Tabs.TabPane tab="Файлы" key="4">
              <EmployeeFileUpload employeeId={employee.id} readonly={false} />
            </Tabs.TabPane>
          )}
        </Tabs>
      </Form>
    </Modal>
  );
};

export default EmployeeFormModal;
