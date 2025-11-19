import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, Row, Col, message, Tabs, Button, Space, Checkbox } from 'antd';
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
const normalizePhoneNumber = (value) => {
  if (!value) return value;
  return value.replace(/[^\d]/g, '');
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

const EmployeeFormModal = ({ visible, employee, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [citizenships, setCitizenships] = useState([]);
  const [constructionSites, setConstructionSites] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false); // Флаг инициализации модального окна
  const [dataLoaded, setDataLoaded] = useState(false); // Новый флаг: данные полностью загружены
  const [activeTab, setActiveTab] = useState('1');
  const [tabsValidation, setTabsValidation] = useState({
    '1': false, // Основная информация
    '2': false, // Документы
    '3': false, // Патент
  });
  const [selectedCitizenship, setSelectedCitizenship] = useState(null);
  const [defaultCounterpartyId, setDefaultCounterpartyId] = useState(null);
  const { user } = useAuthStore();

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
      console.log('⏸️ computeValidation: data not loaded yet, skipping');
      return tabsValidation; // Не валидируем, пока данные не загружены
    }
    
    // ВАЖНО: передаем true, чтобы получить все значения из store, даже для скрытых полей
    const values = form.getFieldsValue(true);
    const validation = {};
    
    // Используем переданное гражданство или текущее из стейта
    const currentCitizenship = citizenshipOverride || selectedCitizenship;
    const currentRequiresPatent = currentCitizenship?.requiresPatent !== false;
    
    // Логируем входящие значения для отладки
    console.log('🔍 computeValidation details:', {
      forceCompute,
      dataLoaded,
      currentCitizenship,
      currentRequiresPatent,
      formValues: values
    });
    
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
        
        if (!isValid) {
          console.log(`❌ Field invalid: Tab ${tabKey}, Field '${field}', Value:`, value);
        }
          
        return { field, value, isValid };
      });
      
      validation[tabKey] = fieldsStatus.every(f => f.isValid);
    });
    
    console.log('🔍 computeValidation result:', validation);
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
        setInitializing(false);
        return;
      }

      // Устанавливаем флаг инициализации
      setInitializing(true);
      setDataLoaded(false);
      setActiveTab('1');
      
      console.log('📝 EmployeeFormModal: opening with employee:', employee);
      
      try {
        // Шаг 1: Загружаем справочники и ждем их завершения
        await Promise.all([
          fetchCitizenships(),
          fetchConstructionSites(),
          fetchPositions(),
          fetchDefaultCounterparty()
        ]);
        
        // Шаг 2: Ждем, пока React обновит состояние citizenships
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('📝 EmployeeFormModal: citizenships loaded', {
          count: citizenships.length,
          employeeCitizenshipId: employee?.citizenshipId
        });
        
        // Локальная переменная для хранения выбранного гражданства в рамках этой функции
        let currentCitizenship = null;

        if (employee) {
          // Шаг 3: СНАЧАЛА устанавливаем гражданство (для определения requiresPatent)
          if (employee.citizenshipId) {
            const citizenship = citizenships.find(c => c.id === employee.citizenshipId);
            console.log('📝 EmployeeFormModal: looking for citizenship', {
              citizenshipId: employee.citizenshipId,
              found: !!citizenship,
              citizenship
            });
            
            if (citizenship) {
              currentCitizenship = citizenship;
              setSelectedCitizenship(citizenship);
              console.log('📝 EmployeeFormModal: citizenship set BEFORE form data', {
                citizenshipId: employee.citizenshipId,
                requiresPatent: citizenship.requiresPatent
              });
              // Ждем, пока React применит изменение selectedCitizenship
              await new Promise(resolve => setTimeout(resolve, 150));
            }
          }
          
          // Шаг 4: Теперь устанавливаем данные сотрудника в форму
          const mapping = employee.employeeCounterpartyMappings?.[0];
          
          const formData = {
            ...employee,
            birthDate: employee.birthDate ? dayjs(employee.birthDate) : null,
            passportDate: employee.passportDate ? dayjs(employee.passportDate) : null,
            patentIssueDate: employee.patentIssueDate ? dayjs(employee.patentIssueDate) : null,
            constructionSiteId: mapping?.constructionSiteId || null,
            isFired: employee.statusActive === 'fired' || employee.statusActive === 'fired_compl',
            isInactive: employee.statusActive === 'inactive',
          };
          
          console.log('📝 EmployeeFormModal: setting form data:', formData);
          form.setFieldsValue(formData);
          
          // Шаг 5: Ждем применения всех изменений
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Шаг 6: Завершаем инициализацию и устанавливаем флаг загрузки
          setInitializing(false);
          setDataLoaded(true);
          console.log('📝 EmployeeFormModal: initialization complete', {
            selectedCitizenship: currentCitizenship,
            requiresPatent: currentCitizenship?.requiresPatent
          });
          
          // Шаг 7: Ждем, пока React применит setDataLoaded(true)
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Шаг 8: Теперь запускаем валидацию (с forceCompute=true)
          // Передаем currentCitizenship явно, чтобы computeValidation использовала актуальные данные
          
          const validation = computeValidation(true, currentCitizenship);
          setTabsValidation(validation);
          console.log('✅ EmployeeFormModal: initial validation complete', {
            validation,
            requiresPatent: currentCitizenship?.requiresPatent,
            selectedCitizenship: currentCitizenship
          });
        } else {
          console.log('📝 EmployeeFormModal: resetting form (no employee)');
          form.resetFields();
          setActiveTab('1');
          setTabsValidation({ '1': false, '2': false, '3': false });
          setSelectedCitizenship(null);
          setInitializing(false);
          setDataLoaded(true);
        }
      } catch (error) {
        console.error('❌ EmployeeFormModal: initialization error', error);
        setInitializing(false);
        setDataLoaded(true);
      }
    };

    initializeModal();
  }, [visible, employee]);

  // Обновляем валидацию при изменении requiresPatent
  useEffect(() => {
    // Не запускаем во время инициализации
    if (initializing) return;
    
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
      console.log('🔍 EmployeeFormModal: Default Counterparty loaded', {
        defaultCounterpartyId: dcId,
        userCounterpartyId: user?.counterpartyId,
        canEditTb: user?.counterpartyId === dcId
      });
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
      Object.keys(values).forEach(key => {
        // Пропускаем чекбоксы статусов - они не сохраняются напрямую
        if (key === 'isFired' || key === 'isInactive') {
          return;
        }
        
        const value = values[key];
        if (value === '' || value === undefined) {
          formattedValues[key] = null;
        } else if (key === 'birthDate' || key === 'passportDate' || key === 'patentIssueDate') {
          formattedValues[key] = value ? value.format('YYYY-MM-DD') : null;
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
      Object.keys(values).forEach(key => {
        // Пропускаем чекбоксы статусов - они не сохраняются напрямую
        if (key === 'isFired' || key === 'isInactive') {
          return;
        }
        
        const value = values[key];
        if (value === '' || value === undefined) {
          formattedValues[key] = null;
        } else if (key === 'birthDate' || key === 'passportDate' || key === 'patentIssueDate') {
          formattedValues[key] = value ? value.format('YYYY-MM-DD') : null;
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

      console.log('💾 Saving employee with statuses:', {
        isFired: values.isFired,
        isInactive: values.isInactive,
        status: formattedValues.status,
        statusActive: formattedValues.statusActive,
        statusCard: 'completed',
        allFormValues: JSON.stringify(formattedValues, null, 2)
      });

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

  return (
    <Modal
      title={employee ? 'Редактировать сотрудника' : 'Добавить сотрудника'}
      open={visible}
      onCancel={handleModalCancel}
      maskClosable={false}
      width={1200}
      footer={
        initializing ? null : ( // Не показываем footer во время инициализации
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
        )
      }
    >
      {initializing ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: 14, color: '#999' }}>Загрузка данных...</div>
        </div>
      ) : (
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
          destroyInactiveTabPane={false} // Рендерим все вкладки сразу, чтобы форма видела все поля
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
                    autoComplete="off"
                    dropdownMatchSelectWidth={false}
                    dropdownStyle={{ minWidth: 300 }}
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
                  <Input maxLength={12} placeholder="10 или 12 цифр" autoComplete="off" />
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
                      { required: true, message: 'Введите КИГ' },
                      {
                        pattern: /^[A-ZА-Я]{2}\s\d{7}$/,
                        message: 'КИГ должен быть в формате АА 1234567'
                      }
                    ]}
                    normalize={(value) => {
                      return formatKig(value);
                    }}
                  >
                    <Input maxLength={10} placeholder="АА 1234567" autoComplete="off" />
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
                    <Input autoComplete="off" />
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
                    <Input autoComplete="off" />
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
      )}
    </Modal>
  );
};

export default EmployeeFormModal;
