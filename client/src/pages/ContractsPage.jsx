import { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Select, DatePicker, Input, message, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { contractService } from '../services/contractService';
import { counterpartyService } from '../services/counterpartyService';
import { constructionSiteService } from '../services/constructionSiteService';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const DATE_FORMAT = 'DD.MM.YYYY';

const ContractsPage = () => {
  const [data, setData] = useState([]);
  const [counterparties, setCounterparties] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
    fetchCounterparties();
    fetchSites();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: response } = await contractService.getAll();
      setData(response.data.contracts);
    } catch (error) {
      message.error('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

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

  const handleSubmit = async (values) => {
    try {
      const data = {
        ...values,
        contractDate: values.contractDate.format('YYYY-MM-DD')
      };
      if (editingId) {
        await contractService.update(editingId, data);
        message.success('Договор обновлен');
      } else {
        await contractService.create(data);
        message.success('Договор создан');
      }
      setModalVisible(false);
      fetchData();
    } catch (error) {
      message.error('Ошибка при сохранении');
    }
  };

  const columns = [
    { title: 'Номер', dataIndex: 'contractNumber', key: 'contractNumber' },
    { 
      title: 'Дата', 
      dataIndex: 'contractDate', 
      key: 'contractDate',
      render: (date) => date ? dayjs(date).format(DATE_FORMAT) : '-'
    },
    { 
      title: 'Тип', 
      dataIndex: 'type',
      render: (type) => (
        <Tag color={type === 'general_contract' ? 'blue' : 'green'}>
          {type === 'general_contract' ? 'Генподряд' : 'Подряд'}
        </Tag>
      )
    },
    { 
      title: 'Объект',
      dataIndex: ['constructionSite', 'shortName'],
      key: 'site'
    },
    {
      title: 'Действия',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => {
            setEditingId(record.id);
            form.setFieldsValue({
              ...record,
              contractDate: dayjs(record.contractDate)
            });
            setModalVisible(true);
          }} />
          <Button icon={<DeleteOutlined />} danger onClick={() => {
            Modal.confirm({
              title: 'Удалить договор?',
              onOk: async () => {
                await contractService.delete(record.id);
                message.success('Договор удален');
                fetchData();
              }
            });
          }} />
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h1>Договора</h1>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => {
            setEditingId(null);
            form.resetFields();
            setModalVisible(true);
          }}>
            Добавить
          </Button>
        </div>

        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} />
      </Space>

      <Modal
        title={editingId ? 'Редактировать договор' : 'Добавить договор'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="contractNumber" label="Номер договора" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="contractDate" label="Дата договора" rules={[{ required: true, message: 'Введите дату договора' }]}>
            <DatePicker 
              style={{ width: '100%' }} 
              format={DATE_FORMAT}
              placeholder="ДД.ММ.ГГГГ"
            />
          </Form.Item>
          <Form.Item name="type" label="Тип" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="general_contract">Договор генподряда</Select.Option>
              <Select.Option value="subcontract">Договор подряда</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="constructionSiteId" label="Объект строительства" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children">
              {sites.map(site => (
                <Select.Option key={site.id} value={site.id}>{site.shortName}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="counterparty1Id" label="Контрагент 1" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children">
              {counterparties.map(cp => (
                <Select.Option key={cp.id} value={cp.id}>{cp.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="counterparty2Id" label="Контрагент 2" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children">
              {counterparties.map(cp => (
                <Select.Option key={cp.id} value={cp.id}>{cp.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ContractsPage;

