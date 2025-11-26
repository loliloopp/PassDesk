import { Drawer, Form, Input, Select, DatePicker, Typography, Collapse, Button, Space } from 'antd';
import { CloseOutlined, EditOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useEmployeeForm } from './useEmployeeForm';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const DATE_FORMAT = 'DD.MM.YYYY';

/**
 * Боковая панель просмотра сотрудника (только чтение)
 * Используется на мобильных устройствах
 * Показывает информацию сотрудника в режиме только просмотра
 */
const EmployeeViewDrawer = ({ 
  visible, 
  employee, 
  onClose,
  onEdit 
}) => {
  const [form] = Form.useForm();
  const [activeKeys, setActiveKeys] = useState(['personal', 'documents']);
  
  const {
    citizenships,
    constructionSites,
    positions,
    selectedCitizenship,
    requiresPatent,
    defaultCounterpartyId,
    user,
  } = useEmployeeForm(employee, false);

  // Инициализируем форму с данными сотрудника
  useEffect(() => {
    if (employee) {
      const formData = {
        lastName: employee.lastName,
        firstName: employee.firstName,
        middleName: employee.middleName,
        positionId: employee.positionId,
        citizenshipId: employee.citizenshipId,
        birthDate: employee.birthDate ? dayjs(employee.birthDate) : null,
        registrationAddress: employee.registrationAddress,
        phone: employee.phone,
        note: employee.note,
        inn: employee.inn,
        snils: employee.snils,
        kig: employee.kig,
        passportNumber: employee.passportNumber,
        passportDate: employee.passportDate ? dayjs(employee.passportDate) : null,
        passportIssuer: employee.passportIssuer,
        patentNumber: employee.patentNumber,
        patentIssueDate: employee.patentIssueDate ? dayjs(employee.patentIssueDate) : null,
        blankNumber: employee.blankNumber,
        isFired: employee.isFired,
        isInactive: employee.isInactive,
      };
      form.setFieldsValue(formData);
    }
  }, [employee, form]);

  // Проверяем права доступа
  const canEditConstructionSite = user?.counterpartyId === defaultCounterpartyId && user?.role !== 'user';

  // Получаем название должности
  const getPositionName = () => {
    if (!employee?.positionId || !positions.length) return employee?.positionId;
    const position = positions.find(p => p.id === employee.positionId);
    return position?.name || employee.positionId;
  };

  // Получаем название гражданства
  const getCitizenshipName = () => {
    if (!employee?.citizenshipId || !citizenships.length) return employee?.citizenshipId;
    const citizenship = citizenships.find(c => c.id === employee.citizenshipId);
    return citizenship?.name || employee.citizenshipId;
  };

  // Формируем items для Collapse
  const collapseItems = [
    {
      key: 'personal',
      label: <Title level={5} style={{ margin: 0 }}>📋 Личная информация</Title>,
      children: (
        <>
          <Form.Item
            label="Фамилия"
            name="lastName"
          >
            <Input disabled size="large" />
          </Form.Item>

          <Form.Item
            label="Имя"
            name="firstName"
          >
            <Input disabled size="large" />
          </Form.Item>

          <Form.Item label="Отчество" name="middleName">
            <Input disabled size="large" placeholder={employee?.middleName ? undefined : ""} />
          </Form.Item>

          <Form.Item
            label="Должность"
            name="positionId"
          >
            <Select 
              placeholder="Выберите должность" 
              size="large"
              disabled
            >
              {positions.map((pos) => (
                <Select.Option key={pos.id} value={pos.id}>
                  {pos.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Гражданство"
            name="citizenshipId"
          >
            <Select
              placeholder="Выберите гражданство"
              size="large"
              disabled
            >
              {citizenships.map((c) => (
                <Select.Option key={c.id} value={c.id}>
                  {c.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Дата рождения"
            name="birthDate"
          >
            <DatePicker
              placeholder="Выберите дату"
              format={DATE_FORMAT}
              size="large"
              style={{ width: '100%' }}
              disabled
            />
          </Form.Item>

          <Form.Item
            label="Адрес регистрации"
            name="registrationAddress"
          >
            <TextArea placeholder="г. Москва, ул. Ленина, д. 1" rows={3} size="large" disabled />
          </Form.Item>

          <Form.Item
            label="Телефон"
            name="phone"
          >
            <Input placeholder={employee?.phone ? undefined : ""} size="large" disabled />
          </Form.Item>

          <Form.Item label="Примечание" name="note">
            <TextArea rows={2} placeholder={employee?.note ? undefined : ""} size="large" disabled />
          </Form.Item>
        </>
      ),
    },
    {
      key: 'documents',
      label: <Title level={5} style={{ margin: 0 }}>📄 Документы</Title>,
      children: (
        <>
          <Form.Item
            label="ИНН"
            name="inn"
          >
            <Input placeholder={employee?.inn ? undefined : ""} size="large" disabled />
          </Form.Item>

          <Form.Item
            label="СНИЛС"
            name="snils"
          >
            <Input placeholder={employee?.snils ? undefined : ""} size="large" disabled />
          </Form.Item>

          {requiresPatent && (
            <Form.Item
              label="КИГ (Карта иностранного гражданина)"
              name="kig"
            >
              <Input placeholder={employee?.kig ? undefined : ""} size="large" maxLength={10} disabled />
            </Form.Item>
          )}

          <Form.Item
            label="Паспорт (серия и номер)"
            name="passportNumber"
          >
            <Input placeholder={employee?.passportNumber ? undefined : ""} size="large" disabled />
          </Form.Item>

          <Form.Item
            label="Дата выдачи паспорта"
            name="passportDate"
          >
            <DatePicker
              placeholder="Выберите дату"
              format={DATE_FORMAT}
              size="large"
              style={{ width: '100%' }}
              disabled
            />
          </Form.Item>

          <Form.Item
            label="Кем выдан паспорт"
            name="passportIssuer"
          >
            <TextArea placeholder={employee?.passportIssuer ? undefined : ""} rows={3} size="large" disabled />
          </Form.Item>
        </>
      ),
    },
  ];

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
          >
            <Input placeholder={employee?.patentNumber ? undefined : ""} size="large" disabled />
          </Form.Item>

          <Form.Item
            label="Дата выдачи патента"
            name="patentIssueDate"
          >
            <DatePicker
              placeholder="Выберите дату"
              format={DATE_FORMAT}
              size="large"
              style={{ width: '100%' }}
              disabled
            />
          </Form.Item>

          <Form.Item
            label="Номер бланка"
            name="blankNumber"
          >
            <Input placeholder={employee?.blankNumber ? undefined : ""} size="large" maxLength={9} disabled />
          </Form.Item>
        </>
      ),
    });
  }

  // Блок 4: Статусы (если редактирование)
  if (employee?.id && canEditConstructionSite) {
    collapseItems.push({
      key: 'statuses',
      label: <Title level={5} style={{ margin: 0 }}>⚙️ Статусы</Title>,
      children: (
        <>
          <div style={{ padding: '8px 0' }}>
            <Text>
              Уволен: <strong>{employee.isFired ? 'Да' : 'Нет'}</strong>
            </Text>
          </div>
          <div style={{ padding: '8px 0' }}>
            <Text>
              Неактивен (временно): <strong>{employee.isInactive ? 'Да' : 'Нет'}</strong>
            </Text>
          </div>
        </>
      ),
    });
  }

  return (
    <Drawer
      title={`${employee?.lastName} ${employee?.firstName} ${employee?.middleName || ''}`}
      placement="right"
      onClose={onClose}
      open={visible}
      closeIcon={<CloseOutlined />}
      width={320}
      styles={{
        body: { padding: '16px', overflow: 'auto' }
      }}
      footer={
        <Space style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>
            Закрыть
          </Button>
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            onClick={onEdit}
          >
            Редактировать
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Collapse
          activeKey={activeKeys}
          onChange={setActiveKeys}
          ghost
          items={collapseItems}
        />
      </Form>
    </Drawer>
  );
};

export default EmployeeViewDrawer;

