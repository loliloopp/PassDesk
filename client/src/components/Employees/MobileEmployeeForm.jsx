import { Form, Input, Select, DatePicker, Button, Space, Divider, Typography, Checkbox, Spin, Collapse } from 'antd';
import { SaveOutlined, CaretRightOutlined, FileOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useEmployeeForm } from './useEmployeeForm';
import EmployeeFileUpload from './EmployeeFileUpload';
import EmployeeDocumentUpload from './EmployeeDocumentUpload';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;
const DATE_FORMAT = 'DD.MM.YYYY';

/**
 * Мобильная форма сотрудника
 * Все поля в один столбец, блоки вместо вкладок
 */
const MobileEmployeeForm = ({ employee, onSuccess, onCancel }) => {
  const {
    form,
    loading,
    loadingReferences,
    citizenships,
    constructionSites,
    positions,
    selectedCitizenship,
    requiresPatent,
    defaultCounterpartyId,
    user,
    handleCitizenshipChange,
    handleSave,
    handleSaveDraft,
    initializeEmployeeData,
    formatPhoneNumber,
    formatSnils,
    formatKig,
    formatInn,
    formatPatentNumber,
    formatBlankNumber,
  } = useEmployeeForm(employee, true, onSuccess);

  // Состояние для открытых панелей (по умолчанию все открыты)
  const [activeKeys, setActiveKeys] = useState(['personal', 'documents', 'patent', 'photos', 'files', 'statuses']);

  // Инициализируем данные формы после загрузки справочников
  useEffect(() => {
    if (citizenships.length && positions.length) {
      if (employee) {
        const formData = initializeEmployeeData();
        if (formData) {
          form.setFieldsValue(formData);
          
          // Проверяем гражданство
          if (employee.citizenshipId) {
            handleCitizenshipChange(employee.citizenshipId);
          }
        }
      } else {
        form.resetFields();
      }
    }
  }, [employee, citizenships.length, positions.length]);

  // Проверяем права доступа
  const canEditConstructionSite = user?.counterpartyId === defaultCounterpartyId && user?.role !== 'user';

  return (
    <div style={{ paddingBottom: 80 }}>
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
        requiredMark={(label, { required }) => (
          <>
            {label}
            {required && <span style={{ color: '#ff4d4f', marginLeft: 4 }}>*</span>}
          </>
        )}
      >
        <Collapse
          activeKey={activeKeys}
          onChange={setActiveKeys}
          expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
          expandIconPosition="start"
          ghost
        >
          {/* Блок 1: Личная информация */}
          <Panel header={<Title level={5} style={{ margin: 0 }}>📋 Личная информация</Title>} key="personal">
            <Form.Item
              label="Фамилия"
              name="lastName"
              rules={[{ required: true, message: 'Введите фамилию' }]}
            >
              <Input placeholder="Иванов" size="large" />
            </Form.Item>

            <Form.Item
              label="Имя"
              name="firstName"
              rules={[{ required: true, message: 'Введите имя' }]}
            >
              <Input placeholder="Иван" size="large" />
            </Form.Item>

            <Form.Item label="Отчество" name="middleName">
              <Input placeholder="Иванович" size="large" />
            </Form.Item>

            <Form.Item
              label="Должность"
              name="positionId"
              rules={[{ required: true, message: 'Выберите должность' }]}
            >
              <Select 
                placeholder="Выберите должность" 
                size="large" 
                showSearch
                loading={loadingReferences}
                disabled={loadingReferences || positions.length === 0}
              >
                {positions.map((pos) => (
                  <Option key={pos.id} value={pos.id}>
                    {pos.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Гражданство"
              name="citizenshipId"
              rules={[{ required: true, message: 'Выберите гражданство' }]}
            >
              <Select
                placeholder="Выберите гражданство"
                size="large"
                showSearch
                onChange={handleCitizenshipChange}
                loading={loadingReferences}
                disabled={loadingReferences || citizenships.length === 0}
              >
                {citizenships.map((c) => (
                  <Option key={c.id} value={c.id}>
                    {c.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Дата рождения"
              name="birthDate"
              rules={[{ required: true, message: 'Укажите дату рождения' }]}
            >
              <DatePicker
                placeholder="Выберите дату"
                format={DATE_FORMAT}
                size="large"
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              label="Адрес регистрации"
              name="registrationAddress"
              rules={[{ required: true, message: 'Введите адрес регистрации' }]}
            >
              <TextArea placeholder="г. Москва, ул. Ленина, д. 1" rows={3} size="large" />
            </Form.Item>

            <Form.Item
              label="Телефон"
              name="phone"
              rules={[
                { required: true, message: 'Введите телефон' },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const digits = value.replace(/[^\d]/g, '');
                    if (digits.length === 11) return Promise.resolve();
                    return Promise.reject(new Error('Телефон должен содержать 11 цифр'));
                  },
                },
              ]}
              getValueFromEvent={(e) => formatPhoneNumber(e.target.value)}
            >
              <Input placeholder="+7 (___) ___-__-__" size="large" />
            </Form.Item>

            {canEditConstructionSite && (
              <Form.Item label="Объект" name="constructionSiteId">
                <Select 
                  placeholder="Выберите объект" 
                  size="large" 
                  showSearch 
                  allowClear
                  loading={loadingReferences}
                  disabled={loadingReferences || constructionSites.length === 0}
                >
                  {constructionSites.map((site) => (
                    <Option key={site.id} value={site.id}>
                      {site.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            )}

            <Form.Item label="Примечание" name="note">
              <TextArea rows={2} placeholder="Дополнительная информация" size="large" />
            </Form.Item>
          </Panel>

          {/* Блок 2: Документы */}
          <Panel header={<Title level={5} style={{ margin: 0 }}>📄 Документы</Title>} key="documents">
            <Form.Item
              label="ИНН"
              name="inn"
              rules={[
                { required: true, message: 'Введите ИНН' },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const digits = value.replace(/[^\d]/g, '');
                    if (digits.length === 10 || digits.length === 12) return Promise.resolve();
                    return Promise.reject(new Error('ИНН должен содержать 10 или 12 цифр'));
                  },
                },
              ]}
              getValueFromEvent={(e) => formatInn(e.target.value)}
            >
              <Input placeholder="1234-567890-12" size="large" />
            </Form.Item>

            <Form.Item
              label="СНИЛС"
              name="snils"
              rules={[
                { required: true, message: 'Введите СНИЛС' },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve();
                    const digits = value.replace(/[^\d]/g, '');
                    if (digits.length === 11) return Promise.resolve();
                    return Promise.reject(new Error('СНИЛС должен содержать 11 цифр'));
                  },
                },
              ]}
              getValueFromEvent={(e) => formatSnils(e.target.value)}
            >
              <Input placeholder="123-456-789 00" size="large" />
            </Form.Item>

            {requiresPatent && (
              <Form.Item
                label="КИГ (Карта иностранного гражданина)"
                name="kig"
                rules={[
                  { required: true, message: 'Введите КИГ' },
                  {
                    pattern: /^[A-Z]{2}\s?\d{7}$/i,
                    message: 'КИГ должен быть в формате: AA 1234567',
                  },
                ]}
                getValueFromEvent={(e) => formatKig(e.target.value)}
              >
                <Input placeholder="AA 1234567" size="large" maxLength={10} />
              </Form.Item>
            )}

            <Form.Item
              label="Паспорт (серия и номер)"
              name="passportNumber"
              rules={[{ required: true, message: 'Введите серию и номер паспорта' }]}
            >
              <Input placeholder="1234 567890" size="large" />
            </Form.Item>

            <Form.Item
              label="Дата выдачи паспорта"
              name="passportDate"
              rules={[{ required: true, message: 'Укажите дату выдачи' }]}
            >
              <DatePicker
                placeholder="Выберите дату"
                format={DATE_FORMAT}
                size="large"
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              label="Кем выдан паспорт"
              name="passportIssuer"
              rules={[{ required: true, message: 'Укажите орган выдачи' }]}
            >
              <TextArea placeholder="Наименование органа выдачи" rows={3} size="large" />
            </Form.Item>
          </Panel>

          {/* Блок 3: Патент (если требуется) */}
          {requiresPatent && (
            <Panel header={<Title level={5} style={{ margin: 0 }}>📑 Патент</Title>} key="patent">
              <Form.Item
                label="Номер патента"
                name="patentNumber"
                rules={[
                  { required: true, message: 'Введите номер патента' },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      const digits = value.replace(/[^\d]/g, '');
                      if (digits.length === 12) return Promise.resolve();
                      return Promise.reject(new Error('Номер патента должен содержать 12 цифр'));
                    },
                  },
                ]}
                getValueFromEvent={(e) => formatPatentNumber(e.target.value)}
              >
                <Input placeholder="01 №1234567890" size="large" />
              </Form.Item>

              <Form.Item
                label="Дата выдачи патента"
                name="patentIssueDate"
                rules={[{ required: true, message: 'Укажите дату выдачи патента' }]}
              >
                <DatePicker
                  placeholder="Выберите дату"
                  format={DATE_FORMAT}
                  size="large"
                  style={{ width: '100%' }}
                />
              </Form.Item>

              <Form.Item
                label="Номер бланка"
                name="blankNumber"
                rules={[
                  { required: true, message: 'Введите номер бланка' },
                  {
                    pattern: /^[А-ЯЁ]{2}\d{7}$/,
                    message: 'Номер бланка должен быть в формате: ПР1234567',
                  },
                ]}
                getValueFromEvent={(e) => formatBlankNumber(e.target.value)}
              >
                <Input placeholder="ПР1234567" size="large" maxLength={9} />
              </Form.Item>
            </Panel>
          )}

          {/* Блок 4: Фото документов */}
          <Panel header={<Title level={5} style={{ margin: 0 }}>📸 Фото документов</Title>} key="photos">
            {!employee?.id ? (
              <div style={{ 
                padding: 16, 
                background: '#f5f5f5', 
                borderRadius: 4,
                textAlign: 'center',
                color: '#8c8c8c'
              }}>
                📝 Загрузка документов будет доступна после первого сохранения сотрудника
              </div>
            ) : (
              <>
                {/* Паспорт */}
                <EmployeeDocumentUpload
                  employeeId={employee.id}
                  documentType="passport"
                  label="Паспорт"
                  readonly={false}
                  multiple={true}
                />

                {/* Согласие на обработку персональных данных */}
                <EmployeeDocumentUpload
                  employeeId={employee.id}
                  documentType="consent"
                  label="Согласие на обработку персональных данных"
                  readonly={false}
                  multiple={true}
                />

                {/* Реквизиты счета */}
                <EmployeeDocumentUpload
                  employeeId={employee.id}
                  documentType="bank_details"
                  label="Реквизиты счета"
                  readonly={false}
                  multiple={true}
                />

                {/* КИГ (если требуется патент) */}
                {requiresPatent && (
                  <>
                    <EmployeeDocumentUpload
                      employeeId={employee.id}
                      documentType="kig"
                      label="КИГ (Карта иностранного гражданина)"
                      readonly={false}
                      multiple={true}
                    />

                    {/* Патент лицевая сторона */}
                    <EmployeeDocumentUpload
                      employeeId={employee.id}
                      documentType="patent_front"
                      label="Патент лицевая сторона (с фото)"
                      readonly={false}
                      multiple={false}
                    />

                    {/* Патент задняя сторона */}
                    <EmployeeDocumentUpload
                      employeeId={employee.id}
                      documentType="patent_back"
                      label="Патент задняя сторона"
                      readonly={false}
                      multiple={false}
                    />
                  </>
                )}
              </>
            )}
          </Panel>

          {/* Блок 5: Файлы (если редактирование) */}
          {employee?.id && (
            <Panel header={<Title level={5} style={{ margin: 0 }}>📎 Файлы</Title>} key="files">
              <EmployeeFileUpload employeeId={employee.id} readonly={false} />
            </Panel>
          )}

          {/* Блок 6: Статусы (если редактирование) */}
          {employee?.id && canEditConstructionSite && (
            <Panel header={<Title level={5} style={{ margin: 0 }}>⚙️ Статусы</Title>} key="statuses">
              <Form.Item name="isFired" valuePropName="checked">
                <Checkbox>Уволен</Checkbox>
              </Form.Item>

              <Form.Item name="isInactive" valuePropName="checked">
                <Checkbox>Неактивен (временно)</Checkbox>
              </Form.Item>
            </Panel>
          )}
        </Collapse>
      </Form>

      {/* Нижняя панель с кнопками (фиксированная) */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 16px',
          background: '#fff',
          borderTop: '1px solid #f0f0f0',
          zIndex: 1000,
        }}
      >
        {/* Кнопка "Сохранить черновик" в отдельном ряду */}
        <Button
          size="large"
          block
          icon={<FileOutlined />}
          onClick={handleSaveDraft}
          loading={loading}
          style={{ marginBottom: 8 }}
        >
          Сохранить черновик
        </Button>
        
        {/* Кнопки "Сохранить" и "Отмена" в одном ряду */}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            type="primary"
            size="large"
            style={{ flex: 1 }}
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={loading}
          >
            Сохранить
          </Button>
          <Button 
            size="large" 
            style={{ 
              flex: 1,
              borderColor: '#ff4d4f',
              color: '#ff4d4f'
            }} 
            onClick={onCancel} 
            disabled={loading}
          >
            Отмена
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileEmployeeForm;

