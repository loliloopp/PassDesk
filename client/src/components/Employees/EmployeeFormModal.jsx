import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, Row, Col, App, Tabs, Button, Space, Checkbox } from 'antd';
import { CheckCircleFilled, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { citizenshipService } from '../../services/citizenshipService';
import { constructionSiteService } from '../../services/constructionSiteService';
import positionService from '../../services/positionService';
import settingsService from '../../services/settingsService';
import { useAuthStore } from '../../store/authStore';
import EmployeeFileUpload from './EmployeeFileUpload';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;
const DATE_FORMAT = 'DD.MM.YYYY';

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

const EmployeeFormModal = ({ visible, employee, onCancel, onSuccess }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
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
  const { user } = useAuthStore();

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
  const getRequiredFieldsByTab = () => {
    const baseFields = {
      '1': ['lastName', 'firstName', 'positionId', 'citizenshipId', 'birthDate', 'registrationAddress', 'phone'],
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

  const computeValidation = (forceCompute = false, citizenshipOverride = null) => {
    if (!forceCompute && !dataLoaded) {
      return tabsValidation; // Не валидируем, пока данные не загружены
    }
    
    // ВАЖНО: передаем true, чтобы получить все значения из store, даже для скрытых полей
    const values = form.getFieldsValue(true);
    const validation = {};
    
    // Используем переданное гражданство или текущее из стейта
    const currentCitizenship = citizenshipOverride || selectedCitizenship;
    const currentRequiresPatent = currentCitizenship?.requiresPatent !== false;
    
    // Пересчитываем requiredFieldsByTab с учетом актуального гражданства
    const currentRequiredFieldsByTab = {
      '1': ['lastName', 'firstName', 'positionId', 'citizenshipId', 'birthDate', 'registrationAddress', 'phone'],
      '2': currentRequiresPatent 
        ? ['inn', 'snils', 'kig', 'passportNumber', 'passportDate', 'passportIssuer']
        : ['inn', 'snils', 'passportNumber', 'passportDate', 'passportIssuer'],
      '3': ['patentNumber', 'patentIssueDate', 'blankNumber'],
    };
    
    if (!currentRequiresPatent) {
      delete currentRequiredFieldsByTab['3'];
    }
    
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
    const initializeModal = async () => {
      if (!visible) {
        // Сбрасываем состояние при закрытии
        setDataLoaded(false);
        setCheckingCitizenship(false);
        setSelectedCitizenship(null);
        return;
      }

      setDataLoaded(false);
      setActiveTab('1');
      
      try {
        // Загружаем справочники параллельно (без блокировки UI)
        // Загружаем их напрямую, не через state
        const [, , , ] = await Promise.all([
          fetchCitizenships(),
          fetchConstructionSites(),
          fetchPositions(),
          fetchDefaultCounterparty()
        ]);

        if (employee) {
          // Сразу устанавливаем данные сотрудника в форму (без ожидания гражданства)
          const mapping = employee.employeeCounterpartyMappings?.[0];
          
          const formData = {
            ...employee,
            birthDate: employee.birthDate ? dayjs(employee.birthDate) : null,
            passportDate: employee.passportDate ? dayjs(employee.passportDate) : null,
            patentIssueDate: employee.patentIssueDate ? dayjs(employee.patentIssueDate) : null,
            constructionSiteId: mapping?.constructionSiteId || null,
            isFired: employee.statusActive === 'fired' || employee.statusActive === 'fired_compl',
            isInactive: employee.statusActive === 'inactive',
            // Форматируем ИНН, СНИЛС, телефон, КИГ, номер патента и номер бланка при загрузке
            inn: employee.inn ? formatInn(employee.inn) : null,
            snils: employee.snils ? formatSnils(employee.snils) : null,
            phone: employee.phone ? formatPhoneNumber(employee.phone) : null,
            kig: employee.kig ? formatKig(employee.kig) : null,
            patentNumber: employee.patentNumber ? formatPatentNumber(employee.patentNumber) : null,
            blankNumber: employee.blankNumber ? formatBlankNumber(employee.blankNumber) : null,
          };
          
          form.setFieldsValue(formData);
          
          // Теперь асинхронно проверяем гражданство
          setCheckingCitizenship(true);
          
          // Небольшая задержка для обновления состояния citizenships  
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Определяем гражданство после загрузки справочника (используем обновленный state)
          if (employee.citizenshipId && citizenships.length > 0) {
            const citizenship = citizenships.find(c => c.id === employee.citizenshipId);
            
            if (citizenship) {
              setSelectedCitizenship(citizenship);
              // Ждем применения изменения
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
          setActiveTab('1');
          setTabsValidation({ '1': false, '2': false, '3': false });
          setSelectedCitizenship(null);
          setDataLoaded(true);
        }
      } catch (error) {
        console.error('❌ EmployeeFormModal: initialization error', error);
        setCheckingCitizenship(false);
        setDataLoaded(true);
      }
    };

    initializeModal();
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
      const { data } = await citizenshipService.getAll();
      setCitizenships(data.data.citizenships || []);
    } catch (error) {
      console.error('Error loading citizenships:', error);
    }
  };

  const fetchConstructionSites = async () => {
    try {
      const { data } = await constructionSiteService.getAll();
      setConstructionSites(data.data.constructionSites || []);
    } catch (error) {
      console.error('Error loading construction sites:', error);
    }
  };

  const fetchPositions = async () => {
    try {
      const { data } = await positionService.getAll({ limit: 1000 });
      setPositions(data.data.positions || []);
    } catch (error) {
      console.error('Error loading positions:', error);
    }
  };

  const fetchDefaultCounterparty = async () => {
    try {
      const response = await settingsService.getPublicSettings();
      const dcId = response.data.defaultCounterpartyId;
      setDefaultCounterpartyId(dcId);
    } catch (error) {
      console.error('Error loading default counterparty:', error);
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
  const handleFieldsChange = () => {
    if (!dataLoaded) return; // Не запускаем валидацию, пока данные не загружены
    
    if (window.validationTimeout) {
      clearTimeout(window.validationTimeout);
    }
    window.validationTimeout = setTimeout(() => {
      scheduleValidation();
    }, 100);
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
        // Пропускаем чекбоксы статусов и constructionSiteId - они не сохраняются при обновлении сотрудника
        if (key === 'isFired' || key === 'isInactive' || key === 'constructionSiteId') {
          return;
        }
        
        const value = values[key];
        if (value === '' || value === undefined || value === null) {
          formattedValues[key] = null;
        } else if (key === 'birthDate' || key === 'passportDate' || key === 'patentIssueDate') {
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
        } else if (uuidFields.includes(key)) {
          // Для UUID полей - убеждаемся что пустые строки становятся null
          formattedValues[key] = (value && String(value).trim()) ? value : null;
        } else {
          formattedValues[key] = value;
        }
      });

      // Обрабатываем статусы
      // status: сохраняем существующий статус сотрудника, не изменяем его
      formattedValues.status = employee?.status || 'new';
      
      // statusActive: взаимоисключающие статусы
      if (values.isFired) {
        formattedValues.statusActive = 'fired';
      } else if (values.isInactive) {
        formattedValues.statusActive = 'inactive';
      } else {
        formattedValues.statusActive = null;
      }

      formattedValues.statusCard = 'draft';
      formattedValues.isDraft = true; // Флаг для бэкенда и фронтенда
      await onSuccess(formattedValues);
      
      // При сохранении черновика модальное окно НЕ закрывается
      // Если это добавление нового сотрудника - сбрасываем форму
      if (!employee) {
        form.resetFields();
        setActiveTab('1');
        setTabsValidation({ '1': false, '2': false, '3': false });
        setSelectedCitizenship(null);
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
        // Пропускаем чекбоксы статусов и constructionSiteId - они не сохраняются при обновлении сотрудника
        if (key === 'isFired' || key === 'isInactive' || key === 'constructionSiteId') {
          return;
        }
        
        const value = values[key];
        if (value === '' || value === undefined || value === null) {
          formattedValues[key] = null;
        } else if (key === 'birthDate' || key === 'passportDate' || key === 'patentIssueDate') {
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
        } else if (uuidFields.includes(key)) {
          // Для UUID полей - убеждаемся что пустые строки становятся null
          formattedValues[key] = (value && String(value).trim()) ? value : null;
        } else {
          formattedValues[key] = value;
        }
      });

      // Обрабатываем статусы
      // status: сохраняем существующий статус сотрудника, не изменяем его
      formattedValues.status = employee?.status || 'new';
      
      // statusActive: взаимоисключающие статусы
      if (values.isFired) {
        formattedValues.statusActive = 'fired';
      } else if (values.isInactive) {
        formattedValues.statusActive = 'inactive';
      } else {
        formattedValues.statusActive = null;
      }

      formattedValues.statusCard = 'completed';
      await onSuccess(formattedValues);
      
      // Если это добавление нового сотрудника - НЕ закрываем окно
      if (!employee) {
        // Сбрасываем форму для добавления следующего сотрудника
        form.resetFields();
        setActiveTab('1');
        setTabsValidation({ '1': false, '2': false, '3': false });
        setSelectedCitizenship(null);
      } else {
        // Если это редактирование - закрываем окно
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

  // Обработчик закрытия модального окна с подтверждением
  const handleModalCancel = () => {
    // Проверяем, есть ли несохраненные изменения
    const hasChanges = form.isFieldsTouched();
    
    if (hasChanges) {
      Modal.confirm({
        title: 'Закрыть окно?',
        icon: <ExclamationCircleOutlined />,
        content: 'При закрытии окна введенные данные пропадут. Закрыть окно?',
        okText: 'ОК',
        cancelText: 'Отмена',
        onOk: () => {
          onCancel();
        },
      });
    } else {
      // Если изменений нет, просто закрываем
      onCancel();
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
            {/* Чекбоксы статусов - только для существующих сотрудников */}
            {employee?.id && (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={24}>
                  <Space size="large">
                    <Form.Item name="isFired" valuePropName="checked" noStyle>
                      <Checkbox
                        disabled={employee?.employeeCounterpartyMappings?.[0]?.counterpartyId !== user?.counterpartyId}
                        onChange={(e) => {
                          if (e.target.checked) {
                            form.setFieldsValue({ isFired: true, isInactive: false });
                          } else {
                            form.setFieldsValue({ isFired: false });
                          }
                        }}
                        style={{ color: '#ff4d4f', fontWeight: 'bold' }}
                      >
                        Уволен
                      </Checkbox>
                    </Form.Item>
                    <Form.Item name="isInactive" valuePropName="checked" noStyle>
                      <Checkbox
                        disabled={employee?.employeeCounterpartyMappings?.[0]?.counterpartyId !== user?.counterpartyId}
                        onChange={(e) => {
                          if (e.target.checked) {
                            form.setFieldsValue({ isInactive: true, isFired: false });
                          } else {
                            form.setFieldsValue({ isInactive: false });
                          }
                        }}
                        style={{ color: '#1890ff', fontWeight: 'bold' }}
                      >
                        Неактивный
                      </Checkbox>
                    </Form.Item>
                  </Space>
                </Col>
              </Row>
            )}
            
            {/* ФИО и должность - 4 столбца */}
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item
                  name="lastName"
                  label="Фамилия"
                  rules={[{ required: true, message: 'Введите фамилию' }]}
                >
                  <Input autoComplete="off" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="firstName"
                  label="Имя"
                  rules={[{ required: true, message: 'Введите имя' }]}
                >
                  <Input autoComplete="off" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="middleName" label="Отчество">
                  <Input autoComplete="off" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="positionId"
                  label="Должность"
                  rules={[{ required: true, message: 'Выберите должность' }]}
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
                    autoComplete="off"
                    popupMatchSelectWidth={false}
                    classNames={{ popup: { root: 'dropdown-wide' } }}
                  >
                    {positions.map((p) => (
                      <Option key={p.id} value={p.id}>
                        {p.name}
                      </Option>
                    ))}
                  </Select>
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
              <Col span={12}>
                <Form.Item 
                  name="birthDate" 
                  label="Дата рождения"
                  rules={[
                    { required: true, message: 'Введите дату рождения' },
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
                          return Promise.reject(new Error('Возраст сотрудника должен быть не более 80 лет'));
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
            </Row>

            {/* Адрес регистрации */}
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item 
                  name="registrationAddress" 
                  label="Адрес регистрации"
                  rules={[{ required: true, message: 'Введите адрес регистрации' }]}
                >
                  <Input placeholder="г. Москва, ул. Тверская, д.21, кв.11" autoComplete="off" />
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
                  <Input placeholder="ivanov@example.com" autoComplete="off" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="phone" 
                  label="Телефон"
                  rules={[
                    { required: true, message: 'Введите телефон' },
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
                    placeholder="+7 (999) 123-45-67"
                    maxLength={18}
                    autoComplete="off"
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Примечания */}
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="notes" label="Примечания">
                  <TextArea rows={2} autoComplete="off" />
                </Form.Item>
              </Col>
            </Row>
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
              <Col span={requiresPatent ? 8 : 12}>
                <Form.Item 
                  name="inn" 
                  label="ИНН"
                  rules={[
                    { required: true, message: 'Введите ИНН' },
                    {
                      pattern: /^\d{4}-\d{5}-\d{1}$|^\d{4}-\d{6}-\d{2}$/,
                      message: 'ИНН должен быть в формате XXXX-XXXXX-X или XXXX-XXXXXX-XX'
                    }
                  ]}
                  normalize={(value) => {
                    return formatInn(value);
                  }}
                >
                  <Input maxLength={14} placeholder="XXXX-XXXXX-X или XXXX-XXXXXX-XX" autoComplete="off" />
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
                  normalize={(value) => {
                    return formatSnils(value);
                  }}
                >
                  <Input maxLength={14} placeholder="123-456-789 00" autoComplete="off" />
                </Form.Item>
              </Col>
              {requiresPatent && (
                <Col span={8}>
                  <Form.Item 
                    name="kig" 
                    label="КИГ"
                    rules={[
                      { required: true, message: 'Введите КИГ, символы на латинице' },
                      {
                        pattern: /^[A-Z]{2}\s\d{7}$/,
                        message: 'КИГ должен быть в формате: AF 1234567'
                      }
                    ]}
                    normalize={(value) => {
                      return formatKig(value);
                    }}
                  >
                    <Input maxLength={10} placeholder="AF 1234567" autoComplete="off" />
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
                  <Input autoComplete="off" />
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
                  <Input placeholder="ГУ МВД России, г.Москва, ул. Тверская, д.20" autoComplete="off" />
                </Form.Item>
              </Col>
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
              <Col span={8}>
                <Form.Item 
                  name="patentNumber" 
                  label="Номер патента"
                  rules={[
                    { required: true, message: 'Введите номер патента' },
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
                    autoComplete="off"
                  />
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
                  rules={[
                    { required: true, message: 'Введите номер бланка' },
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
                    autoComplete="off"
                  />
                </Form.Item>
              </Col>
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
        children: <EmployeeFileUpload employeeId={employee.id} readonly={false} onFilesChange={handleFilesChange} />,
      });
    }

    return items;
  };

  // Контент формы
  const formContent = (
    <Form 
      form={form} 
      layout="vertical"
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
    <Modal
      title={employee ? 'Редактировать сотрудника' : 'Добавить сотрудника'}
      open={visible}
      onCancel={handleModalCancel}
      maskClosable={false}
      width={1200}
      footer={footer}
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
    >
      {formContent}
    </Modal>
  );
};

export default EmployeeFormModal;
