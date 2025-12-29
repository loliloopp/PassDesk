import { useState, useEffect, useMemo, useRef } from 'react';
import { Modal, Form, Input, Select, DatePicker, Row, Col, App, Tabs, Button, Space, Checkbox, Popconfirm, Radio } from 'antd';
import { CheckCircleFilled, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { constructionSiteService } from '../../services/constructionSiteService';
import { counterpartyService } from '../../services/counterpartyService';
import { employeeStatusService } from '../../services/employeeStatusService';
import { invalidateCache } from '../../utils/requestCache';
import { capitalizeFirstLetter, filterCyrillicOnly } from '../../utils/formatters';
import { useAuthStore } from '../../store/authStore';
import { useReferencesStore } from '../../store/referencesStore';
import { DEFAULT_FORM_CONFIG } from '../../shared/config/employeeFields';
import EmployeeFileUpload from './EmployeeFileUpload.jsx';
import DocumentTypeUploader from './DocumentTypeUploader.jsx';
import TransferEmployeeModal from './TransferEmployeeModal.jsx';
import dayjs from 'dayjs';

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
  lastName: `desktop_last_${Math.random().toString(36).slice(2, 9)}`,
  firstName: `desktop_first_${Math.random().toString(36).slice(2, 9)}`,
  middleName: `desktop_middle_${Math.random().toString(36).slice(2, 9)}`,
  phone: `desktop_phone_${Math.random().toString(36).slice(2, 9)}`,
  registrationAddress: `desktop_reg_addr_${Math.random().toString(36).slice(2, 9)}`,
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

// Маска для телефона: форматирует ввод в +7 (123) 456-78-90
const formatPhoneNumber = (value) => {
  if (!value) return value;
  
  // Убираем все символы кроме цифр
  const phoneNumber = value.replace(/[^\d]/g, '');
  
  // Ограничиваем длину до 11 цифр
  const phoneNumberLength = phoneNumber.length;
  
  // Если число начинается с 8, заменяем на 7
  let formattedNumber = phoneNumber;
  if (phoneNumber.startsWith('8')) {
    formattedNumber = '7' + phoneNumber.slice(1);
  }
  
  // Форматируем: +7 (123) 456-78-90
  if (phoneNumberLength < 2) {
    return formattedNumber;
  }
  if (phoneNumberLength < 5) {
    return `+7 (${formattedNumber.slice(1)}`;
  }
  if (phoneNumberLength < 8) {
    return `+7 (${formattedNumber.slice(1, 4)}) ${formattedNumber.slice(4)}`;
  }
  if (phoneNumberLength < 10) {
    return `+7 (${formattedNumber.slice(1, 4)}) ${formattedNumber.slice(4, 7)}-${formattedNumber.slice(7)}`;
  }
  return `+7 (${formattedNumber.slice(1, 4)}) ${formattedNumber.slice(4, 7)}-${formattedNumber.slice(7, 9)}-${formattedNumber.slice(9, 11)}`;
};

// Функция для удаления форматирования телефона перед отправкой
// Возвращает формат +79101234567
const normalizePhoneNumber = (value) => {
  if (!value) return value;
  const digits = value.replace(/[^\d]/g, '');
  // Добавляем + в начало если есть цифры
  return digits ? `+${digits}` : '';
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

// Маска для КИГ: форматирует ввод в АА 1234567 (только латинские буквы)
const formatKig = (value) => {
  if (!value) return value;
  
  // Преобразуем в верхний регистр
  let kig = value.toUpperCase();
  
  // Убираем все символы кроме латинских букв и цифр
  kig = kig.replace(/[^A-Z0-9]/g, '');
  
  // Разделяем на буквы и цифры
  const letters = kig.replace(/[^A-Z]/g, '');
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

// Функция для удаления форматирования КИГ перед отправкой
// Возвращает формат АА1234567 (без пробела)
const normalizeKig = (value) => {
  if (!value) return value;
  return value.replace(/\s/g, '');
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

// Маска для номера патента: форматирует ввод в XX №1234567890 (где XX - любые 2 цифры от 01 до 99)
const formatPatentNumber = (value) => {
  if (!value) return value;
  
  // Убираем все символы кроме цифр и №
  const cleaned = value.replace(/[^\d№]/g, '');
  
  // Убираем все символы №, чтобы потом добавить один
  const numbersOnly = cleaned.replace(/№/g, '');
  
  // Ограничиваем длину до 12 цифр (2 цифры кода + 10 цифр номера)
  const limited = numbersOnly.slice(0, 12);
  
  // Если введено меньше 2 символов, просто возвращаем
  if (limited.length === 0) {
    return '';
  }
  if (limited.length === 1) {
    return limited;
  }
  if (limited.length === 2) {
    return limited;
  }
  
  // Форматируем: XX №1234567890
  return `${limited.slice(0, 2)} №${limited.slice(2)}`;
};

// Функция для удаления форматирования номера патента перед отправкой
// Возвращает формат XX№1234567890 (без пробела)
const normalizePatentNumber = (value) => {
  if (!value) return value;
  // Убираем пробелы, оставляем только цифры и №
  return value.replace(/\s/g, '');
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

// Маска для номера бланка: форматирует ввод в ПР1234567 (кириллица)
const formatBlankNumber = (value) => {
  if (!value) return value;
  
  // Преобразуем в верхний регистр
  let blank = value.toUpperCase();
  
  // Убираем все символы кроме кириллических букв и цифр
  blank = blank.replace(/[^А-ЯЁ0-9]/g, '');
  
  // Разделяем на буквы и цифры
  const letters = blank.replace(/[^А-ЯЁ]/g, '');
  const numbers = blank.replace(/[^0-9]/g, '');
  
  // Ограничиваем: 2 буквы + 7 цифр
  const limitedLetters = letters.slice(0, 2);
  const limitedNumbers = numbers.slice(0, 7);
  
  // Форматируем: ПР1234567
  return `${limitedLetters}${limitedNumbers}`;
};

/**
 * Компонент кнопок для действий со статусом уволен/неактивен
 */
const EmployeeActionButtons = ({ employee, messageApi, onCancel, isDefaultCounterpartyUser, isAdmin, onTransfer }) => {
  const [loadingFire, setLoadingFire] = useState(false);
  const [loadingReinstate, setLoadingReinstate] = useState(false);

  const isFired = employee.statusMappings?.find(m => m.statusGroup === 'status_active')?.status?.name === 'status_active_fired';
  const isInactive = employee.statusMappings?.find(m => m.statusGroup === 'status_active')?.status?.name === 'status_active_inactive';

  const handleFire = async () => {
    try {
      setLoadingFire(true);
      await employeeStatusService.fireEmployee(employee.id);
      // Очищаем кэш для этого сотрудника
      invalidateCache(`employees:getById:${employee.id}`);
      messageApi.success(`Сотрудник ${employee.lastName} ${employee.firstName} уволен`);
      // Закрываем модал
      setTimeout(() => {
        onCancel && onCancel();
      }, 500);
    } catch (error) {
      console.error('Error firing employee:', error);
      messageApi.error('Ошибка при увольнении сотрудника');
    } finally {
      setLoadingFire(false);
    }
  };

  const handleReinstate = async () => {
    try {
      setLoadingReinstate(true);
      await employeeStatusService.reinstateEmployee(employee.id);
      // Очищаем кэш для этого сотрудника
      invalidateCache(`employees:getById:${employee.id}`);
      messageApi.success(`Сотрудник ${employee.lastName} ${employee.firstName} восстановлен`);
      // Закрываем модал
      setTimeout(() => {
        onCancel && onCancel();
      }, 500);
    } catch (error) {
      console.error('Error reinstating employee:', error);
      messageApi.error('Ошибка при восстановлении сотрудника');
    } finally {
      setLoadingReinstate(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      setLoadingFire(true);
      await employeeStatusService.deactivateEmployee(employee.id);
      // Очищаем кэш для этого сотрудника
      invalidateCache(`employees:getById:${employee.id}`);
      messageApi.success(`Сотрудник ${employee.lastName} ${employee.firstName} деактивирован`);
      // Закрываем модал
      setTimeout(() => {
        onCancel && onCancel();
      }, 500);
    } catch (error) {
      console.error('Error deactivating employee:', error);
      messageApi.error('Ошибка при деактивации сотрудника');
    } finally {
      setLoadingFire(false);
    }
  };

  const handleActivate = async () => {
    try {
      setLoadingReinstate(true);
      await employeeStatusService.activateEmployee(employee.id);
      // Очищаем кэш для этого сотрудника
      invalidateCache(`employees:getById:${employee.id}`);
      messageApi.success(`Сотрудник ${employee.lastName} ${employee.firstName} активирован`);
      // Закрываем модал
      setTimeout(() => {
        onCancel && onCancel();
      }, 500);
    } catch (error) {
      console.error('Error activating employee:', error);
      messageApi.error('Ошибка при активации сотрудника');
    } finally {
      setLoadingReinstate(false);
    }
  };

  return (
    <Space wrap>
      {isFired ? (
        <Popconfirm
          title="Восстановить сотрудника?"
          description={`Вы уверены, что ${employee.lastName} ${employee.firstName} восстанавливается?`}
          onConfirm={handleReinstate}
          okText="Да"
          cancelText="Нет"
        >
          <Button type="primary" danger loading={loadingReinstate}>
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
          <Button danger loading={loadingFire}>
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
          <Button type="primary" loading={loadingReinstate}>
            Активировать
          </Button>
        </Popconfirm>
      ) : (
        // Скрываем кнопку для пользователей контрагента default
        !isDefaultCounterpartyUser && (
          <Popconfirm
            title="Сотрудник не работает на объектах СУ-10?"
            description={`Вы уверены, что ${employee.lastName} ${employee.firstName} не работает на объектах СУ-10?`}
            onConfirm={handleDeactivate}
            okText="Да"
            cancelText="Нет"
          >
            <Button type="default" loading={loadingFire}>
              Не работает на объектах СУ-10
            </Button>
          </Popconfirm>
        )
      )}
      
      {/* Кнопка перевода в другую компанию (только для admin) */}
      {isAdmin && onTransfer && (
        <Button 
          onClick={onTransfer}
          style={{ borderColor: '#1890ff', color: '#1890ff' }}
        >
          Перевести в другую компанию
        </Button>
      )}
    </Space>
  );
};

const EmployeeFormModal = ({ visible, employee, onCancel, onSuccess, onCheckInn }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const antiAutofillIds = useMemo(() => useAntiAutofillIds(), []);
  const [citizenships, setCitizenships] = useState([]);
  const [constructionSites, setConstructionSites] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checkingCitizenship, setCheckingCitizenship] = useState(false); // Флаг проверки гражданства
  const [dataLoaded, setDataLoaded] = useState(false); // Новый флаг: данные полностью загружены
  const [activeTab, setActiveTab] = useState('1');
  const [tabsValidation, setTabsValidation] = useState({
    '1': false, // Личная информация
    '2': false, // Документы
    '3': false, // Патент
  });
  const [selectedCitizenship, setSelectedCitizenship] = useState(null);
  const [defaultCounterpartyId, setDefaultCounterpartyId] = useState(null);
  const [passportType, setPassportType] = useState(null); // Состояние для типа паспорта
  const [linkingMode, setLinkingMode] = useState(false); // 🎯 Режим привязки существующего сотрудника
  const innCheckTimeoutRef = useRef(null); // Ref для хранения таймера проверки ИНН
  const isFormResetRef = useRef(false); // 🎯 Флаг для предотвращения проверки ИНН при сбросе формы
  const [latinInputError, setLatinInputError] = useState(null); // Поле, где был введен латинский символ
  const latinErrorTimeoutRef = useRef(null); // Ref для таймера очистки ошибки
  const { user } = useAuthStore();
  const { formConfigDefault, formConfigExternal } = useReferencesStore();
  const [transferModalVisible, setTransferModalVisible] = useState(false); // Модальное окно перевода сотрудника
  const [activeConfig, setActiveConfig] = useState(DEFAULT_FORM_CONFIG);
  const [availableCounterparties, setAvailableCounterparties] = useState([]); // Доступные контрагенты
  const [loadingCounterparties, setLoadingCounterparties] = useState(false); // Загрузка контрагентов

  // Определяем активный конфиг
  useEffect(() => {
    const isDefault = user?.counterpartyId === defaultCounterpartyId;
    const config = isDefault ? (formConfigDefault || DEFAULT_FORM_CONFIG) : (formConfigExternal || DEFAULT_FORM_CONFIG);
    setActiveConfig(config);
  }, [user, defaultCounterpartyId, formConfigDefault, formConfigExternal]);

  // Хелпер для получения настроек поля
  const getFieldProps = (fieldName) => {
    const fieldConfig = activeConfig[fieldName] || { visible: true, required: false };
    
    // Базовые правила (например, паттерны)
    let rules = [];
    if (fieldConfig.required) {
      rules.push({ required: true, message: `Заполните поле` });
    }
    
    return {
      hidden: !fieldConfig.visible,
      required: fieldConfig.required,
      rules, // Это базовые правила, специфичные добавляются в самом Form.Item
    };
  };

  // Обработчик для обновления при изменении файлов
  // filesCount - количество файлов (используется только для информации)
  const handleFilesChange = (filesCount) => {
    // При изменении файлов просто уведомляем родителя о необходимости обновления
    // Не вызываем onSuccess, так как файлы не меняют данные самого сотрудника
    // Обновление таблицы происходит в родительском компоненте автоматически
  };

  // Определяем, требуется ли патент для выбранного гражданства
  const requiresPatent = selectedCitizenship?.requiresPatent !== false;

  // Определяем обязательные поля для каждой вкладки (динамически)
  const getRequiredFieldsByTab = (currentRequiresPatent, currentPassportType) => {
    const allFields = {
      '1': ['inn', 'lastName', 'firstName', 'middleName', 'gender', 'positionId', 'citizenshipId', 'birthCountryId', 'birthDate', 'registrationAddress', 'email', 'phone', 'notes'],
      '2': ['snils', 'kig', 'kigEndDate', 'passportType', 'passportNumber', 'passportDate', 'passportIssuer', 'passportExpiryDate'],
      '3': ['patentNumber', 'patentIssueDate', 'blankNumber'],
    };

    const requiredFields = {};

    Object.keys(allFields).forEach(tabKey => {
      requiredFields[tabKey] = allFields[tabKey].filter(fieldName => {
        const props = getFieldProps(fieldName);
        
        // Если поле скрыто или не обязательно в настройках - оно нас не интересует для "зеленой галочки"
        if (props.hidden || !props.required) {
          return false;
        }

        // Специфичная логика
        if (fieldName === 'kig' || fieldName === 'kigEndDate') {
          if (!currentRequiresPatent) return false;
        }
        
        if (fieldName === 'passportExpiryDate') {
          if (currentPassportType !== 'foreign') return false;
        }

        return true;
      });
    });

    if (!currentRequiresPatent) {
      delete requiredFields['3'];
    }

    return requiredFields;
  };

  const requiredFieldsByTab = getRequiredFieldsByTab(requiresPatent, passportType);

  const computeValidation = (forceCompute = false, citizenshipOverride = null) => {
    const values = form.getFieldsValue(true);
    const validation = {};
    
    const currentCitizenship = citizenshipOverride || selectedCitizenship;
    const currentRequiresPatent = currentCitizenship?.requiresPatent !== false;
    // passportType берем из формы, чтобы было актуально
    const currentPassportType = values.passportType || passportType;
    
    const currentRequiredFieldsByTab = getRequiredFieldsByTab(currentRequiresPatent, currentPassportType);
    
    Object.entries(currentRequiredFieldsByTab).forEach(([tabKey, fields]) => {
      if (!fields) {
        validation[tabKey] = true;
        return;
      }
      
      const fieldsStatus = fields.map(field => {
        const value = values[field];
        const isValid = Array.isArray(value) 
          ? value.length > 0 
          : value !== undefined && value !== null && value !== '';
          
        return { field, value, isValid };
      });
      
      validation[tabKey] = fieldsStatus.every(f => f.isValid);
    });
    
    return validation;
  };

  const scheduleValidation = () => {
    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const validation = computeValidation();
          setTabsValidation(validation);
        });
      });
    } else {
      setTimeout(() => {
        const validation = computeValidation();
        setTabsValidation(validation);
      }, 0);
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    
    const initializeModal = async () => {
      if (!visible) {
        // Сбрасываем состояние при закрытии
        setDataLoaded(false);
        setCheckingCitizenship(false);
        setSelectedCitizenship(null);
        setPassportType(null);
        return;
      }

      setDataLoaded(false);
      setActiveTab('1');
      
      try {
        // Загружаем справочники параллельно и получаем загруженные данные напрямую
        const [loadedCitizenships, loadedSites, loadedPositions, loadedCounterpartyId, loadedCounterparties] = await Promise.all([
          fetchCitizenships(),
          fetchConstructionSites(),
          fetchPositions(),
          fetchDefaultCounterparty(),
          fetchCounterparties()
        ]);
        
        // Проверяем, не был ли запрос отменен
        if (abortController.signal.aborted) {
          return;
        }

        if (employee) {
          // 🎯 Используем linkingMode из employee напрямую
          const shouldUseLinkingMode = employee.linkingMode === true;
          console.log('🔍 EmployeeFormModal useEffect: employee.linkingMode=', employee.linkingMode, 'shouldUseLinkingMode=', shouldUseLinkingMode);
          setLinkingMode(shouldUseLinkingMode);
          
          // Сразу устанавливаем данные сотрудника в форму
          const mapping = employee.employeeCounterpartyMappings?.[0];
          
          // Определяем текущие статусы из маппинга
          let isFired = false;
          let isInactive = false;
          
          if (employee.statusMappings && Array.isArray(employee.statusMappings)) {
            const statusMapping = employee.statusMappings.find(m => {
              const mappingGroup = m.statusGroup || m.status_group;
              return mappingGroup === 'status_active';
            });
            if (statusMapping) {
              const statusObj = statusMapping.status || statusMapping.Status;
              const statusName = statusObj?.name;
              if (statusName === 'status_active_fired' || statusName === 'status_active_fired_compl') {
                isFired = true;
              } else if (statusName === 'status_active_inactive') {
                isInactive = true;
              }
            }
          }
          
          const formData = {
            ...employee,
            birthDate: employee.birthDate ? dayjs(employee.birthDate) : null,
            passportDate: employee.passportDate ? dayjs(employee.passportDate) : null,
            passportExpiryDate: employee.passportExpiryDate ? dayjs(employee.passportExpiryDate) : null,
            patentIssueDate: employee.patentIssueDate ? dayjs(employee.patentIssueDate) : null,
            kigEndDate: employee.kigEndDate ? dayjs(employee.kigEndDate) : null,
            constructionSiteId: mapping?.constructionSiteId || null,
            birthCountryId: employee.birthCountryId || null,
            isFired: isFired,
            isInactive: isInactive,
            // Форматируем ИНН, СНИЛС, телефон, КИГ, номер патента и номер бланка при загрузке
            inn: employee.inn ? formatInn(employee.inn) : null,
            snils: employee.snils ? formatSnils(employee.snils) : null,
            phone: employee.phone ? formatPhoneNumber(employee.phone) : null,
            kig: employee.kig ? formatKig(employee.kig) : null,
            patentNumber: employee.patentNumber ? formatPatentNumber(employee.patentNumber) : null,
            blankNumber: employee.blankNumber ? formatBlankNumber(employee.blankNumber) : null,
          };
          
          form.setFieldsValue(formData);
          
          // Инициализируем тип паспорта
          setPassportType(employee.passportType || null);
          
          // Определяем гражданство используя загруженные данные напрямую
          setCheckingCitizenship(true);
          
          if (employee.citizenshipId && loadedCitizenships.length > 0) {
            const citizenship = loadedCitizenships.find(c => c.id === employee.citizenshipId);
            
            if (citizenship) {
              setSelectedCitizenship(citizenship);
              
              // Небольшая задержка для обновления DOM
              await new Promise(resolve => setTimeout(resolve, 50));
              
              // Запускаем валидацию с учетом гражданства
              const validation = computeValidation(true, citizenship);
              setTabsValidation(validation);
            }
          }
          
          setCheckingCitizenship(false);
          setDataLoaded(true);
        } else {
          // Для нового сотрудника просто загружаем справочники
          form.resetFields();
          
          // Устанавливаем counterpartyId по умолчанию - контрагента текущего пользователя
          if (user?.counterpartyId) {
            form.setFieldsValue({ counterpartyId: user.counterpartyId });
          }
          
          setActiveTab('1');
          setTabsValidation({ '1': false, '2': false, '3': false });
          setSelectedCitizenship(null);
          setDataLoaded(true);
        }
      } catch (error) {
        // Игнорируем ошибки отмены запроса
        if (error.name === 'AbortError' || error.name === 'CanceledError') {
          return;
        }
        console.error('❌ EmployeeFormModal: initialization error', error);
        if (!abortController.signal.aborted) {
          setCheckingCitizenship(false);
          setDataLoaded(true);
        }
      }
    };

    initializeModal();
    
    // Cleanup: отменяем запросы при размонтировании или изменении visible/employee
    return () => {
      abortController.abort();
    };
  }, [visible, employee]);

  // Обновляем валидацию при изменении requiresPatent
  useEffect(() => {
    // Не запускаем во время проверки гражданства
    if (checkingCitizenship) return;
    
    if (!requiresPatent && activeTab === '3') {
      // Если патент больше не требуется и мы на вкладке "Патент", переключаемся на первую вкладку
      setActiveTab('1');
    }
    
    // Запускаем валидацию только если данные загружены и форма открыта
    // НЕ запускаем при первой загрузке (это делается в initializeModal)
    if (visible && dataLoaded && selectedCitizenship !== null) {
      // Небольшая задержка, чтобы дать React обновить DOM
      setTimeout(() => {
        scheduleValidation();
      }, 50);
    }
  }, [requiresPatent]);

  const updateSelectedCitizenship = (citizenshipId) => {
    const citizenship = citizenships.find(c => c.id === citizenshipId);
    setSelectedCitizenship(citizenship || null);
  };

  const handleCitizenshipChange = (citizenshipId) => {
    updateSelectedCitizenship(citizenshipId);
    // Валидация запустится автоматически через handleFieldsChange
  };

  const fetchCitizenships = async () => {
    try {
      // Используем глобальный кэш
      const { fetchCitizenships: fetchFromCache } = useReferencesStore.getState();
      const loadedCitizenships = await fetchFromCache();
      setCitizenships(loadedCitizenships);
      return loadedCitizenships;
    } catch (error) {
      console.error('Error loading citizenships:', error);
      return [];
    }
  };

  const fetchConstructionSites = async () => {
    try {
      if (!user?.counterpartyId || !defaultCounterpartyId) {
        return [];
      }

      let loadedSites = [];
      if (user.counterpartyId === defaultCounterpartyId) {
        // Для default контрагента - все объекты
        const { data } = await constructionSiteService.getAll();
        loadedSites = data.data.constructionSites || [];
      } else {
        // Для остальных контрагентов - только назначенные объекты
        const { data } = await constructionSiteService.getCounterpartyObjects(user.counterpartyId);
        loadedSites = data.data || [];
      }
      
      setConstructionSites(loadedSites);
      return loadedSites;
    } catch (error) {
      console.error('Error loading construction sites:', error);
      // Не показываем ошибку, просто возвращаем пустой массив
      setConstructionSites([]);
      return [];
    }
  };

  const fetchPositions = async () => {
    try {
      // Используем глобальный кэш
      const { fetchPositions: fetchFromCache } = useReferencesStore.getState();
      const loadedPositions = await fetchFromCache();
      setPositions(loadedPositions);
      return loadedPositions;
    } catch (error) {
      console.error('Error loading positions:', error);
      return [];
    }
  };

  const fetchDefaultCounterparty = async () => {
    try {
      // Используем глобальный кэш
      const { fetchSettings } = useReferencesStore.getState();
      const settings = await fetchSettings();
      const dcId = settings?.defaultCounterpartyId;
      setDefaultCounterpartyId(dcId);
      return dcId;
    } catch (error) {
      console.error('Error loading default counterparty:', error);
      return null;
    }
  };

  const fetchCounterparties = async () => {
    try {
      setLoadingCounterparties(true);
      const response = await counterpartyService.getAvailable();
      if (response.data.success) {
        setAvailableCounterparties(response.data.data);
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Error loading counterparties:', error);
      setAvailableCounterparties([]);
      return [];
    } finally {
      setLoadingCounterparties(false);
    }
  };

  // Проверяем, заполнены ли все обязательные поля на вкладке
  const validateTab = async (tabKey) => {
    const requiredFields = requiredFieldsByTab[tabKey];
    if (!requiredFields) return true; // Если нет обязательных полей, считаем вкладку валидной

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
    const validation = computeValidation();
    setTabsValidation(validation);
    // Логируем только если включен debug режим
    if (window.DEBUG_VALIDATION) {
      console.log('🔍 Tab validation:', {
        requiresPatent,
        requiredFieldsByTab,
        validation,
        allValid: Object.keys(requiredFieldsByTab).every(tabKey => validation[tabKey] === true)
      });
    }
    return validation;
  };

  // Проверяем, все ли вкладки валидны
  const allTabsValid = () => {
    // Проверяем только те вкладки, которые существуют в requiredFieldsByTab
    const requiredTabs = Object.keys(requiredFieldsByTab);
    return requiredTabs.every(tabKey => tabsValidation[tabKey] === true);
  };

  // Обработчик изменения полей формы
  const handleFieldsChange = (changedFields) => {
    if (!dataLoaded) {
      return; // Не запускаем валидацию, пока данные не загружены
    }
    
    // Обновляем тип паспорта
    const currentPassportType = form.getFieldValue('passportType');
    if (currentPassportType !== passportType) {
      setPassportType(currentPassportType);
    }
    
    if (window.validationTimeout) {
      clearTimeout(window.validationTimeout);
    }
    window.validationTimeout = setTimeout(() => {
      scheduleValidation();
    }, 100);

    // Сбрасываем флаг после обработки
    isFormResetRef.current = false;
  };

  // Обработчик потери фокуса на поле ИНН
  const handleInnBlur = async () => {
    // Не проверяем ИНН при редактировании сотрудника или при сбросе формы
    if (employee || !onCheckInn || isFormResetRef.current) {
      return;
    }

    const innValue = form.getFieldValue('inn');
    const normalized = innValue ? innValue.replace(/[^\d]/g, '') : '';
    
    // Проверяем только если ИНН полностью заполнен (10 или 12 цифр)
    if ((normalized.length === 10 || normalized.length === 12) && innValue) {
      try {
        await onCheckInn(innValue);
      } catch (error) {
        // 🎯 Обработка ошибок проверки ИНН (409, 404 и т.д.)
        if (error.response?.status === 409) {
          // Сотрудник найден в другом контрагенте
          message.error(error.response?.data?.message || 'Сотрудник с таким ИНН уже существует. Обратитесь к администратору.');
        } else if (error.response?.status !== 404) {
          // 404 это нормально (сотрудник не найден)
          console.error('Ошибка при проверке ИНН:', error);
        }
      }
    }
  };

  // Обработчик onChange для капитализации ФИО
  const handleFullNameChange = (fieldName, value) => {
    // Проверяем, был ли введен латинский символ
    const hasLatin = /[a-zA-Z]/.test(value);
    
    if (hasLatin) {
      // Показываем ошибку для текущего поля
      setLatinInputError(fieldName);
      
      // Очищаем предыдущий таймер если есть
      if (latinErrorTimeoutRef.current) {
        clearTimeout(latinErrorTimeoutRef.current);
      }
      
      // Очищаем ошибку через 3 секунды
      latinErrorTimeoutRef.current = setTimeout(() => {
        setLatinInputError(null);
      }, 3000);
    }
    
    // Фильтруем латиницу - оставляем только кириллицу
    const filtered = filterCyrillicOnly(value);
    // Капитализируем первую букву и обновляем значение в форме
    const capitalizedValue = capitalizeFirstLetter(filtered);
    form.setFieldValue(fieldName, capitalizedValue);
  };

  // Переход на следующую вкладку
  const handleNext = () => {
    // Определяем доступные вкладки в зависимости от requiresPatent
    const tabOrder = requiresPatent ? ['1', '2', '3'] : ['1', '2'];
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentIndex + 1]);
    }
  };

  // Сохранение как черновик
  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      // Получаем ВСЕ значения, включая скрытые поля
      const values = form.getFieldsValue(true);
      
      const formattedValues = {};
      const uuidFields = ['positionId', 'citizenshipId']; // UUID поля требуют null вместо пустых строк
      
      Object.keys(values).forEach(key => {
        // constructionSiteId обрабатывается отдельно
        if (key === 'constructionSiteId') {
          return;
        }
        
        const value = values[key];
        
        // Обрабатываем чекбоксы статусов отдельно - отправляем как boolean
        if (key === 'isFired' || key === 'isInactive') {
          formattedValues[key] = !!value;
          return;
        }
        
        if (value === '' || value === undefined || value === null) {
          formattedValues[key] = null;
        } else if (key === 'birthDate' || key === 'passportDate' || key === 'patentIssueDate' || key === 'kigEndDate' || key === 'passportExpiryDate') {
          // Проверяем что это dayjs объект (имеет метод format), а не строка
          formattedValues[key] = (value && value.format) ? value.format('YYYY-MM-DD') : null;
        } else if (key === 'phone') {
          // Убираем форматирование телефона и добавляем + в начало
          formattedValues[key] = normalizePhoneNumber(value);
        } else if (key === 'kig') {
          // Убираем пробел из КИГ (АА 1234567 → АА1234567)
          formattedValues[key] = normalizeKig(value);
        } else if (key === 'patentNumber') {
          // Убираем пробел из номера патента (01 №1234567890 → 01№1234567890)
          formattedValues[key] = normalizePatentNumber(value);
        } else if (key === 'inn' || key === 'snils') {
          // Убираем дефисы и пробелы из ИНН и СНИЛС (оставляем только цифры)
          formattedValues[key] = value ? value.replace(/[^\d]/g, '') : null;
        } else if (key === 'passportNumber') {
          // Обработка номера паспорта в зависимости от типа
          if (values.passportType === 'russian') {
            // Для российского паспорта: убираем пробелы и символ №, оставляем только цифры
            formattedValues[key] = normalizeRussianPassportNumber(value);
          } else {
            // Для иностранного паспорта: оставляем как есть
            formattedValues[key] = value;
          }
        } else if (uuidFields.includes(key)) {
          // Для UUID полей - убеждаемся что пустые строки становятся null
          formattedValues[key] = (value && String(value).trim()) ? value : null;
        } else {
          formattedValues[key] = value;
        }
      });

      formattedValues.isDraft = true; // Флаг для фронтенда
      await onSuccess(formattedValues);
      
      // При сохранении черновика модальное окно НЕ закрывается
      // Если это добавление нового сотрудника - сбрасываем форму
      if (!employee) {
        // 🎯 ВАЖНО: очищаем таймер проверки ИНН ДО сброса формы
        if (innCheckTimeoutRef.current) {
          clearTimeout(innCheckTimeoutRef.current);
        }
        isFormResetRef.current = true;
        form.resetFields();
        setActiveTab('1');
        setTabsValidation({ '1': false, '2': false, '3': false });
        setSelectedCitizenship(null);
        setPassportType(null);
      }
      // Если это редактирование - оставляем окно открытым с загруженными данными
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
      // Сначала валидируем видимые поля
      await form.validateFields();
      
      // Получаем ВСЕ значения для отправки, включая скрытые
      const values = form.getFieldsValue(true);
      
      const formattedValues = {};
      const uuidFields = ['positionId', 'citizenshipId']; // UUID поля требуют null вместо пустых строк
      
      Object.keys(values).forEach(key => {
        // constructionSiteId обрабатывается отдельно
        if (key === 'constructionSiteId') {
          return;
        }
        
        const value = values[key];
        
        // Обрабатываем чекбоксы статусов отдельно - отправляем как boolean
        if (key === 'isFired' || key === 'isInactive') {
          formattedValues[key] = !!value;
          return;
        }
        
        if (value === '' || value === undefined || value === null) {
          formattedValues[key] = null;
        } else if (key === 'birthDate' || key === 'passportDate' || key === 'patentIssueDate' || key === 'kigEndDate' || key === 'passportExpiryDate') {
          // Проверяем что это dayjs объект (имеет метод format), а не строка
          formattedValues[key] = (value && value.format) ? value.format('YYYY-MM-DD') : null;
        } else if (key === 'phone') {
          // Убираем форматирование телефона и добавляем + в начало
          formattedValues[key] = normalizePhoneNumber(value);
        } else if (key === 'kig') {
          // Убираем пробел из КИГ (АА 1234567 → АА1234567)
          formattedValues[key] = normalizeKig(value);
        } else if (key === 'patentNumber') {
          // Убираем пробел из номера патента (01 №1234567890 → 01№1234567890)
          formattedValues[key] = normalizePatentNumber(value);
        } else if (key === 'inn' || key === 'snils') {
          // Убираем дефисы и пробелы из ИНН и СНИЛС (оставляем только цифры)
          formattedValues[key] = value ? value.replace(/[^\d]/g, '') : null;
        } else if (key === 'passportNumber') {
          // Обработка номера паспорта в зависимости от типа
          if (values.passportType === 'russian') {
            // Для российского паспорта: убираем пробелы и символ №, оставляем только цифры
            formattedValues[key] = normalizeRussianPassportNumber(value);
          } else {
            // Для иностранного паспорта: оставляем как есть
            formattedValues[key] = value;
          }
        } else if (uuidFields.includes(key)) {
          // Для UUID полей - убеждаемся что пустые строки становятся null
          formattedValues[key] = (value && String(value).trim()) ? value : null;
        } else {
          formattedValues[key] = value;
        }
      });

      formattedValues.isDraft = false; // Флаг для бэкенда
      
      // 🎯 РЕЖИМ ПРИВЯЗКИ: отправляем ID сотрудника вместо его данных
      console.log('🔍 EmployeeFormModal before onSuccess:', {
        linkingMode,
        employeeId: employee?.id,
        willAddEmployeeId: linkingMode && employee?.id
      });
      
      if (linkingMode && employee?.id) {
        formattedValues.employeeId = employee.id; // Указываем, что привязываем существующего сотрудника
        delete formattedValues.id; // ❌ Удаляем id, чтобы не конфликтовал с employeeId
        console.log('✅ EmployeeFormModal: Added employeeId to formattedValues:', formattedValues.employeeId);
      }

      console.log('📤 EmployeeFormModal: Calling onSuccess with formattedValues.employeeId=', formattedValues.employeeId);
      await onSuccess(formattedValues);
      
      // 🎯 Если это режим привязки - остаемся на странице с сообщением
      if (linkingMode) {
        message.success('Сотрудник успешно привязан к вашему профилю');
        // 🎯 ВАЖНО: очищаем таймер проверки ИНН ДО сброса формы
        if (innCheckTimeoutRef.current) {
          clearTimeout(innCheckTimeoutRef.current);
        }
        // Сбрасываем форму и режим привязки
        isFormResetRef.current = true;
        form.resetFields();
        setActiveTab('1');
        setTabsValidation({ '1': false, '2': false, '3': false });
        setSelectedCitizenship(null);
        setPassportType(null);
        setLinkingMode(false);
      } else if (!employee) {
        // Если это добавление нового сотрудника - НЕ закрываем окно
        // 🎯 ВАЖНО: очищаем таймер проверки ИНН ДО сброса формы
        if (innCheckTimeoutRef.current) {
          clearTimeout(innCheckTimeoutRef.current);
        }
        // Сбрасываем форму для добавления следующего сотрудника
        isFormResetRef.current = true;
        form.resetFields();
        setActiveTab('1');
        setTabsValidation({ '1': false, '2': false, '3': false });
        setSelectedCitizenship(null);
        setPassportType(null);
      } else {
        // Если это редактирование своего сотрудника - закрываем окно
        onCancel();
      }
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

  // Обработчик закрытия модального окна
  const handleModalCancel = () => {
    onCancel();
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

  // Генерируем items для Tabs в новом формате
  const getTabsItems = () => {
    const items = [
      // Вкладка 1: Личная информация
      {
        key: '1',
        label: (
          <span style={getTabStyle()}>
            {getTabIcon('1')}
            Личная информация
          </span>
        ),
        children: (
          <>
            {/* Кнопки действий со статусами - только для существующих сотрудников */}
            {employee?.id && (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={24}>
                  <Space size="middle" wrap>
                    <EmployeeActionButtons 
                      employee={employee}
                      messageApi={message}
                      onCancel={onCancel}
                      isDefaultCounterpartyUser={user?.counterpartyId === defaultCounterpartyId}
                      isAdmin={user?.role === 'admin'}
                      onTransfer={() => setTransferModalVisible(true)}
                    />
                  </Space>
                </Col>
              </Row>
            )}
            
            {/* ИНН и Пол - первая строка */}
            <Row gutter={16}>
              {!getFieldProps('inn').hidden && (
                <Col xs={24} sm={3} md={3} lg={3}>
                  <Form.Item 
                    name="inn" 
                    label="ИНН"
                    required={getFieldProps('inn').required}
                    rules={[
                      ...getFieldProps('inn').rules,
                      {
                        pattern: /^\d{4}-\d{5}-\d{1}$|^\d{4}-\d{6}-\d{2}$/,
                        message: 'ИНН должен быть в формате XXXX-XXXXX-X или XXXX-XXXXXX-XX'
                      }
                    ]}
                    normalize={(value) => {
                      return formatInn(value);
                    }}
                  >
                    <Input 
                      maxLength={14} 
                      placeholder="XXXX-XXXXX-X" 
                      onBlur={handleInnBlur}
                      {...noAutoFillProps} 
                    />
                  </Form.Item>
                </Col>
              )}
              {!getFieldProps('gender').hidden && (
                <Col xs={24} sm={3} md={3} lg={3}>
                  <Form.Item
                    name="gender"
                    label="Пол"
                    required={getFieldProps('gender').required}
                    rules={getFieldProps('gender').rules}
                  >
                    <Radio.Group style={{ display: 'flex', gap: '8px' }}>
                      <Radio value="male">Муж</Radio>
                      <Radio value="female">Жен</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
              )}
              {!getFieldProps('lastName').hidden && (
                <Col xs={24} sm={6} md={6} lg={6}>
                  <Form.Item
                    name="lastName"
                    label="Фамилия"
                    required={getFieldProps('lastName').required}
                    rules={getFieldProps('lastName').rules}
                    validateStatus={latinInputError === 'lastName' ? 'error' : ''}
                    help={latinInputError === 'lastName' ? 'Ввод только на кириллице' : ''}
                  >
                    <Input 
                      id={antiAutofillIds.lastName} 
                      name={antiAutofillIds.lastName} 
                      {...noAutoFillProps}
                      onChange={(e) => handleFullNameChange('lastName', e.target.value)}
                    />
                  </Form.Item>
                </Col>
              )}
              {!getFieldProps('firstName').hidden && (
                <Col xs={24} sm={6} md={6} lg={6}>
                  <Form.Item
                    name="firstName"
                    label="Имя"
                    required={getFieldProps('firstName').required}
                    rules={getFieldProps('firstName').rules}
                    validateStatus={latinInputError === 'firstName' ? 'error' : ''}
                    help={latinInputError === 'firstName' ? 'Ввод только на кириллице' : ''}
                  >
                    <Input 
                      id={antiAutofillIds.firstName} 
                      name={antiAutofillIds.firstName} 
                      {...noAutoFillProps}
                      onChange={(e) => handleFullNameChange('firstName', e.target.value)}
                    />
                  </Form.Item>
                </Col>
              )}
              {!getFieldProps('middleName').hidden && (
                <Col xs={24} sm={6} md={6} lg={6}>
                  <Form.Item 
                    name="middleName" 
                    label="Отчество"
                    required={getFieldProps('middleName').required}
                    rules={getFieldProps('middleName').rules}
                    validateStatus={latinInputError === 'middleName' ? 'error' : ''}
                    help={latinInputError === 'middleName' ? 'Ввод только на кириллице' : ''}
                  >
                    <Input 
                      id={antiAutofillIds.middleName} 
                      name={antiAutofillIds.middleName} 
                      {...noAutoFillProps}
                      onChange={(e) => handleFullNameChange('middleName', e.target.value)}
                    />
                  </Form.Item>
                </Col>
              )}
            </Row>

            {/* Должность на отдельной строке с гражданством и датой рождения */}
            <Row gutter={16}>
              {!getFieldProps('positionId').hidden && (
                <Col xs={24} sm={8} md={8} lg={8}>
                  <Form.Item
                    name="positionId"
                    label="Должность"
                    required={getFieldProps('positionId').required}
                    rules={getFieldProps('positionId').rules}
                  >
                    <Select
                      placeholder="Выберите должность"
                      allowClear
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        option.children.toLowerCase().includes(input.toLowerCase())
                      }
                      virtual={false}
                      listHeight={400}
                      popupMatchSelectWidth={false}
                      classNames={{ popup: { root: 'dropdown-wide' } }}
                      autoComplete="off"
                    >
                      {positions.map((p) => (
                        <Option key={p.id} value={p.id}>
                          {p.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              )}
              {!getFieldProps('citizenshipId').hidden && (
                <Col xs={24} sm={8} md={8} lg={8}>
                  <Form.Item 
                    name="citizenshipId" 
                    label="Гражданство"
                    required={getFieldProps('citizenshipId').required}
                    rules={getFieldProps('citizenshipId').rules}
                  >
                    <Select
                      placeholder="Выберите гражданство"
                      allowClear
                      showSearch
                      optionFilterProp="children"
                      virtual={false}
                      onChange={handleCitizenshipChange}
                      autoComplete="off"
                    >
                      {citizenships.map((c) => (
                        <Option key={c.id} value={c.id}>
                          {c.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              )}
              {!getFieldProps('birthDate').hidden && (
                <Col xs={24} sm={8} md={8} lg={8}>
                  <Form.Item 
                    name="birthDate" 
                    label="Дата рождения"
                    required={getFieldProps('birthDate').required}
                    rules={[
                      ...getFieldProps('birthDate').rules,
                      {
                        validator: (_, value) => {
                          if (!value) {
                            return Promise.resolve();
                          }
                          const age = dayjs().diff(value, 'year');
                          if (age < 16) {
                            return Promise.reject(new Error('Возраст сотрудника должен быть не менее 16 лет'));
                          }
                          if (age > 80) {
                            return Promise.reject(new Error('Возраст сотрудника должен быть не менее 80 лет'));
                          }
                          return Promise.resolve();
                        }
                      }
                    ]}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      format={DATE_FORMAT}
                      placeholder="ДД.ММ.ГГГГ"
                    />
                  </Form.Item>
                </Col>
              )}
            </Row>

            {/* Дата рождения (мобила) + Страна рождения + Адрес регистрации */}
            <Row gutter={16}>
              {!getFieldProps('birthCountryId').hidden && (
                <Col xs={24} sm={12} md={8} lg={8}>
                  <Form.Item 
                    name="birthCountryId" 
                    label="Страна рождения"
                    required={getFieldProps('birthCountryId').required}
                    rules={getFieldProps('birthCountryId').rules}
                    trigger="onChange"
                  >
                    <Select
                      placeholder="Выберите страну рождения"
                      allowClear
                      showSearch
                      optionFilterProp="children"
                      virtual={false}
                      onChange={() => {
                        // После выбора гарантированно запускаем валидацию
                        setTimeout(() => {
                          if (dataLoaded) {
                            scheduleValidation();
                          }
                        }, 0);
                      }}
                      autoComplete="off"
                    >
                      {citizenships.map((c) => (
                        <Option key={c.id} value={c.id}>
                          {c.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              )}
              {!getFieldProps('registrationAddress').hidden && (
                <Col xs={24} sm={12} md={16} lg={16}>
                  <Form.Item 
                    name="registrationAddress" 
                    label="Адрес регистрации"
                    required={getFieldProps('registrationAddress').required}
                    rules={getFieldProps('registrationAddress').rules}
                  >
                  <Input id={antiAutofillIds.registrationAddress} name={antiAutofillIds.registrationAddress} placeholder="г. Москва, ул. Тверская, д.21, кв.11" {...noAutoFillProps} />
                  </Form.Item>
                </Col>
              )}
            </Row>

            {/* Контакты */}
            <Row gutter={16}>
              {!getFieldProps('email').hidden && (
                <Col xs={24} sm={12} md={12} lg={12}>
                  <Form.Item
                    name="email"
                    label="Email"
                    required={getFieldProps('email').required}
                    rules={[
                      ...getFieldProps('email').rules,
                      { 
                        type: 'email', 
                        message: 'Введите корректный email (например: ivanov@example.com)' 
                      }
                    ]}
                  >
                    <Input placeholder="ivanov@example.com" {...noAutoFillProps} />
                  </Form.Item>
                </Col>
              )}
              {!getFieldProps('phone').hidden && (
                <Col xs={24} sm={12} md={12} lg={12}>
                  <Form.Item 
                    name="phone" 
                    label="Телефон"
                    required={getFieldProps('phone').required}
                    rules={[
                      ...getFieldProps('phone').rules,
                      {
                        pattern: /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/,
                        message: 'Телефон должен быть в формате +7 (999) 123-45-67'
                      }
                    ]}
                    normalize={(value) => {
                      return formatPhoneNumber(value);
                    }}
                  >
                    <Input 
                      id={antiAutofillIds.phone}
                      name={antiAutofillIds.phone}
                      placeholder="+7 (999) 123-45-67"
                      maxLength={18}
                      {...noAutoFillProps}
                    />
                  </Form.Item>
                </Col>
              )}
            </Row>

            {/* Примечания */}
            {!getFieldProps('notes').hidden && (
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item name="notes" label="Примечания" required={getFieldProps('notes').required} rules={getFieldProps('notes').rules}>
                    <TextArea rows={2} {...noAutoFillProps} />
                  </Form.Item>
                </Col>
              </Row>
            )}
          </>
        ),
      },
      // Вкладка 2: Документы
      {
        key: '2',
        label: (
          <span style={getTabStyle()}>
            {getTabIcon('2')}
            Документы
          </span>
        ),
        children: (
          <>
            <Row gutter={16}>
              {!getFieldProps('snils').hidden && (
                <Col xs={24} sm={8} md={8} lg={8}>
                  <Form.Item 
                    name="snils" 
                    label="СНИЛС"
                    required={getFieldProps('snils').required}
                    rules={[
                      ...getFieldProps('snils').rules,
                      {
                        pattern: /^\d{3}-\d{3}-\d{3}\s\d{2}$/,
                        message: 'СНИЛС должен быть в формате XXX-XXX-XXX XX'
                      }
                    ]}
                    normalize={(value) => {
                      return formatSnils(value);
                    }}
                  >
                    <Input maxLength={14} placeholder="123-456-789 00" {...noAutoFillProps} />
                  </Form.Item>
                </Col>
              )}
              {requiresPatent && !getFieldProps('kig').hidden && (
                <Col xs={24} sm={8} md={8} lg={8}>
                  <Form.Item 
                    name="kig" 
                    label="КИГ"
                    required={getFieldProps('kig').required}
                    rules={[
                      ...getFieldProps('kig').rules,
                      {
                        pattern: /^[A-Z]{2}\s\d{7}$/,
                        message: 'КИГ должен быть в формате: AF 1234567'
                      }
                    ]}
                    normalize={(value) => {
                      return formatKig(value);
                    }}
                  >
                    <Input maxLength={10} placeholder="AF 1234567" {...noAutoFillProps} />
                  </Form.Item>
                </Col>
              )}
              {requiresPatent && !getFieldProps('kigEndDate').hidden && (
                <Col xs={24} sm={8} md={8} lg={8}>
                  <Form.Item 
                    name="kigEndDate" 
                    label="Дата окончания КИГ"
                    required={getFieldProps('kigEndDate').required}
                    rules={getFieldProps('kigEndDate').rules}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      format={DATE_FORMAT}
                      placeholder="ДД.ММ.ГГГГ"
                    />
                  </Form.Item>
                </Col>
              )}
            </Row>

            <Row gutter={16}>
              {!getFieldProps('passportType').hidden && (
                <Col xs={24} sm={8} md={8} lg={8}>
                  <Form.Item 
                    name="passportType" 
                    label="Тип паспорта"
                    required={getFieldProps('passportType').required}
                    rules={getFieldProps('passportType').rules}
                  >
                    <Select 
                      placeholder="Выберите тип паспорта" 
                      allowClear 
                      autoComplete="off"
                      onChange={(value) => setPassportType(value)}
                    >
                      <Option value="russian">Российский</Option>
                      <Option value="foreign">Иностранного гражданина</Option>
                    </Select>
                  </Form.Item>
                </Col>
              )}
              {!getFieldProps('passportNumber').hidden && (
                <Col xs={24} sm={8} md={8} lg={8}>
                  <Form.Item 
                    name="passportNumber" 
                    label="№ паспорта"
                    required={getFieldProps('passportNumber').required}
                    rules={getFieldProps('passportNumber').rules}
                    getValueFromEvent={(e) => {
                      // Применяем маску только для российского паспорта
                      if (passportType === 'russian') {
                        return formatRussianPassportNumber(e.target.value);
                      }
                      return e.target.value;
                    }}
                  >
                    <Input 
                      {...noAutoFillProps}
                      placeholder={passportType === 'russian' ? '1234 №123456' : 'Номер паспорта'}
                      maxLength={passportType === 'russian' ? 13 : undefined}
                    />
                  </Form.Item>
                </Col>
              )}
              {!getFieldProps('passportDate').hidden && (
                <Col xs={24} sm={8} md={8} lg={8}>
                  <Form.Item 
                    name="passportDate" 
                    label="Дата выдачи паспорта"
                    required={getFieldProps('passportDate').required}
                    rules={getFieldProps('passportDate').rules}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      format={DATE_FORMAT}
                      placeholder="ДД.ММ.ГГГГ"
                    />
                  </Form.Item>
                </Col>
              )}
            </Row>

            <Row gutter={16}>
              {passportType === 'foreign' && !getFieldProps('passportExpiryDate').hidden && (
                <Col xs={24} sm={12} md={12} lg={12}>
                  <Form.Item 
                    name="passportExpiryDate" 
                    label="Дата окончания паспорта"
                    required={getFieldProps('passportExpiryDate').required}
                    rules={getFieldProps('passportExpiryDate').rules}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      format={DATE_FORMAT}
                      placeholder="ДД.ММ.ГГГГ"
                    />
                  </Form.Item>
                </Col>
              )}
              {!getFieldProps('passportIssuer').hidden && (
                <Col xs={24} sm={passportType === 'foreign' ? 12 : 24} md={passportType === 'foreign' ? 12 : 24} lg={passportType === 'foreign' ? 12 : 24}>
                  <Form.Item 
                    name="passportIssuer" 
                    label="Кем выдан паспорт"
                    required={getFieldProps('passportIssuer').required}
                    rules={getFieldProps('passportIssuer').rules}
                  >
                    <Input placeholder="ГУ МВД России, г.Москва, ул. Тверская, д.20" {...noAutoFillProps} />
                  </Form.Item>
                </Col>
              )}
            </Row>
          </>
        ),
      },
    ];

    // Вкладка 3: Патент (только если требуется)
    if (requiresPatent || checkingCitizenship) {
      items.push({
        key: '3',
        label: (
          <span style={getTabStyle()}>
            {getTabIcon('3')}
            Патент
            {checkingCitizenship && ' (проверка...)'}
          </span>
        ),
        disabled: checkingCitizenship,
        children: checkingCitizenship ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            Проверка необходимости патента...
          </div>
        ) : (
          <>
            <Row gutter={16}>
              {!getFieldProps('patentNumber').hidden && (
                <Col xs={24} sm={8} md={8} lg={8}>
                  <Form.Item 
                    name="patentNumber" 
                    label="Номер патента"
                    required={getFieldProps('patentNumber').required}
                    rules={[
                      ...getFieldProps('patentNumber').rules,
                      {
                        pattern: /^\d{2}\s№\d{10}$/,
                        message: 'Номер патента должен быть в формате XX №1234567890 (где XX - код от 01 до 99)'
                      }
                    ]}
                    normalize={(value) => {
                      return formatPatentNumber(value);
                    }}
                  >
                    <Input 
                      placeholder="01 №1234567890 (код 01-99)"
                      maxLength={15}
                      {...noAutoFillProps}
                    />
                  </Form.Item>
                </Col>
              )}
              {!getFieldProps('patentIssueDate').hidden && (
                <Col xs={24} sm={8} md={8} lg={8}>
                  <Form.Item 
                    name="patentIssueDate" 
                    label="Дата выдачи патента"
                    required={getFieldProps('patentIssueDate').required}
                    rules={getFieldProps('patentIssueDate').rules}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      format={DATE_FORMAT}
                      placeholder="ДД.ММ.ГГГГ"
                    />
                  </Form.Item>
                </Col>
              )}
              {!getFieldProps('blankNumber').hidden && (
                <Col xs={24} sm={8} md={8} lg={8}>
                  <Form.Item 
                    name="blankNumber" 
                    label="Номер бланка"
                    required={getFieldProps('blankNumber').required}
                    rules={[
                      ...getFieldProps('blankNumber').rules,
                      {
                        pattern: /^[А-ЯЁ]{2}\d{7}$/,
                        message: 'Номер бланка должен быть в формате ПР1234567 (кириллица)'
                      }
                    ]}
                    normalize={(value) => {
                      return formatBlankNumber(value);
                    }}
                  >
                    <Input 
                      placeholder="ПР1234567 (буквы - кириллица)"
                      maxLength={9}
                      {...noAutoFillProps}
                    />
                  </Form.Item>
                </Col>
              )}
            </Row>
          </>
        ),
      });
    }

    // Вкладка 4: Файлы (только для существующих сотрудников)
    if (employee?.id) {
      items.push({
        key: '4',
        label: 'Файлы',
        children: <DocumentTypeUploader employeeId={employee.id} readonly={false} onFilesUpdated={handleFilesChange} />,
      });
    }

    // Вкладка 5: Контрагент (без галочки, не участвует в проверке обязательных полей)
    items.push({
      key: '5',
      label: '🏢 Контрагент',
      children: (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="counterpartyId"
              label="Контрагент"
              required
              rules={[
                {
                  required: true,
                  message: 'Выберите контрагента'
                }
              ]}
            >
              <Select
                placeholder="Выберите контрагента"
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
                loading={loadingCounterparties}
                disabled={loadingCounterparties || availableCounterparties.length === 0}
                autoComplete="off"
              >
                {availableCounterparties.map((cp) => (
                  <Option key={cp.id} value={cp.id}>
                    {cp.name} {cp.inn && `(ИНН: ${cp.inn})`}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {availableCounterparties.length === 0 && !loadingCounterparties && (
              <div style={{ 
                padding: 16, 
                background: '#f5f5f5', 
                borderRadius: 4,
                textAlign: 'center',
                color: '#8c8c8c',
                marginTop: 16
              }}>
                📝 Нет доступных контрагентов
              </div>
            )}
          </Col>
        </Row>
      ),
    });

    return items;
  };

  // Контент формы
  const formContent = (
    <>
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
        initialValues={{ gender: 'male' }}
        onFieldsChange={handleFieldsChange}
        validateTrigger={['onChange', 'onBlur']}
        autoComplete="off"
        requiredMark={(label, { required }) => (
          <>
            {label}
            {required && <span style={{ color: '#ff4d4f', marginLeft: 4 }}>*</span>}
          </>
        )}
      >
      <Tabs 
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          // Валидация запустится через useEffect при изменении activeTab
        }}
        style={{ marginTop: 16 }}
        destroyOnHidden={false} // Рендерим все вкладки сразу, чтобы форма видела все поля
        items={getTabsItems()}
      />
      </Form>
    </>
  );

  // Футер с кнопками
  const footer = (
    <Space>
      <Button onClick={handleModalCancel}>
        {employee ? 'Закрыть' : 'Отмена'}
      </Button>
      <Button onClick={handleSaveDraft} loading={loading}>
        Сохранить черновик
      </Button>
      {allTabsValid() ? (
        <Button 
          type="primary" 
          onClick={handleSave} 
          loading={loading}
          style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
        >
          Сохранить
        </Button>
      ) : (
        <Button type="primary" onClick={handleNext}>
          Следующая
        </Button>
      )}
    </Space>
  );

  // Модальное окно
  return (
    <>
      <Modal
        title={employee ? 'Редактировать сотрудника' : 'Добавить сотрудника'}
        open={visible}
        onCancel={handleModalCancel}
        maskClosable={false}
        width={1350}
        footer={footer}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto', overflowX: 'hidden' } }}
      >
        {formContent}
      </Modal>

      {/* Модальное окно перевода сотрудника в другую компанию */}
      <TransferEmployeeModal
        visible={transferModalVisible}
        employee={employee}
        onCancel={() => setTransferModalVisible(false)}
      />
    </>
  );
};

export default EmployeeFormModal;
