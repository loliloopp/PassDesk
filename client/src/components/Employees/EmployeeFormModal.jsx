import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, Row, Col, message, Switch } from 'antd';
import { counterpartyService } from '../../services/counterpartyService';
import { citizenshipService } from '../../services/citizenshipService';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;
const DATE_FORMAT = 'DD.MM.YYYY';

const EmployeeFormModal = ({ visible, employee, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [counterparties, setCounterparties] = useState([]);
  const [citizenships, setCitizenships] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchCounterparties();
      fetchCitizenships();
      if (employee) {
        form.setFieldsValue({
          ...employee,
          birthDate: employee.birthDate ? dayjs(employee.birthDate) : null,
          passportDate: employee.passportDate ? dayjs(employee.passportDate) : null,
          patentIssueDate: employee.patentIssueDate ? dayjs(employee.patentIssueDate) : null,
          isActive: employee.isActive !== undefined ? employee.isActive : true,
        });
      } else {
        form.resetFields();
        // Устанавливаем статус "Активен" по умолчанию для новых сотрудников
        form.setFieldsValue({ isActive: true });
      }
    }
  }, [visible, employee]);

  const fetchCounterparties = async () => {
    try {
      const { data } = await counterpartyService.getAll({ limit: 100 });
      setCounterparties(data.data.counterparties);
    } catch (error) {
      console.error('Error loading counterparties:', error);
    }
  };

  const fetchCitizenships = async () => {
    try {
      const { data } = await citizenshipService.getAll();
      setCitizenships(data.data.citizenships || []); // Fixed: access nested citizenships array
    } catch (error) {
      console.error('Error loading citizenships:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      console.log('=== FORM VALUES BEFORE FORMATTING ===');
      console.log(JSON.stringify(values, null, 2));
      
      // Преобразуем пустые строки в null
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
      
      console.log('=== FORMATTED VALUES ===');
      console.log(JSON.stringify(formattedValues, null, 2));

      onSuccess(formattedValues);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCitizenship = async (name) => {
    try {
      const { data } = await citizenshipService.create({ name });
      setCitizenships([...citizenships, data.data]);
      form.setFieldsValue({ citizenshipId: data.data.id });
      message.success('Гражданство добавлено');
    } catch (error) {
      message.error('Ошибка добавления гражданства');
    }
  };

  return (
    <Modal
      title={employee ? 'Редактировать сотрудника' : 'Добавить сотрудника'}
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      width={1200}
      okText={employee ? 'Сохранить' : 'Добавить'}
      cancelText="Отмена"
      confirmLoading={loading}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
        {/* Основная информация - 4 столбца */}
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

        {/* Контрагент и гражданство - 2 столбца */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="counterpartyId" label="Контрагент">
              <Select
                placeholder="Выберите контрагента"
                allowClear
                showSearch
                optionFilterProp="children"
              >
                {counterparties.map((c) => (
                  <Option key={c.id} value={c.id}>
                    {c.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="citizenshipId" label="Гражданство">
              <Select
                placeholder="Выберите или добавьте"
                allowClear
                showSearch
                optionFilterProp="children"
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <div style={{ padding: '8px', borderTop: '1px solid #f0f0f0' }}>
                      <Input.Search
                        placeholder="Добавить новое"
                        enterButton="Добавить"
                        onSearch={handleAddCitizenship}
                      />
                    </div>
                  </>
                )}
              >
                {citizenships.map((c) => (
                  <Option key={c.id} value={c.id}>
                    {c.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Личные данные - 4 столбца */}
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item name="birthDate" label="Дата рождения">
              <DatePicker
                style={{ width: '100%' }}
                format={DATE_FORMAT}
                placeholder="ДД.ММ.ГГГГ"
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item 
              name="inn" 
              label="ИНН"
              rules={[
                {
                  pattern: /^\d{10}$|^\d{12}$/,
                  message: 'ИНН должен содержать 10 или 12 цифр'
                }
              ]}
            >
              <Input maxLength={12} placeholder="10 или 12 цифр" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item 
              name="snils" 
              label="СНИЛС"
              rules={[
                {
                  pattern: /^\d{3}-\d{3}-\d{3}\s\d{2}$/,
                  message: 'СНИЛС должен быть в формате XXX-XXX-XXX XX (например: 123-456-789 00)'
                }
              ]}
            >
              <Input maxLength={14} placeholder="123-456-789 00" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="kig" label="КИГ">
              <Input placeholder="КИГ" />
            </Form.Item>
          </Col>
        </Row>

        {/* Паспортные данные - 4 столбца */}
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item name="passportNumber" label="№ паспорта">
              <Input />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="passportDate" label="Дата паспорта">
              <DatePicker
                style={{ width: '100%' }}
                format={DATE_FORMAT}
                placeholder="ДД.ММ.ГГГГ"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="passportIssuer" label="Кем выдан паспорт">
              <Input />
            </Form.Item>
          </Col>
        </Row>

        {/* Адрес регистрации - 1 столбец */}
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item name="registrationAddress" label="Адрес регистрации">
              <Input />
            </Form.Item>
          </Col>
        </Row>

        {/* Патент и бланк - 3 столбца */}
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="patentNumber" label="Номер патента">
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="patentIssueDate" label="Дата выдачи патента">
              <DatePicker
                style={{ width: '100%' }}
                format={DATE_FORMAT}
                placeholder="ДД.ММ.ГГГГ"
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="blankNumber" label="Номер бланка">
              <Input />
            </Form.Item>
          </Col>
        </Row>

        {/* Контакты и статус - 3 столбца */}
        <Row gutter={16}>
          <Col span={8}>
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
          <Col span={8}>
            <Form.Item name="phone" label="Телефон">
              <Input placeholder="+7 (999) 123-45-67" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item 
              name="isActive" 
              label="Статус" 
              valuePropName="checked"
            >
              <Switch 
                checkedChildren="Активен" 
                unCheckedChildren="Неактивен"
                style={{ width: 100 }}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Примечания - 1 столбец */}
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item name="notes" label="Примечания">
              <TextArea rows={2} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default EmployeeFormModal;

