import { Table } from 'antd';
import dayjs from 'dayjs';
import { useEffect } from 'react';

const BiometricTable = ({ employees, applicationNumber, onExport }) => {
  const columns = [
    {
      title: '№',
      key: 'number',
      width: 50,
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Ф.И.О.',
      key: 'fullName',
      width: 200,
      render: (_, record) => 
        `${record.lastName} ${record.firstName} ${record.middleName || ''}`.trim(),
    },
    {
      title: 'КИГ',
      dataIndex: 'kig',
      key: 'kig',
      width: 120,
      render: (value) => value || '-',
    },
    {
      title: 'Гражданство',
      key: 'citizenship',
      width: 150,
      render: (_, record) => record.citizenship?.name || '-',
    },
    {
      title: 'Дата рождения',
      dataIndex: 'birthDate',
      key: 'birthDate',
      width: 120,
      render: (date) => date ? dayjs(date).format('DD.MM.YYYY') : '-',
    },
    {
      title: 'СНИЛС',
      dataIndex: 'snils',
      key: 'snils',
      width: 150,
      render: (value) => value || '-',
    },
    {
      title: 'Должность',
      key: 'position',
      width: 150,
      render: (_, record) => record.position?.name || '-',
    },
    {
      title: 'ИНН сотрудника',
      dataIndex: 'inn',
      key: 'inn',
      width: 130,
      render: (value) => value || '-',
    },
    {
      title: 'Организация',
      key: 'organization',
      width: 200,
      render: (_, record) => record.employeeCounterpartyMappings?.[0]?.counterparty?.name || '-',
    },
    {
      title: 'ИНН организации',
      key: 'organizationInn',
      width: 140,
      render: (_, record) => record.employeeCounterpartyMappings?.[0]?.counterparty?.inn || '-',
    },
    {
      title: 'КПП организации',
      key: 'organizationKpp',
      width: 120,
      render: (_, record) => record.employeeCounterpartyMappings?.[0]?.counterparty?.kpp || '-',
    },
  ];

  // Функция экспорта в Excel (временно отключена)
  const exportToExcel = () => {
    console.log('Excel export will be implemented later');
    // TODO: Implement Excel export after fixing xlsx dependency
  };

  // Передаем функцию экспорта наружу через useEffect
  useEffect(() => {
    if (onExport && typeof onExport === 'function') {
      onExport(exportToExcel);
    }
  }, [onExport]);

  return (
    <Table
      columns={columns}
      dataSource={employees}
      rowKey="id"
      pagination={false}
      scroll={{ x: 1600 }}
      bordered
      size="small"
    />
  );
};

export default BiometricTable;

