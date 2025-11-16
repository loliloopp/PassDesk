import { Modal, Descriptions, Tag, Button, Tabs } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import EmployeeFileUpload from './EmployeeFileUpload';
import dayjs from 'dayjs';

const DATE_FORMAT = 'DD.MM.YYYY';

const EmployeeViewModal = ({ visible, employee, onCancel, onEdit }) => {
  if (!employee) return null;

  return (
    <Modal
      title="Просмотр сотрудника"
      open={visible}
      onCancel={onCancel}
      width={900}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Закрыть
        </Button>,
        <Button key="edit" type="primary" icon={<EditOutlined />} onClick={onEdit}>
          Редактировать
        </Button>,
      ]}
    >
      <Tabs defaultActiveKey="1">
        <Tabs.TabPane tab="Информация" key="1">
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Фамилия" span={1}>
              {employee.lastName}
            </Descriptions.Item>
            <Descriptions.Item label="Имя" span={1}>
              {employee.firstName}
            </Descriptions.Item>
            <Descriptions.Item label="Отчество" span={2}>
              {employee.middleName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Должность" span={2}>
              {employee.position}
            </Descriptions.Item>
            <Descriptions.Item label="Контрагент" span={2}>
              {employee.counterparty?.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Гражданство" span={2}>
              {employee.citizenship?.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Статус" span={2}>
              <Tag color={employee.isActive ? 'success' : 'default'}>
                {employee.isActive ? 'Активен' : 'Неактивен'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>

          <Descriptions 
            bordered 
            column={2} 
            size="small" 
            style={{ marginTop: 16 }}
            title="Паспортные данные"
          >
            <Descriptions.Item label="Дата рождения" span={1}>
              {employee.birthDate ? dayjs(employee.birthDate).format(DATE_FORMAT) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="№ паспорта" span={1}>
              {employee.passportNumber || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Дата выдачи паспорта" span={1}>
              {employee.passportDate ? dayjs(employee.passportDate).format(DATE_FORMAT) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Кем выдан" span={1}>
              {employee.passportIssuer || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Адрес регистрации" span={2}>
              {employee.registrationAddress || '-'}
            </Descriptions.Item>
          </Descriptions>

          <Descriptions 
            bordered 
            column={2} 
            size="small" 
            style={{ marginTop: 16 }}
            title="Документы"
          >
            <Descriptions.Item label="ИНН" span={1}>
              {employee.inn || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="СНИЛС" span={1}>
              {employee.snils || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="КИГ" span={2}>
              {employee.kig || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Номер патента" span={1}>
              {employee.patentNumber || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Дата выдачи патента" span={1}>
              {employee.patentIssueDate ? dayjs(employee.patentIssueDate).format(DATE_FORMAT) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Номер бланка" span={2}>
              {employee.blankNumber || '-'}
            </Descriptions.Item>
          </Descriptions>

          <Descriptions 
            bordered 
            column={2} 
            size="small" 
            style={{ marginTop: 16 }}
            title="Контакты"
          >
            <Descriptions.Item label="Email" span={1}>
              {employee.email || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Телефон" span={1}>
              {employee.phone || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Примечания" span={2}>
              {employee.notes || '-'}
            </Descriptions.Item>
          </Descriptions>
        </Tabs.TabPane>

        <Tabs.TabPane tab="Документы" key="2">
          <EmployeeFileUpload employeeId={employee.id} readonly={true} />
        </Tabs.TabPane>
      </Tabs>
    </Modal>
  );
};

export default EmployeeViewModal;

