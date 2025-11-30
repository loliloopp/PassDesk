import { Form, Input, Select, Button, Space, Typography, Checkbox, Spin, Collapse, App, Popconfirm } from 'antd';
import { SaveOutlined, CaretRightOutlined, FileOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useEmployeeForm } from './useEmployeeForm';
import { employeeStatusService } from '../../services/employeeStatusService';
import { invalidateCache } from '../../utils/requestCache';
import EmployeeDocumentUpload from './EmployeeDocumentUpload';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const DATE_FORMAT = 'DD.MM.YYYY';

/**
 * Мобильная форма сотрудника
 * Все поля в один столбец, блоки вместо вкладок
 */
const MobileEmployeeForm = ({ employee, onSuccess, onCancel }) => {
  const { modal, message: messageApi } = App.useApp();
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

  // Состояние для открытых панелей (по умолчанию все открыны)
  const [activeKeys, setActiveKeys] = useState(['personal', 'documents', 'patent', 'photos', 'statuses']);
  const [employeeIdOnLoad, setEmployeeIdOnLoad] = useState(null); // Отслеживаем id сотрудника при загрузке

  // Инициализируем данные формы при изменении сотрудника или справочников
  useEffect(() => {
    if (citizenships.length && positions.length) {
      // Если это новый сотрудник (id изменился)
      if (employee?.id !== employeeIdOnLoad) {
        const formData = initializeEmployeeData(true);
        if (formData) {
          form.setFieldsValue(formData);
          
          // Проверяем гражданство
          if (employee?.citizenshipId) {
            handleCitizenshipChange(employee.citizenshipId);
          }
        } else {
          // Новый сотрудник - очищаем форму
          form.resetFields();
        }
        setEmployeeIdOnLoad(employee?.id);
      }
    }
  }, [employee?.id, citizenships.length, positions.length]);

  // Проверяем права доступа
  const canEditConstructionSite = user?.counterpartyId === defaultCounterpartyId && user?.role !== 'user';

  // Функция для обработки отмены с подтверждением
  const handleCancelWithConfirm = () => {
    modal.confirm({
      title: 'Вы уверены?',
      icon: <ExclamationCircleOutlined />,
      content: 'Все несохраненные данные будут потеряны. Вы хотите выйти?',
      okText: 'Да, выйти',
      okType: 'danger',
      cancelText: 'Остаться',
      onOk() {
        onCancel();
      },
    });
  };

  // Формируем items для Collapse
  const collapseItems = [];

  // Блок 0: Статусы (если редактирование) - ДО Личной информации
  if (employee?.id) {
    const isFired = employee.statusMappings?.find(m => m.statusGroup === 'status_active')?.status?.name === 'status_active_fired';
    const isInactive = employee.statusMappings?.find(m => m.statusGroup === 'status_active')?.status?.name === 'status_active_inactive';

    const handleFire = async () => {
      try {
        await employeeStatusService.fireEmployee(employee.id);
        // Очищаем кэш для этого сотрудника
        invalidateCache(`employees:getById:${employee.id}`);
        messageApi.success(`Сотрудник ${employee.lastName} ${employee.firstName} уволен`);
        setTimeout(() => {
          onCancel && onCancel();
        }, 500);
      } catch (error) {
        console.error('Error firing employee:', error);
        messageApi.error('Ошибка при увольнении сотрудника');
      }
    };

    const handleReinstate = async () => {
      try {
        await employeeStatusService.reinstateEmployee(employee.id);
        // Очищаем кэш для этого сотрудника
        invalidateCache(`employees:getById:${employee.id}`);
        messageApi.success(`Сотрудник ${employee.lastName} ${employee.firstName} восстановлен`);
        setTimeout(() => {
          onCancel && onCancel();
        }, 500);
      } catch (error) {
        console.error('Error reinstating employee:', error);
        messageApi.error('Ошибка при восстановлении сотрудника');
      }
    };

    collapseItems.push({
      key: 'statuses',
      label: <Title level={5} style={{ margin: 0 }}>⚙️ Статусы</Title>,
      children: (
        <Space direction="vertical" style={{ width: '100%' }}>
          {isFired ? (
            <Popconfirm
              title="Восстановить сотрудника?"
              description={`Вы уверены, что ${employee.lastName} ${employee.firstName} восстанавливается?`}
              onConfirm={handleReinstate}
              okText="Да"
              cancelText="Нет"
            >
              <Button type="primary" danger block>
                Принять уволенного
              </Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="Уволить сотрудника?"
              description={`Вы уверены, что ${employee.lastName} ${employee.firstName} увольняется?`}
              onConfirm={handleFire}
              okText="Да"
              cancelText="Нет"
            >
              <Button danger block>
                Уволить
              </Button>
            </Popconfirm>
          )}
          
          {isInactive ? (
            <Button type="default" block>
              Активен
            </Button>
          ) : (
            <Button type="default" block>
              Неактивен
            </Button>
          )}
        </Space>
      ),
    });
  }

  // Блок 1: Личная информация
  collapseItems.push({
    key: 'personal',
    label: <Title level={5} style={{ margin: 0 }}>📋 Личная информация</Title>,
    children: (
        <>
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
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
                virtual={false}
                listHeight={400}
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
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
                virtual={false}
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
              rules={[
                { required: true, message: 'Укажите дату рождения' },
                {
                  pattern: /^\d{2}\.\d{2}\.\d{4}$/,
                  message: 'Дата должна быть в формате ДД.ММ.ГГГГ'
                },
                {
                  validator: (_, value) => {
                    if (!value) {
                      return Promise.resolve();
                    }
                    try {
                      const dateObj = dayjs(value, DATE_FORMAT, true);
                      if (!dateObj.isValid()) {
                        return Promise.reject(new Error('Некорректная дата'));
                      }
                      const age = dayjs().diff(dateObj, 'year');
                      if (age < 18) {
                        return Promise.reject(new Error('Возраст сотрудника должен быть не менее 18 лет'));
                      }
                      if (age > 80) {
                        return Promise.reject(new Error('Возраст сотрудника должен быть не более 80 лет'));
                      }
                    } catch (e) {
                      return Promise.reject(new Error('Некорректная дата'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
              normalize={(value) => {
                if (!value) return value;
                // Если это строка, возвращаем как есть
                if (typeof value === 'string') return value;
                // Если это dayjs объект, форматируем в строку
                if (value && value.format) return value.format(DATE_FORMAT);
                return value;
              }}
            >
              <Input placeholder="ДД.ММ.ГГГГ" size="large" />
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

            <Form.Item label="Примечание" name="note">
              <TextArea rows={2} placeholder="Дополнительная информация" size="large" />
            </Form.Item>
        </>
      ),
    });

  // Блок 2: Документы
  collapseItems.push({
    key: 'documents',
    label: <Title level={5} style={{ margin: 0 }}>📄 Документы</Title>,
    children: (
        <>
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
                  { required: true, message: 'Введите КИГ, символы на латинице' },
                  {
                    pattern: /^[A-Z]{2}\s?\d{7}$/i,
                    message: 'КИГ должен быть в формате: AF 1234567',
                  },
                ]}
                getValueFromEvent={(e) => formatKig(e.target.value)}
              >
                <Input placeholder="AF 1234567" size="large" maxLength={10} />
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
              rules={[
                { required: true, message: 'Укажите дату выдачи' },
                {
                  pattern: /^\d{2}\.\d{2}\.\d{4}$/,
                  message: 'Дата должна быть в формате ДД.ММ.ГГГГ'
                },
                {
                  validator: (_, value) => {
                    if (!value) {
                      return Promise.resolve();
                    }
                    try {
                      const dateObj = dayjs(value, DATE_FORMAT, true);
                      if (!dateObj.isValid()) {
                        return Promise.reject(new Error('Некорректная дата'));
                      }
                    } catch (e) {
                      return Promise.reject(new Error('Некорректная дата'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
              normalize={(value) => {
                if (!value) return value;
                if (typeof value === 'string') return value;
                if (value && value.format) return value.format(DATE_FORMAT);
                return value;
              }}
            >
              <Input placeholder="ДД.ММ.ГГГГ" size="large" />
            </Form.Item>

            <Form.Item
              label="Кем выдан паспорт"
              name="passportIssuer"
              rules={[{ required: true, message: 'Укажите орган выдачи' }]}
            >
              <TextArea placeholder="Наименование органа выдачи" rows={3} size="large" />
            </Form.Item>
        </>
      ),
    });

  // Блок 3: Патент (если требуется)
  if (requiresPatent) {
    collapseItems.push({
      key: 'patent',
      label: <Title level={5} style={{ margin: 0 }}>📑 Патент</Title>,
      children: (
        <>
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
                rules={[
                  { required: true, message: 'Укажите дату выдачи патента' },
                  {
                    pattern: /^\d{2}\.\d{2}\.\d{4}$/,
                    message: 'Дата должна быть в формате ДД.ММ.ГГГГ'
                  },
                  {
                    validator: (_, value) => {
                      if (!value) {
                        return Promise.resolve();
                      }
                      try {
                        const dateObj = dayjs(value, DATE_FORMAT, true);
                        if (!dateObj.isValid()) {
                          return Promise.reject(new Error('Некорректная дата'));
                        }
                      } catch (e) {
                        return Promise.reject(new Error('Некорректная дата'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
                normalize={(value) => {
                  if (!value) return value;
                  if (typeof value === 'string') return value;
                  if (value && value.format) return value.format(DATE_FORMAT);
                  return value;
                }}
              >
                <Input placeholder="ДД.ММ.ГГГГ" size="large" />
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
        </>
      ),
    });
  }

  // Блок 4: Фото документов (объединен с файлами на мобильной версии)
  collapseItems.push({
    key: 'photos',
    label: <Title level={5} style={{ margin: 0 }}>📸 Фото документов</Title>,
    children: (
      <>
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

                {/* Согласие на обработку биометрических данных */}
                <EmployeeDocumentUpload
                  employeeId={employee.id}
                  documentType="biometric_consent"
                  label="Согласие на обработку биометрических данных"
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
      </>
    ),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Скролируемая область с формой */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', paddingBottom: 80, paddingLeft: 16, paddingRight: 16, paddingTop: 16 }}>
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
            items={collapseItems}
          />
        </Form>
      </div>

      {/* Нижняя панель с кнопками (фиксированная) */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '8px 12px',
          background: '#fff',
          borderTop: '1px solid #f0f0f0',
          zIndex: 1000,
          maxWidth: '100vw',
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}
      >
        {/* Кнопка "Сохранить черновик" */}
        <Button
          size="small"
          block
          icon={<FileOutlined />}
          onClick={handleSaveDraft}
          loading={loading}
        >
          Черновик
        </Button>
        
        {/* Кнопки "Сохранить" и "Отмена" в одном ряду */}
        <div style={{ display: 'flex', gap: 6 }}>
          <Button
            type="primary"
            size="small"
            style={{ flex: 1 }}
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={loading}
          >
            Сохранить
          </Button>
          <Button 
            size="small" 
            style={{ 
              flex: 1,
              borderColor: '#ff4d4f',
              color: '#ff4d4f'
            }} 
            onClick={handleCancelWithConfirm} 
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

