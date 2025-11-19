import { Modal, Descriptions, Tag, Button, Tabs, Row, Col, Space, Checkbox } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import EmployeeFileUpload from './EmployeeFileUpload';
import dayjs from 'dayjs';

const DATE_FORMAT = 'DD.MM.YYYY';

// Функция для форматирования телефона при отображении
const formatPhoneDisplay = (phone) => {
  if (!phone) return '-';
  
  // Если телефон уже отформатирован, возвращаем как есть
  if (phone.includes('(') && phone.includes(')')) {
    return phone;
  }
  
  // Убираем все символы кроме цифр
  const phoneNumber = phone.replace(/[^\d]/g, '');
  
  // Форматируем: +7 (123) 456-78-90
  if (phoneNumber.length === 11 && phoneNumber.startsWith('7')) {
    return `+7 (${phoneNumber.slice(1, 4)}) ${phoneNumber.slice(4, 7)}-${phoneNumber.slice(7, 9)}-${phoneNumber.slice(9, 11)}`;
  }
  
  return phone; // Возвращаем как есть, если формат не подходит
};

const EmployeeViewModal = ({ visible, employee, onCancel, onEdit }) => {
  if (!employee) return null;

  // Проверяем, требуется ли патент для данного гражданства
  const requiresPatent = employee.citizenship?.requiresPatent !== false;

  return (
    <Modal
      title="Карточка сотрудника"
      open={visible}
      onCancel={onCancel}
      width={1200}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Закрыть
        </Button>,
        <Button key="edit" type="primary" icon={<EditOutlined />} onClick={onEdit}>
          Редактировать
        </Button>,
      ]}
    >
      <Tabs defaultActiveKey="1" style={{ marginTop: 16 }}>
        {/* Вкладка: Основная информация */}
        <Tabs.TabPane tab="Основная информация" key="1">
          {/* Чекбоксы статусов */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={24}>
              <Space size="large">
                <Checkbox checked={employee.status === 'tb_passed' || employee.status === 'processed'} disabled>
                  <span style={{ color: '#52c41a' }}>Проведен инструктаж ТБ</span>
                </Checkbox>
                <Checkbox checked={employee.statusActive === 'fired'} disabled>
                  <span style={{ color: '#ff4d4f' }}>Уволен</span>
                </Checkbox>
                <Checkbox checked={employee.statusActive === 'inactive'} disabled>
                  <span style={{ color: '#1890ff' }}>Неактивный</span>
                </Checkbox>
              </Space>
            </Col>
          </Row>

          <Descriptions bordered column={3} size="small">
            <Descriptions.Item label="Фамилия" span={1}>
              {employee.lastName}
            </Descriptions.Item>
            <Descriptions.Item label="Имя" span={1}>
              {employee.firstName}
            </Descriptions.Item>
            <Descriptions.Item label="Отчество" span={1}>
              {employee.middleName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Должность" span={1}>
              {employee.position?.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Гражданство" span={1}>
              {employee.citizenship?.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Дата рождения" span={1}>
              {employee.birthDate ? dayjs(employee.birthDate).format(DATE_FORMAT) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Адрес регистрации" span={3}>
              {employee.registrationAddress || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Email" span={1}>
              {employee.email || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Телефон" span={1}>
              {formatPhoneDisplay(employee.phone)}
            </Descriptions.Item>
            <Descriptions.Item label="Примечания" span={1}>
              {employee.notes || '-'}
            </Descriptions.Item>
          </Descriptions>
        </Tabs.TabPane>

        {/* Вкладка: Документы */}
        <Tabs.TabPane tab="Документы" key="2">
          <Descriptions bordered column={3} size="small">
            <Descriptions.Item label="ИНН" span={1}>
              {employee.inn || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="СНИЛС" span={1}>
              {employee.snils || '-'}
            </Descriptions.Item>
            {requiresPatent && (
              <Descriptions.Item label="КИГ" span={1}>
                {employee.kig || '-'}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="№ паспорта" span={1}>
              {employee.passportNumber || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Дата выдачи паспорта" span={1}>
              {employee.passportDate ? dayjs(employee.passportDate).format(DATE_FORMAT) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Кем выдан паспорт" span={1}>
              {employee.passportIssuer || '-'}
            </Descriptions.Item>
          </Descriptions>
        </Tabs.TabPane>

        {/* Вкладка: Патент (только если требуется) */}
        {requiresPatent && (
          <Tabs.TabPane tab="Патент" key="3">
            <Descriptions bordered column={3} size="small">
              <Descriptions.Item label="Номер патента" span={1}>
                {employee.patentNumber || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Дата выдачи патента" span={1}>
                {employee.patentIssueDate ? dayjs(employee.patentIssueDate).format(DATE_FORMAT) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Номер бланка" span={1}>
                {employee.blankNumber || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Tabs.TabPane>
        )}

        {/* Вкладка: Файлы */}
        <Tabs.TabPane tab="Файлы" key="4">
          <EmployeeFileUpload employeeId={employee.id} readonly={true} />
        </Tabs.TabPane>
      </Tabs>
    </Modal>
  );
};

export default EmployeeViewModal;

