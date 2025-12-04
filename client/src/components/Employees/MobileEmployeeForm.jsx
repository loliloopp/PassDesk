import { Form, Input, Select, Button, Space, Typography, Checkbox, Spin, Collapse, App, Popconfirm, Radio } from 'antd';
import { SaveOutlined, CaretRightOutlined, FileOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState, useRef } from 'react';
import { useEmployeeForm } from './useEmployeeForm';
import { employeeStatusService } from '../../services/employeeStatusService';
import { invalidateCache } from '../../utils/requestCache';
import EmployeeDocumentUpload from './EmployeeDocumentUpload';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const DATE_FORMAT = 'DD.MM.YYYY';

// Общие пропсы для отключения автозаполнения браузера
const noAutoFillProps = {
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'off',
  spellCheck: false,
  'data-form-type': 'other',
  'data-lpignore': 'true',
  onFocus: (e) => {
    // Убираем readonly с небольшой задержкой
    if (e.target.hasAttribute('readonly')) {
      setTimeout(() => {
        e.target.removeAttribute('readonly');
      }, 120);
    }
  },
  readOnly: true, // Начинаем с readonly чтобы предотвратить автозаполнение
};

const useAntiAutofillIds = () => ({
  lastName: `employee_last_${Math.random().toString(36).slice(2, 9)}`,
  firstName: `employee_first_${Math.random().toString(36).slice(2, 9)}`,
  middleName: `employee_middle_${Math.random().toString(36).slice(2, 9)}`,
  phone: `employee_phone_${Math.random().toString(36).slice(2, 9)}`,
  registrationAddress: `employee_reg_addr_${Math.random().toString(36).slice(2, 9)}`,
});

const useSelectAutoFillBlocker = (wrapperId) => {
  useEffect(() => {
    if (!wrapperId) return;
    let inputNode = null;
    let intervalId = null;

    const setupInput = () => {
      const wrapper = document.getElementById(wrapperId);
      if (!wrapper) return false;
      const input = wrapper.querySelector('.ant-select-selection-search-input');
      if (!input) return false;
      inputNode = input;
      const handleFocus = () => {
        input.setAttribute('readonly', 'readonly');
        setTimeout(() => {
          input.removeAttribute('readonly');
        }, 120);
      };
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('autocorrect', 'off');
      input.setAttribute('autocapitalize', 'off');
      input.setAttribute('spellcheck', 'false');
      input.setAttribute('data-form-type', 'other');
      input.setAttribute('data-lpignore', 'true');
      input.addEventListener('focus', handleFocus);

      inputNode.__cleanupAutofill = () => {
        input.removeEventListener('focus', handleFocus);
      };

      return true;
    };

    if (!setupInput()) {
      intervalId = window.setInterval(() => {
        if (setupInput()) {
          clearInterval(intervalId);
        }
      }, 150);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (inputNode && inputNode.__cleanupAutofill) {
        inputNode.__cleanupAutofill();
      }
    };
  }, [wrapperId]);
};

// Маска для российского паспорта: форматирует ввод в 1234 №567890 (4 цифры, пробел, №, 6 цифр)
const formatRussianPassportNumber = (value) => {
  if (!value) return value;
  
  // Убираем все символы кроме цифр и №
  const cleaned = value.replace(/[^\d№]/g, '');
  
  // Убираем все символы №, чтобы потом добавить один
  const numbersOnly = cleaned.replace(/№/g, '');
  
  // Ограничиваем длину до 10 цифр (4 серия + 6 номер)
  const limited = numbersOnly.slice(0, 10);
  
  // Если введено меньше 4 символов, просто возвращаем
  if (limited.length <= 4) {
    return limited;
  }
  
  // Форматируем: XXXX №XXXXXX
  return `${limited.slice(0, 4)} №${limited.slice(4)}`;
};

// Функция для удаления форматирования российского паспорта перед отправкой
// Возвращает формат XXXXXXXXXXXX (10 цифр без пробелов и №)
const normalizeRussianPassportNumber = (value) => {
  if (!value) return value;
  // Убираем пробелы и символ №, оставляем только цифры
  return value.replace(/[\s№]/g, '');
};

/**
 * Мобильная форма сотрудника
 * Все поля в один столбец, блоки вместо вкладок
 */
const MobileEmployeeForm = ({ employee, onSuccess, onCancel, onCheckInn }) => {
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
  const antiAutofillIds = useMemo(() => useAntiAutofillIds(), []);

  // Состояние для открытых панелей (по умолчанию все открыны)
  const [activeKeys, setActiveKeys] = useState(['personal', 'documents', 'patent', 'photos', 'statuses']);
  const [employeeIdOnLoad, setEmployeeIdOnLoad] = useState(null); // Отслеживаем id сотрудника при загрузке
  const [fireLoading, setFireLoading] = useState(false); // Состояние загрузки для увольнения
  const innCheckTimeoutRef = useRef(null); // Ref для хранения таймера проверки ИНН
  const [activateLoading, setActivateLoading] = useState(false); // Состояние загрузки для активации
  const [passportType, setPassportType] = useState(null); // Отслеживаем тип паспорта

  // Инициализируем данные формы при изменении сотрудника или справочников
  useEffect(() => {
    if (citizenships.length && positions.length) {
      // Если это новый сотрудник (id изменился)
      if (employee?.id !== employeeIdOnLoad) {
        const formData = initializeEmployeeData(true);
        if (formData) {
          form.setFieldsValue(formData);
          
          // Устанавливаем тип паспорта в state
          if (formData.passportType) {
            setPassportType(formData.passportType);
          }
          
          // Проверяем гражданство
          if (employee?.citizenshipId) {
            handleCitizenshipChange(employee.citizenshipId);
          }
        } else {
          // Новый сотрудник - очищаем форму
          form.resetFields();
          setPassportType(null);
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
        setFireLoading(true);
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
      } finally {
        setFireLoading(false);
      }
    };

    const handleReinstate = async () => {
      try {
        setActivateLoading(true);
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
      } finally {
        setActivateLoading(false);
      }
    };

    const handleDeactivate = async () => {
      try {
        setFireLoading(true);
        await employeeStatusService.deactivateEmployee(employee.id);
        // Очищаем кэш для этого сотрудника
        invalidateCache(`employees:getById:${employee.id}`);
        messageApi.success(`Сотрудник ${employee.lastName} ${employee.firstName} деактивирован`);
        setTimeout(() => {
          onCancel && onCancel();
        }, 500);
      } catch (error) {
        console.error('Error deactivating employee:', error);
        messageApi.error('Ошибка при деактивации сотрудника');
      } finally {
        setFireLoading(false);
      }
    };

    const handleActivate = async () => {
      try {
        setActivateLoading(true);
        await employeeStatusService.activateEmployee(employee.id);
        // Очищаем кэш для этого сотрудника
        invalidateCache(`employees:getById:${employee.id}`);
        messageApi.success(`Сотрудник ${employee.lastName} ${employee.firstName} активирован`);
        setTimeout(() => {
          onCancel && onCancel();
        }, 500);
      } catch (error) {
        console.error('Error activating employee:', error);
        messageApi.error('Ошибка при активации сотрудника');
      } finally {
        setActivateLoading(false);
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
              <Button type="primary" danger block loading={activateLoading}>
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
              <Button danger block loading={fireLoading}>
                Уволить
              </Button>
            </Popconfirm>
          )}
          
          {isInactive ? (
            <Popconfirm
              title="Активировать сотрудника?"
              description={`Вы уверены, что ${employee.lastName} ${employee.firstName} активируется?`}
              onConfirm={handleActivate}
              okText="Да"
              cancelText="Нет"
            >
              <Button type="primary" block loading={activateLoading}>
                Активировать
              </Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="Деактивировать сотрудника?"
              description={`Вы уверены, что ${employee.lastName} ${employee.firstName} деактивируется?`}
              onConfirm={handleDeactivate}
              okText="Да"
              cancelText="Нет"
            >
              <Button type="default" block loading={fireLoading}>
                Деактивировать
              </Button>
            </Popconfirm>
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
              <Input 
                placeholder="1234-567890-12" 
                size="large" 
                {...noAutoFillProps}
              />
            </Form.Item>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
              <label style={{ marginBottom: 0, minWidth: '70px', fontWeight: 500 }}>
                Пол <span style={{ color: '#ff4d4f' }}>*</span>
              </label>
              <Form.Item
                name="gender"
                rules={[{ required: true, message: 'Выберите пол' }]}
                style={{ marginBottom: 0 }}
              >
                <Radio.Group style={{ display: 'flex', gap: '16px' }}>
                  <Radio value="male">Муж</Radio>
                  <Radio value="female">Жен</Radio>
                </Radio.Group>
              </Form.Item>
            </div>

            <Form.Item
              label="Фамилия"
              name="lastName"
              rules={[{ required: true, message: 'Введите фамилию' }]}
            >
              <Input 
                id={antiAutofillIds.lastName}
                name={antiAutofillIds.lastName}
                placeholder="Иванов" 
                size="large" 
                {...noAutoFillProps}
              />
            </Form.Item>

            <Form.Item
              label="Имя"
              name="firstName"
              rules={[{ required: true, message: 'Введите имя' }]}
            >
              <Input 
                id={antiAutofillIds.firstName}
                name={antiAutofillIds.firstName}
                placeholder="Иван" 
                size="large" 
                {...noAutoFillProps}
              />
            </Form.Item>

            <Form.Item label="Отчество" name="middleName">
              <Input 
                id={antiAutofillIds.middleName}
                name={antiAutofillIds.middleName}
                placeholder="Иванович" 
                size="large" 
                {...noAutoFillProps}
              />
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
                autoComplete="off"
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
                autoComplete="off"
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
              <Input placeholder="ДД.ММ.ГГГГ" size="large" {...noAutoFillProps} />
            </Form.Item>

            <Form.Item
              label="Страна рождения"
              name="birthCountryId"
              rules={[{ required: true, message: 'Выберите страну рождения' }]}
            >
              <Select
                popupMatchSelectWidth
                placeholder="Выберите страну рождения"
                size="large"
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
                virtual={false}
                onChange={(value) => {
                  // После выбора просто устанавливаем значение в форму
                  // Form.Item сам срабатит на onChange
                }}
                loading={loadingReferences}
                disabled={loadingReferences || citizenships.length === 0}
                autoComplete="off"
              >
                {citizenships.map((c) => (
                  <Option key={c.id} value={c.id}>
                    {c.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Адрес регистрации"
              name="registrationAddress"
              rules={[{ required: true, message: 'Введите адрес регистрации' }]}
            >
              <TextArea 
                id={antiAutofillIds.registrationAddress}
                name={antiAutofillIds.registrationAddress}
                placeholder="г. Москва, ул. Ленина, д. 1" 
                rows={3} 
                size="large" 
                {...noAutoFillProps}
              />
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
              <Input 
                id={antiAutofillIds.phone}
                name={antiAutofillIds.phone}
                placeholder="+7 (___) ___-__-__" 
                size="large" 
                {...noAutoFillProps}
              />
            </Form.Item>

            <Form.Item label="Примечание" name="note">
              <TextArea 
                rows={2} 
                placeholder="Дополнительная информация" 
                size="large" 
                {...noAutoFillProps}
              />
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
              <Input 
                placeholder="123-456-789 00" 
                size="large" 
                {...noAutoFillProps}
              />
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
                <Input 
                  placeholder="AF 1234567" 
                  size="large" 
                  maxLength={10} 
                  {...noAutoFillProps}
                />
              </Form.Item>
            )}

            {requiresPatent && (
              <Form.Item
                label="Дата окончания КИГ"
                name="kigEndDate"
                rules={[
                  { required: true, message: 'Укажите дату окончания КИГ' },
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
                <Input placeholder="ДД.ММ.ГГГГ" size="large" {...noAutoFillProps} />
              </Form.Item>
            )}

            <Form.Item
              label="Тип паспорта"
              name="passportType"
              rules={[{ required: true, message: 'Выберите тип паспорта' }]}
            >
              <Select 
                placeholder="Выберите тип паспорта" 
                size="large"
                onChange={(value) => setPassportType(value)}
                autoComplete="off"
              >
                <Option value="russian">Российский</Option>
                <Option value="foreign">Иностранного гражданина</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Паспорт (серия и номер)"
              name="passportNumber"
              rules={[{ required: true, message: 'Введите серию и номер паспорта' }]}
              getValueFromEvent={(e) => {
                if (passportType === 'russian') {
                  return formatRussianPassportNumber(e.target.value);
                }
                return e.target.value;
              }}
            >
              <Input 
                placeholder="1234 567890" 
                size="large"
                maxLength={passportType === 'russian' ? 14 : undefined}
                {...noAutoFillProps}
              />
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
              <Input 
                placeholder="ДД.ММ.ГГГГ" 
                size="large" 
                {...noAutoFillProps}
              />
            </Form.Item>

            {passportType === 'foreign' && (
              <Form.Item
                label="Дата окончания паспорта"
                name="passportExpiryDate"
              >
                <Input 
                  placeholder="ДД.ММ.ГГГГ" 
                  size="large" 
                  {...noAutoFillProps}
                />
              </Form.Item>
            )}

            <Form.Item
              label="Кем выдан паспорт"
              name="passportIssuer"
              rules={[{ required: true, message: 'Укажите орган выдачи' }]}
            >
              <TextArea 
                placeholder="Наименование органа выдачи" 
                rows={3} 
                size="large" 
                {...noAutoFillProps}
              />
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
                <Input 
                  placeholder="01 №1234567890" 
                  size="large" 
                  {...noAutoFillProps}
                />
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
                <Input placeholder="ДД.ММ.ГГГГ" size="large" {...noAutoFillProps} />
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
                <Input 
                  placeholder="ПР1234567" 
                  size="large" 
                  maxLength={9} 
                  {...noAutoFillProps}
                />
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

                    {/* Чек об оплате патента */}
                    <EmployeeDocumentUpload
                      employeeId={employee.id}
                      documentType="patent_payment_receipt"
                      label="Чек об оплате патента"
                      readonly={false}
                      multiple={true}
                    />
                  </>
                )}

                {/* Диплом / Документ об образовании */}
                <EmployeeDocumentUpload
                  employeeId={employee.id}
                  documentType="diploma"
                  label="Диплом / Документ об образовании"
                  readonly={false}
                  multiple={true}
                />

                {/* Мед.книжка */}
                <EmployeeDocumentUpload
                  employeeId={employee.id}
                  documentType="med_book"
                  label="Мед.книжка"
                  readonly={false}
                  multiple={true}
                />

                {/* Миграционная карта */}
                <EmployeeDocumentUpload
                  employeeId={employee.id}
                  documentType="migration_card"
                  label="Миграционная карта"
                  readonly={false}
                  multiple={true}
                />

                {/* Уведомление о прибытии (регистрация) */}
                <EmployeeDocumentUpload
                  employeeId={employee.id}
                  documentType="arrival_notice"
                  label="Уведомление о прибытии (регистрация)"
                  readonly={false}
                  multiple={true}
                />

                {/* Уведомление МВД */}
                <EmployeeDocumentUpload
                  employeeId={employee.id}
                  documentType="mvd_notification"
                  label="Уведомление МВД"
                  readonly={false}
                  multiple={true}
                />
              </>
            )}
      </>
    ),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Скролируемая область с формой */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', paddingBottom: 80, paddingLeft: 16, paddingRight: 16, paddingTop: 16 }}>
        {/* Скрытые поля-ловушки для автозаполнения браузера */}
        <div style={{ display: 'none' }} aria-hidden="true">
          <input type="text" name="fakeusernameremember" autoComplete="username" />
          <input type="text" name="fakefirstname" autoComplete="given-name" />
          <input type="text" name="fakelastname" autoComplete="family-name" />
          <input type="text" name="fakeaddress" autoComplete="street-address" />
          <input type="text" name="fakecountry" autoComplete="country-name" />
          <input type="tel" name="fakephone" autoComplete="tel" />
          <input type="email" name="fakeemail" autoComplete="email" />
          <input type="password" name="fakepasswordremember" autoComplete="current-password" />
        </div>
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
          onFieldsChange={(changedFields) => {
            // Проверяем, изменилось ли поле ИНН
            const innField = changedFields.find(field => field.name && field.name[0] === 'inn');
            
            if (innField && !employee && onCheckInn) {
              // Очищаем предыдущий таймер, если он есть
              if (innCheckTimeoutRef.current) {
                clearTimeout(innCheckTimeoutRef.current);
              }
              
              // Запускаем проверку с задержкой 1000мс (debounce)
              innCheckTimeoutRef.current = setTimeout(async () => {
                const innValue = form.getFieldValue('inn');
                const normalized = innValue ? innValue.replace(/[^\d]/g, '') : '';
                
                if ((normalized.length === 10 || normalized.length === 12) && innValue) {
                  await onCheckInn(innValue);
                }
              }, 1000); // Увеличил до 1000мс, чтобы дать пользователю время ввести весь ИНН
            }
          }}
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

