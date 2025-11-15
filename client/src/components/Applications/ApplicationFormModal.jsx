import { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  Checkbox,
  message,
  Spin,
  Space,
  Typography,
  Divider,
  Input,
} from 'antd';
import { applicationService } from '../../services/applicationService';
import { counterpartyService } from '../../services/counterpartyService';
import { constructionSiteService } from '../../services/constructionSiteService';

const { Text } = Typography;
const { TextArea } = Input;

const ApplicationFormModal = ({ visible, editingId, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [counterparties, setCounterparties] = useState([]);
  const [sites, setSites] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [contracts, setContracts] = useState({ generalContract: null, subcontracts: [] });
  const [selectedCounterparty, setSelectedCounterparty] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchCounterparties();
      fetchSites();
      if (editingId) {
        fetchApplication();
      } else {
        form.resetFields();
      }
    }
  }, [visible, editingId]);

  const fetchCounterparties = async () => {
    try {
      const { data } = await counterpartyService.getAll({ limit: 100 });
      setCounterparties(data.data.counterparties);
    } catch (error) {
      console.error('Error loading counterparties:', error);
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
      form.setFieldsValue({
        counterpartyId: data.data.counterpartyId,
        constructionSiteId: data.data.constructionSiteId,
        generalContractId: data.data.generalContractId,
        subcontractId: data.data.subcontractId,
        employeeIds: data.data.employeeIds,
        status: data.data.status,
        notes: data.data.notes,
      });
      setSelectedCounterparty(data.data.counterpartyId);
      setSelectedSite(data.data.constructionSiteId);
      
      // Загружаем договоры и сотрудников
      await fetchContracts(data.data.counterpartyId, data.data.constructionSiteId);
      await fetchEmployees(data.data.counterpartyId);
    } catch (error) {
      message.error('Ошибка загрузки заявки');
    } finally {
      setLoading(false);
    }
  };

  const fetchContracts = async (counterpartyId, siteId) => {
    if (!counterpartyId || !siteId) return;
    
    setLoadingContracts(true);
    try {
      const { data } = await applicationService.getContracts(counterpartyId, siteId);
      setContracts(data.data);
      
      // Автоматически устанавливаем договор генподряда
      if (data.data.generalContract) {
        form.setFieldsValue({
          generalContractId: data.data.generalContract.id
        });
      }
    } catch (error) {
      message.error('Ошибка загрузки договоров');
      console.error(error);
    } finally {
      setLoadingContracts(false);
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

  const handleCounterpartyChange = (value) => {
    setSelectedCounterparty(value);
    form.setFieldsValue({
      generalContractId: null,
      subcontractId: null,
      employeeIds: [],
    });
    setContracts({ generalContract: null, subcontracts: [] });
    setEmployees([]);
    
    // Загружаем сотрудников сразу
    fetchEmployees(value);
    
    // Если выбран объект, загружаем договоры
    if (selectedSite) {
      fetchContracts(value, selectedSite);
    }
  };

  const handleSiteChange = (value) => {
    setSelectedSite(value);
    form.setFieldsValue({
      generalContractId: null,
      subcontractId: null,
    });
    setContracts({ generalContract: null, subcontracts: [] });
    
    // Если выбран контрагент, загружаем договоры
    if (selectedCounterparty) {
      fetchContracts(selectedCounterparty, value);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingId) {
        await applicationService.update(editingId, values);
        message.success('Заявка обновлена');
      } else {
        await applicationService.create(values);
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

  const counterpartyType = counterparties.find(c => c.id === selectedCounterparty)?.type;
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
            name="counterpartyId"
            label="Контрагент"
            rules={[{ required: true, message: 'Выберите контрагента' }]}
          >
            <Select
              placeholder="Выберите контрагента"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
              onChange={handleCounterpartyChange}
            >
              {counterparties.map(c => (
                <Select.Option key={c.id} value={c.id}>
                  {c.name} ({c.type === 'general_contractor' ? 'Генподрядчик' : c.type === 'contractor' ? 'Подрядчик' : 'Заказчик'})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

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

          {loadingContracts ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin tip="Загрузка договоров..." />
            </div>
          ) : (
            <>
              <Form.Item
                name="generalContractId"
                label="Договор генподряда"
                rules={[{ required: true, message: 'Требуется договор генподряда' }]}
              >
                <Select placeholder="Автоматически определяется" disabled={!contracts.generalContract}>
                  {contracts.generalContract && (
                    <Select.Option value={contracts.generalContract.id}>
                      {contracts.generalContract.contractNumber} от {contracts.generalContract.contractDate}
                    </Select.Option>
                  )}
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

              {!contracts.generalContract && selectedCounterparty && selectedSite && !loadingContracts && (
                <Text type="warning">
                  Не найден договор генподряда для выбранного контрагента и объекта
                </Text>
              )}
            </>
          )}

          <Divider />

          {loadingEmployees ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin tip="Загрузка сотрудников..." />
            </div>
          ) : (
            <Form.Item
              name="employeeIds"
              label="Сотрудники"
              rules={[{ required: true, message: 'Выберите хотя бы одного сотрудника' }]}
            >
              <Checkbox.Group style={{ width: '100%' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {employees.map(emp => (
                    <Checkbox key={emp.id} value={emp.id}>
                      {emp.lastName} {emp.firstName} {emp.middleName || ''} - {emp.position}
                    </Checkbox>
                  ))}
                  {employees.length === 0 && selectedCounterparty && !loadingEmployees && (
                    <Text type="secondary">Нет активных сотрудников для выбранного контрагента</Text>
                  )}
                </Space>
              </Checkbox.Group>
            </Form.Item>
          )}

          {editingId && (
            <Form.Item
              name="status"
              label="Статус"
              rules={[{ required: true, message: 'Выберите статус' }]}
            >
              <Select>
                <Select.Option value="draft">Черновик</Select.Option>
                <Select.Option value="submitted">Подана</Select.Option>
                <Select.Option value="approved">Одобрена</Select.Option>
                <Select.Option value="rejected">Отклонена</Select.Option>
              </Select>
            </Form.Item>
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

