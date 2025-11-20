import { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  Checkbox,
  Spin,
  Space,
  Typography,
  Divider,
  Input,
  Collapse,
  DatePicker,
  App,
} from 'antd';
import { FileTextOutlined } from '@ant-design/icons';
import { applicationService } from '../../services/applicationService';
import { counterpartyService } from '../../services/counterpartyService';
import { constructionSiteService } from '../../services/constructionSiteService';
import { useAuthStore } from '../../store/authStore';
import ApplicationFileUpload from './ApplicationFileUpload';
import dayjs from 'dayjs';

const { Text } = Typography;
const { TextArea } = Input;

const ApplicationFormModal = ({ visible, editingId, onCancel, onSuccess }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [contracts, setContracts] = useState({ generalContract: null, subcontracts: [] });
  const [selectedCounterparty, setSelectedCounterparty] = useState(null);
  const [counterpartyType, setCounterpartyType] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  
  const getCurrentUser = useAuthStore(state => state.getCurrentUser);

  useEffect(() => {
    if (visible) {
      fetchSites();
      loadUserCounterparty();
      if (editingId) {
        fetchApplication();
      } else {
        form.resetFields();
      }
    }
  }, [visible, editingId]);

  const loadUserCounterparty = async () => {
    try {
      const { data } = await getCurrentUser();
      const user = data.user;
      const counterpartyId = user.counterpartyId;
      
      if (counterpartyId) {
        setSelectedCounterparty(counterpartyId);
        
        // Загружаем информацию о контрагенте для определения типа
        const counterpartyResponse = await counterpartyService.getById(counterpartyId);
        const counterparty = counterpartyResponse.data.data;
        setCounterpartyType(counterparty.type);
        
        // Загружаем сотрудников
        fetchEmployees(counterpartyId);
      }
    } catch (error) {
      console.error('Error loading user counterparty:', error);
      message.error('Ошибка загрузки данных контрагента');
    }
  };

  const fetchSites = async () => {
    try {
      const { data } = await constructionSiteService.getAll({ limit: 100 });
      setSites(data.data.constructionSites);
    } catch (error) {
      console.error('Error loading sites:', error);
    }
  };

  const fetchApplication = async () => {
    setLoading(true);
    try {
      const { data } = await applicationService.getById(editingId);
      
      // Для режима редактирования: загружаем только сотрудников из заявки
      const applicationEmployees = data.data.employees || [];
      const employeeIds = applicationEmployees.map(emp => emp.id);
      
      form.setFieldsValue({
        counterpartyId: data.data.counterpartyId,
        constructionSiteId: data.data.constructionSiteId,
        subcontractId: data.data.subcontractId,
        employeeIds: employeeIds,
        notes: data.data.notes,
        passValidUntil: data.data.passValidUntil ? dayjs(data.data.passValidUntil) : null,
      });
      setSelectedCounterparty(data.data.counterpartyId);
      setSelectedSite(data.data.constructionSiteId);
      
      // В режиме редактирования отображаем только сотрудников из заявки
      setEmployees(applicationEmployees);
      
      // Загружаем договоры
      await fetchContracts(data.data.counterpartyId, data.data.constructionSiteId);
    } catch (error) {
      message.error('Ошибка загрузки заявки');
    } finally {
      setLoading(false);
    }
  };

  const fetchContracts = async (counterpartyId, siteId) => {
    if (!counterpartyId || !siteId) return;
    
    try {
      const { data } = await applicationService.getContracts(counterpartyId, siteId);
      setContracts(data.data);
    } catch (error) {
      message.error('Ошибка загрузки договоров');
      console.error(error);
    }
  };

  const fetchEmployees = async (counterpartyId) => {
    if (!counterpartyId) return;
    
    setLoadingEmployees(true);
    try {
      const { data } = await applicationService.getEmployees(counterpartyId);
      setEmployees(data.data);
    } catch (error) {
      message.error('Ошибка загрузки сотрудников');
      console.error(error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleSiteChange = (value) => {
    setSelectedSite(value);
    form.setFieldsValue({
      subcontractId: null,
    });
    setContracts({ generalContract: null, subcontracts: [] });
    
    // Загружаем договоры с контрагентом пользователя
    if (selectedCounterparty) {
      fetchContracts(selectedCounterparty, value);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // Преобразуем дату в формат YYYY-MM-DD без учета временной зоны
      const submitData = {
        ...values,
        passValidUntil: values.passValidUntil 
          ? values.passValidUntil.format('YYYY-MM-DD') 
          : null
      };
      
      if (editingId) {
        await applicationService.update(editingId, submitData);
        message.success('Заявка обновлена');
      } else {
        await applicationService.create(submitData);
        message.success('Заявка создана');
      }
      
      onSuccess();
    } catch (error) {
      if (error.errorFields) {
        return;
      }
      message.error(error.response?.data?.message || 'Ошибка при сохранении');
    }
  };

  const isContractor = counterpartyType === 'contractor';

  return (
    <Modal
      title={editingId ? 'Редактировать заявку' : 'Создать заявку'}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      width={800}
      okText={editingId ? 'Сохранить' : 'Создать'}
      cancelText="Отмена"
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="constructionSiteId"
            label="Объект строительства"
            rules={[{ required: true, message: 'Выберите объект' }]}
          >
            <Select
              placeholder="Выберите объект"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
              onChange={handleSiteChange}
            >
              {sites.map(s => (
                <Select.Option key={s.id} value={s.id}>
                  {s.shortName}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {isContractor && contracts.subcontracts.length > 0 && (
            <Form.Item
              name="subcontractId"
              label="Договор подряда"
              rules={[{ required: true, message: 'Выберите договор подряда' }]}
            >
              <Select placeholder="Выберите договор подряда">
                {contracts.subcontracts.map(contract => (
                  <Select.Option key={contract.id} value={contract.id}>
                    {contract.contractNumber} от {contract.contractDate}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {editingId && (
            <>
              <Divider />
              
              <Collapse
                ghost
                expandIconPosition="end"
                items={[
                  {
                    key: 'files',
                    label: (
                      <Space>
                        <FileTextOutlined />
                        <span style={{ fontWeight: 500 }}>Скан заявки</span>
                      </Space>
                    ),
                    children: (
                      <ApplicationFileUpload 
                        applicationId={editingId}
                        readonly={false}
                      />
                    )
                  }
                ]}
              />
            </>
          )}

          <Divider />

          <Form.Item
            name="passValidUntil"
            label="Дата окончания действия пропусков"
            rules={[{ required: true, message: 'Укажите дату окончания действия пропусков' }]}
          >
            <DatePicker 
              style={{ width: '100%' }} 
              format="DD.MM.YYYY"
              placeholder="Выберите дату"
            />
          </Form.Item>

          {loadingEmployees ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin tip="Загрузка сотрудников...">
                <div style={{ minHeight: 50 }} />
              </Spin>
            </div>
          ) : (
            <>
              <Form.Item
                name="employeeIds"
                label="Сотрудники"
                rules={[{ required: true, message: 'Выберите хотя бы одного сотрудника' }]}
              >
                <Checkbox.Group style={{ width: '100%' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {employees.map(emp => (
                      <Checkbox key={emp.id} value={emp.id}>
                        {emp.lastName} {emp.firstName} {emp.middleName || ''} - {emp.position?.name || 'Не указано'}
                      </Checkbox>
                    ))}
                    {employees.length === 0 && selectedCounterparty && !loadingEmployees && (
                      <Text type="secondary">Нет активных сотрудников для выбранного контрагента</Text>
                    )}
                  </Space>
                </Checkbox.Group>
              </Form.Item>
            </>
          )}

          <Form.Item name="notes" label="Примечания">
            <TextArea rows={3} placeholder="Дополнительная информация" />
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default ApplicationFormModal;

