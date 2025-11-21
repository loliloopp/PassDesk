import { useState, useEffect } from 'react';
import { Form, App } from 'antd';
import { citizenshipService } from '@/services/citizenshipService';
import { constructionSiteService } from '@/services/constructionSiteService';
import positionService from '@/services/positionService';
import settingsService from '@/services/settingsService';
import { useAuthStore } from '@/store/authStore';
import dayjs from 'dayjs';

/**
 * Хук для управления формой сотрудника
 * Содержит общую логику для десктопной и мобильной версий
 */
export const useEmployeeForm = (employee, visible, onSuccess) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const { user } = useAuthStore();

  // Состояния
  const [citizenships, setCitizenships] = useState([]);
  const [constructionSites, setConstructionSites] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingReferences, setLoadingReferences] = useState(false);
  const [selectedCitizenship, setSelectedCitizenship] = useState(null);
  const [defaultCounterpartyId, setDefaultCounterpartyId] = useState(null);

  // Определяем, требуется ли патент для выбранного гражданства
  const requiresPatent = selectedCitizenship?.requiresPatent !== false;

  // Загрузка справочников
  const loadReferences = async () => {
    setLoadingReferences(true);
    try {
      const [citizenshipsRes, sitesRes, positionsRes, settingsRes] = await Promise.all([
        citizenshipService.getAll(),
        constructionSiteService.getAll(),
        positionService.getAll({ limit: 1000 }), // Загружаем все должности
        settingsService.getPublicSettings(),
      ]);

      // Извлекаем данные с учетом структуры API
      const citizenshipsData = citizenshipsRes.data?.data?.citizenships || [];
      const sitesData = sitesRes.data?.data?.constructionSites || [];
      const positionsData = positionsRes.data?.data?.positions || [];
      const settingsData = settingsRes.data || {};

      setCitizenships(citizenshipsData);
      setConstructionSites(sitesData);
      setPositions(positionsData);
      if (settingsData.defaultCounterpartyId) {
        setDefaultCounterpartyId(settingsData.defaultCounterpartyId);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки справочников:', error);
      message.error('Ошибка загрузки справочников');
    } finally {
      setLoadingReferences(false);
    }
  };

  // Проверка гражданства
  const checkCitizenship = (citizenshipId) => {
    if (!citizenshipId) {
      setSelectedCitizenship(null);
      return;
    }

    // Находим гражданство из уже загруженного списка
    const citizenship = citizenships.find(c => c.id === citizenshipId);
    setSelectedCitizenship(citizenship || null);
  };

  // Маски форматирования (можно вынести в отдельный файл)
  const formatPhoneNumber = (value) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    let formattedNumber = phoneNumber;
    if (phoneNumber.startsWith('8')) {
      formattedNumber = '7' + phoneNumber.slice(1);
    }
    if (phoneNumberLength < 2) return formattedNumber;
    if (phoneNumberLength < 5) return `+7 (${formattedNumber.slice(1)}`;
    if (phoneNumberLength < 8) return `+7 (${formattedNumber.slice(1, 4)}) ${formattedNumber.slice(4)}`;
    if (phoneNumberLength < 10) return `+7 (${formattedNumber.slice(1, 4)}) ${formattedNumber.slice(4, 7)}-${formattedNumber.slice(7)}`;
    return `+7 (${formattedNumber.slice(1, 4)}) ${formattedNumber.slice(4, 7)}-${formattedNumber.slice(7, 9)}-${formattedNumber.slice(9, 11)}`;
  };

  const formatSnils = (value) => {
    if (!value) return value;
    const snils = value.replace(/[^\d]/g, '');
    const snilsLength = snils.length;
    if (snilsLength < 4) return snils;
    if (snilsLength < 7) return `${snils.slice(0, 3)}-${snils.slice(3)}`;
    if (snilsLength < 10) return `${snils.slice(0, 3)}-${snils.slice(3, 6)}-${snils.slice(6)}`;
    return `${snils.slice(0, 3)}-${snils.slice(3, 6)}-${snils.slice(6, 9)} ${snils.slice(9, 11)}`;
  };

  const formatKig = (value) => {
    if (!value) return value;
    let kig = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const letters = kig.replace(/[^A-Z]/g, '').slice(0, 2);
    const numbers = kig.replace(/[^0-9]/g, '').slice(0, 7);
    if (letters.length === 0) return '';
    if (numbers.length === 0) return letters;
    return `${letters} ${numbers}`;
  };

  const formatInn = (value) => {
    if (!value) return value;
    const inn = value.replace(/[^\d]/g, '');
    const innLength = inn.length;
    if (innLength <= 4) return inn;
    if (innLength <= 9) return `${inn.slice(0, 4)}-${inn.slice(4)}`;
    if (innLength === 10) return `${inn.slice(0, 4)}-${inn.slice(4, 9)}-${inn.slice(9)}`;
    if (innLength <= 10) return `${inn.slice(0, 4)}-${inn.slice(4, 10)}`;
    return `${inn.slice(0, 4)}-${inn.slice(4, 10)}-${inn.slice(10, 12)}`;
  };

  const formatPatentNumber = (value) => {
    if (!value) return value;
    const cleaned = value.replace(/[^\d№]/g, '');
    const numbersOnly = cleaned.replace(/№/g, '');
    const limited = numbersOnly.slice(0, 12);
    if (limited.length === 0) return '';
    if (limited.length <= 2) return limited;
    return `${limited.slice(0, 2)} №${limited.slice(2)}`;
  };

  const formatBlankNumber = (value) => {
    if (!value) return value;
    let blank = value.toUpperCase().replace(/[^А-ЯЁ0-9]/g, '');
    const letters = blank.replace(/[^А-ЯЁ]/g, '').slice(0, 2);
    const numbers = blank.replace(/[^0-9]/g, '').slice(0, 7);
    return `${letters}${numbers}`;
  };

  // Нормализация данных перед отправкой
  const normalizePhoneNumber = (value) => {
    if (!value) return value;
    const digits = value.replace(/[^\d]/g, '');
    return digits ? `+${digits}` : '';
  };

  const normalizeKig = (value) => {
    if (!value) return value;
    return value.replace(/\s/g, '');
  };

  const normalizePatentNumber = (value) => {
    if (!value) return value;
    return value.replace(/\s/g, '');
  };

  // Нормализация СНИЛС и ИНН - удаляем маску, оставляем только цифры
  const normalizeSnils = (value) => {
    if (!value) return value;
    return value.replace(/[^\d]/g, '');
  };

  const normalizeInn = (value) => {
    if (!value) return value;
    return value.replace(/[^\d]/g, '');
  };

  // Загрузка справочников при монтировании
  useEffect(() => {
    loadReferences();
  }, []);

  // Инициализация данных сотрудника
  const initializeEmployeeData = () => {
    if (employee) {
      const mapping = employee.employeeCounterpartyMappings?.[0];
      const formData = {
        ...employee,
        birthDate: employee.birthDate ? dayjs(employee.birthDate) : null,
        passportDate: employee.passportDate ? dayjs(employee.passportDate) : null,
        patentIssueDate: employee.patentIssueDate ? dayjs(employee.patentIssueDate) : null,
        constructionSiteId: mapping?.constructionSiteId || null,
        isFired: employee.statusActive === 'fired' || employee.statusActive === 'fired_compl',
        isInactive: employee.statusActive === 'inactive',
        inn: employee.inn ? formatInn(employee.inn) : null,
        snils: employee.snils ? formatSnils(employee.snils) : null,
        phone: employee.phone ? formatPhoneNumber(employee.phone) : null,
        kig: employee.kig ? formatKig(employee.kig) : null,
        patentNumber: employee.patentNumber ? formatPatentNumber(employee.patentNumber) : null,
        blankNumber: employee.blankNumber ? formatBlankNumber(employee.blankNumber) : null,
      };
      
      return formData;
    }
    return null;
  };

  // Обработка изменения гражданства
  const handleCitizenshipChange = (citizenshipId) => {
    checkCitizenship(citizenshipId);
  };

  // Сохранение формы
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Нормализация данных
      const normalizedValues = {
        ...values,
        birthDate: values.birthDate ? values.birthDate.format('YYYY-MM-DD') : null,
        passportDate: values.passportDate ? values.passportDate.format('YYYY-MM-DD') : null,
        patentIssueDate: values.patentIssueDate ? values.patentIssueDate.format('YYYY-MM-DD') : null,
        phone: normalizePhoneNumber(values.phone),
        snils: normalizeSnils(values.snils),
        inn: normalizeInn(values.inn),
        kig: normalizeKig(values.kig),
        patentNumber: normalizePatentNumber(values.patentNumber),
        // Статусы
        statusActive: values.isFired ? 'fired' : (values.isInactive ? 'inactive' : 'active'),
      };

      // Убираем временные поля
      delete normalizedValues.isFired;
      delete normalizedValues.isInactive;

      await onSuccess(normalizedValues);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      if (error.errorFields) {
        message.error('Заполните все обязательные поля');
      }
      // Не показываем дополнительную ошибку, если ошибка с сервера - она уже показана в хуке
    }
  };

  // Сохранение черновика без валидации
  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      const values = form.getFieldsValue();

      // Нормализация данных (если заполнены)
      const normalizedValues = {
        ...values,
        birthDate: values.birthDate ? values.birthDate.format('YYYY-MM-DD') : null,
        passportDate: values.passportDate ? values.passportDate.format('YYYY-MM-DD') : null,
        patentIssueDate: values.patentIssueDate ? values.patentIssueDate.format('YYYY-MM-DD') : null,
        phone: values.phone ? normalizePhoneNumber(values.phone) : null,
        snils: values.snils ? normalizeSnils(values.snils) : null,
        inn: values.inn ? normalizeInn(values.inn) : null,
        kig: values.kig ? normalizeKig(values.kig) : null,
        patentNumber: values.patentNumber ? normalizePatentNumber(values.patentNumber) : null,
        // Статусы
        statusActive: values.isFired ? 'fired' : (values.isInactive ? 'inactive' : 'active'),
        isDraft: true, // Помечаем как черновик для фронтенда
      };

      // Убираем временные поля
      delete normalizedValues.isFired;
      delete normalizedValues.isInactive;

      await onSuccess(normalizedValues);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      // Не показываем ошибку здесь, она уже показана в хуке createEmployee
    }
  };

  return {
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
    // Функции форматирования
    formatPhoneNumber,
    formatSnils,
    formatKig,
    formatInn,
    formatPatentNumber,
    formatBlankNumber,
  };
};

