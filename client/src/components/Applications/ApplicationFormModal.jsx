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
  Collapse,
  Tag,
} from 'antd';
import { FileOutlined } from '@ant-design/icons';
import { applicationService } from '../../services/applicationService';
import { counterpartyService } from '../../services/counterpartyService';
import { constructionSiteService } from '../../services/constructionSiteService';
import { employeeService } from '../../services/employeeService';
import { useAuthStore } from '../../store/authStore';

const { Text } = Typography;
const { TextArea } = Input;

const ApplicationFormModal = ({ visible, editingId, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeFiles, setEmployeeFiles] = useState({}); // { employeeId: [files] }
  const [selectedFiles, setSelectedFiles] = useState({}); // { employeeId: [fileIds] }
  const [contracts, setContracts] = useState({ generalContract: null, subcontracts: [] });
  const [selectedCounterparty, setSelectedCounterparty] = useState(null);
  const [counterpartyType, setCounterpartyType] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  
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
      form.setFieldsValue({
        counterpartyId: data.data.counterpartyId,
        constructionSiteId: data.data.constructionSiteId,
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

  const fetchEmployeeFiles = async (employeeId) => {
    if (employeeFiles[employeeId]) return; // Уже загружены
    
    setLoadingFiles(true);
    try {
      const { data } = await employeeService.getFiles(employeeId);
      setEmployeeFiles(prev => ({
        ...prev,
        [employeeId]: data.data || []
      }));
    } catch (error) {
      console.error('Error loading employee files:', error);
      setEmployeeFiles(prev => ({
        ...prev,
        [employeeId]: []
      }));
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleEmployeeChange = (checkedValues) => {
    setSelectedEmployeeIds(checkedValues);
    
    // Загружаем файлы для каждого выбранного сотрудника
    checkedValues.forEach(employeeId => {
      fetchEmployeeFiles(employeeId);
    });
    
    // Удаляем выбранные файлы для сотрудников, которые больше не выбраны
    setSelectedFiles(prev => {
      const newSelected = { ...prev };
      Object.keys(newSelected).forEach(empId => {
        if (!checkedValues.includes(empId)) {
          delete newSelected[empId];
        }
      });
      return newSelected;
    });
  };

  const handleFileSelect = (employeeId, fileIds) => {
    setSelectedFiles(prev => ({
      ...prev,
      [employeeId]: fileIds
    }));
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
      
      // Формируем массив selectedFiles для backend
      const selectedFilesArray = [];
      Object.entries(selectedFiles).forEach(([employeeId, fileIds]) => {
        fileIds.forEach(fileId => {
          selectedFilesArray.push({ employeeId, fileId });
        });
      });
      
      const payload = {
        ...values,
        selectedFiles: selectedFilesArray
      };
      
      if (editingId) {
        await applicationService.update(editingId, payload);
        message.success('Заявка обновлена');
      } else {
        await applicationService.create(payload);
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

          <Divider />

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
                <Checkbox.Group style={{ width: '100%' }} onChange={handleEmployeeChange}>
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

              {selectedEmployeeIds.length > 0 && (
                <Form.Item label="Документы сотрудников">
                  <Collapse
                    items={selectedEmployeeIds.map(empId => {
                      const employee = employees.find(e => e.id === empId);
                      const files = employeeFiles[empId] || [];
                      const selectedCount = (selectedFiles[empId] || []).length;
                      
                      return {
                        key: empId,
                        label: (
                          <Space>
                            <span>
                              {employee?.lastName} {employee?.firstName} {employee?.middleName || ''}
                            </span>
                            {selectedCount > 0 && (
                              <Tag color="blue">
                                <FileOutlined /> {selectedCount} файл(ов)
                              </Tag>
                            )}
                          </Space>
                        ),
                        children: (
                          <>
                            {loadingFiles && !employeeFiles[empId] ? (
                              <Spin tip="Загрузка файлов...">
                                <div style={{ minHeight: 50 }} />
                              </Spin>
                            ) : files.length === 0 ? (
                              <Text type="secondary">У сотрудника нет загруженных документов</Text>
                            ) : (
                              <Checkbox.Group
                                style={{ width: '100%' }}
                                value={selectedFiles[empId] || []}
                                onChange={(fileIds) => handleFileSelect(empId, fileIds)}
                              >
                                <Space direction="vertical" style={{ width: '100%' }}>
                                  {files.map(file => (
                                    <Checkbox key={file.id} value={file.id}>
                                      <Space>
                                        <FileOutlined />
                                        <span>{file.fileName}</span>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                          ({(file.fileSize / 1024).toFixed(2)} KB)
                                        </Text>
                                      </Space>
                                    </Checkbox>
                                  ))}
                                </Space>
                              </Checkbox.Group>
                            )}
                          </>
                        )
                      };
                    })}
                  />
                  <Text type="secondary" style={{ fontSize: '12px', marginTop: 8, display: 'block' }}>
                    Выберите документы для каждого сотрудника, которые войдут в заявку
                  </Text>
                </Form.Item>
              )}
            </>
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

