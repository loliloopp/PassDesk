import { useMemo } from 'react';
import { Button, Tag, Tooltip, Space, Popconfirm, Select, Badge } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
} from '@ant-design/icons';
import { getStatusPriority } from '@/entities/employee';

/**
 * Создание конфигурации колонок для таблицы сотрудников
 * Мемоизировано для предотвращения лишних ререндеров
 */
export const useEmployeeColumns = ({
  departments,
  onEdit,
  onView,
  onDelete,
  onViewFiles,
  onDepartmentChange,
  canExport,
  canDeleteEmployee,
  uniqueFilters,
}) => {
  return useMemo(() => {
    const columns = [
      {
        title: 'ФИО',
        key: 'fullName',
        width: 230,
        render: (_, record) => (
          <div style={{ whiteSpace: 'normal', wordBreak: 'normal', overflowWrap: 'break-word' }}>
            {record.lastName} {record.firstName} {record.middleName || ''}
          </div>
        ),
        sorter: (a, b) => a.lastName.localeCompare(b.lastName),
      },
      {
        title: 'Должность',
        dataIndex: ['position', 'name'],
        key: 'position',
        width: 186,
        ellipsis: false,
        render: (name) => (
          <div
            style={{
              whiteSpace: 'normal',
              wordBreak: 'keep-all',
              overflowWrap: 'break-word',
              lineHeight: '1.4',
            }}
          >
            {name || '-'}
          </div>
        ),
        sorter: (a, b) => {
          const aPos = a.position?.name || '';
          const bPos = b.position?.name || '';
          return aPos.localeCompare(bPos);
        },
        filters: uniqueFilters.positions.map((pos) => ({ text: pos, value: pos })),
        onFilter: (value, record) => record.position?.name === value,
      },
      {
        title: 'Подразделение',
        key: 'department',
        width: 180,
        ellipsis: false,
        render: (_, record) => {
          const mappings = record.employeeCounterpartyMappings || [];
          const currentMapping = mappings[0];
          const currentDepartmentId = currentMapping?.departmentId;
          const currentDepartmentName = currentMapping?.department?.name;

          return (
            <Select
              value={
                currentDepartmentId
                  ? { label: currentDepartmentName, value: currentDepartmentId }
                  : undefined
              }
              placeholder="Выберите подразделение"
              style={{ width: '100%' }}
              className="department-select"
              popupMatchSelectWidth={false}
              onChange={(option) => onDepartmentChange(record.id, option.value)}
              allowClear
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
              labelInValue
            >
              {departments.map((dept) => (
                <Select.Option 
                  key={dept.id} 
                  value={dept.id}
                  label={dept.name}
                >
                  {dept.name}
                </Select.Option>
              ))}
            </Select>
          );
        },
        sorter: (a, b) => {
          const aDept = a.employeeCounterpartyMappings?.[0]?.department?.name || '';
          const bDept = b.employeeCounterpartyMappings?.[0]?.department?.name || '';
          return aDept.localeCompare(bDept);
        },
        filters: uniqueFilters.departments.map((dept) => ({ text: dept, value: dept })),
        onFilter: (value, record) => {
          const mappings = record.employeeCounterpartyMappings || [];
          return mappings.some((m) => m.department?.name === value);
        },
      },
      // Столбец "Контрагент" виден только для пользователей контрагента по умолчанию
      ...(canExport
        ? [
            {
              title: 'Контрагент',
              key: 'counterparty',
              width: 168,
              ellipsis: false,
              render: (_, record) => {
                const mappings = record.employeeCounterpartyMappings || [];
                if (mappings.length === 0) return '-';
                const counterparties = [
                  ...new Set(mappings.map((m) => m.counterparty?.name).filter(Boolean)),
                ];
                const text = counterparties.join(', ') || '-';
                return (
                  <div
                    style={{
                      whiteSpace: 'normal',
                      wordBreak: 'keep-all',
                      overflowWrap: 'break-word',
                      lineHeight: '1.4',
                    }}
                  >
                    {text}
                  </div>
                );
              },
              sorter: (a, b) => {
                const aCounterparty = a.employeeCounterpartyMappings?.[0]?.counterparty?.name || '';
                const bCounterparty = b.employeeCounterpartyMappings?.[0]?.counterparty?.name || '';
                return aCounterparty.localeCompare(bCounterparty);
              },
              filters: uniqueFilters.counterparties.map((cp) => ({ text: cp, value: cp })),
              onFilter: (value, record) => {
                const mappings = record.employeeCounterpartyMappings || [];
                return mappings.some((m) => m.counterparty?.name === value);
              },
            },
          ]
        : []),
      {
        title: 'Объект',
        key: 'constructionSite',
        width: 150,
        render: (_, record) => {
          const mappings = record.employeeCounterpartyMappings || [];
          const siteMappings = mappings.filter((m) => m.constructionSite);

          if (siteMappings.length === 0) {
            return '-';
          }

          return (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                whiteSpace: 'normal',
                wordBreak: 'normal',
                overflowWrap: 'break-word',
              }}
            >
              {siteMappings.map((mapping, index) => (
                <div key={index}>
                  {mapping.constructionSite?.shortName || mapping.constructionSite?.name}
                </div>
              ))}
            </div>
          );
        },
        sorter: (a, b) => {
          const aSite =
            a.employeeCounterpartyMappings?.find((m) => m.constructionSite)?.constructionSite
              ?.shortName ||
            a.employeeCounterpartyMappings?.find((m) => m.constructionSite)?.constructionSite
              ?.name ||
            '';
          const bSite =
            b.employeeCounterpartyMappings?.find((m) => m.constructionSite)?.constructionSite
              ?.shortName ||
            b.employeeCounterpartyMappings?.find((m) => m.constructionSite)?.constructionSite
              ?.name ||
            '';
          return aSite.localeCompare(bSite);
        },
        filters: uniqueFilters.constructionSites?.map((site) => ({ text: site, value: site })) || [],
        onFilter: (value, record) => {
          const mappings = record.employeeCounterpartyMappings || [];
          return mappings.some((m) => {
            const siteName = m.constructionSite?.shortName || m.constructionSite?.name;
            return siteName === value;
          });
        },
      },
      {
        title: 'Гражданство',
        dataIndex: ['citizenship', 'name'],
        key: 'citizenship',
        width: 150,
        ellipsis: true,
        render: (name) => name || '-',
        sorter: (a, b) => {
          const aCit = a.citizenship?.name || '';
          const bCit = b.citizenship?.name || '';
          return aCit.localeCompare(bCit);
        },
        filters: uniqueFilters.citizenships.map((cit) => ({ text: cit, value: cit })),
        onFilter: (value, record) => record.citizenship?.name === value,
      },
      {
        title: 'Заполнен',
        key: 'statusCard',
        width: 130,
        align: 'center',
        render: (_, record) => {
          const isCompleted = record.statusCard === 'completed';

          return (
            <Tooltip
              title={
                isCompleted
                  ? 'Все обязательные поля заполнены'
                  : 'Не все обязательные поля заполнены'
              }
            >
              {isCompleted ? (
                <CheckCircleFilled style={{ fontSize: 20, color: '#52c41a' }} />
              ) : (
                <CloseCircleFilled style={{ fontSize: 20, color: '#ff4d4f' }} />
              )}
            </Tooltip>
          );
        },
        sorter: (a, b) => {
          const aCompleted = a.statusCard === 'completed' ? 1 : 0;
          const bCompleted = b.statusCard === 'completed' ? 1 : 0;
          return aCompleted - bCompleted;
        },
        filters: [
          { text: 'Заполнен', value: 'completed' },
          { text: 'Не заполнен', value: 'draft' },
        ],
        onFilter: (value, record) => record.statusCard === value,
      },
      {
        title: 'Файлы',
        key: 'files',
        width: 80,
        align: 'center',
        render: (_, record) => {
          const filesCount = record.filesCount || 0;
          return (
            <Tooltip title={filesCount > 0 ? `Просмотр файлов (${filesCount})` : 'Нет файлов'}>
              <Badge 
                count={filesCount > 0 ? filesCount : 0}
                offset={[-8, 4]}
                style={{ 
                  backgroundColor: filesCount > 0 ? '#ff7a45' : '#d9d9d9',
                  fontSize: '10px',
                  height: '16px',
                  lineHeight: '16px',
                  minWidth: '16px',
                  padding: '0 3px'
                }}
              >
                <Button
                  type="text"
                  icon={<FileOutlined />}
                  onClick={() => onViewFiles(record)}
                  disabled={filesCount === 0}
                  style={{
                    color: filesCount > 0 ? '#1890ff' : '#d9d9d9',
                    padding: '4px 8px',
                  }}
                />
              </Badge>
            </Tooltip>
          );
        },
        sorter: (a, b) => (a.filesCount || 0) - (b.filesCount || 0),
      },
      {
        title: 'Статус',
        key: 'status',
        width: 120,
        render: (_, record) => {
          // Приоритет: statusSecure (Заблокирован) > statusActive (Уволен/Неактивный) > status (Новый/Проведен ТБ/Обработан)

          if (record.statusSecure === 'block' || record.statusSecure === 'block_compl') {
            return <Tag color="red">Заблокирован</Tag>;
          }

          if (record.statusActive === 'fired') {
            return <Tag color="red">Уволен</Tag>;
          }
          if (record.statusActive === 'inactive') {
            return <Tag color="blue">Неактивный</Tag>;
          }

          const statusMap = {
            new: { text: 'Новый', color: 'default' },
            tb_passed: { text: 'Проведен ТБ', color: 'green' },
            processed: { text: 'Обработан', color: 'success' },
          };

          const statusInfo = statusMap[record.status] || { text: '-', color: 'default' };
          return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
        },
        sorter: (a, b) => getStatusPriority(a) - getStatusPriority(b),
        filters: [
          { text: 'Заблокирован', value: 'blocked' },
          { text: 'Уволен', value: 'fired' },
          { text: 'Неактивный', value: 'inactive' },
          { text: 'Новый', value: 'new' },
          { text: 'Проведен ТБ', value: 'tb_passed' },
          { text: 'Обработан', value: 'processed' },
        ],
        onFilter: (value, record) => {
          if (value === 'blocked') {
            return record.statusSecure === 'block' || record.statusSecure === 'block_compl';
          }
          if (value === 'fired' || value === 'inactive') {
            return record.statusActive === value;
          }
          return (
            (!record.statusSecure || record.statusSecure === 'allow') &&
            !record.statusActive &&
            record.status === value
          );
        },
      },
      {
        title: 'Действия',
        key: 'actions',
        width: 150,
        render: (_, record) => (
          <Space>
            <Tooltip title="Просмотр">
              <Button type="text" icon={<EyeOutlined />} onClick={() => onView(record)} />
            </Tooltip>
            <Tooltip title="Редактировать">
              <Button type="text" icon={<EditOutlined />} onClick={() => onEdit(record)} />
            </Tooltip>
            {canDeleteEmployee && canDeleteEmployee(record) && (
              <Tooltip title="Удалить">
                <Popconfirm
                  title="Удалить сотрудника?"
                  description="Это действие нельзя отменить."
                  onConfirm={() => onDelete(record.id)}
                  okText="Удалить"
                  okType="danger"
                  cancelText="Отмена"
                >
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Tooltip>
            )}
          </Space>
        ),
      },
    ];

    return columns;
  }, [
    departments,
    onEdit,
    onView,
    onDelete,
    onViewFiles,
    onDepartmentChange,
    canExport,
    canDeleteEmployee,
    uniqueFilters,
  ]);
};

