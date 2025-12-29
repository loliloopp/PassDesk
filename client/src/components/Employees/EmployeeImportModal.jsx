import { useState } from 'react';
import { Modal, Steps, Button, Upload, Table, Space, App, Spin, Empty, Radio, message, Tooltip, Divider, Tag } from 'antd';
import { UploadOutlined, CheckCircleOutlined, ExclamationCircleOutlined, DownloadOutlined, LinkOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);
import { employeeApi } from '@/entities/employee';

/**
 * Многошаговое модальное окно для импорта сотрудников из Excel
 * Шаги:
 * 1. Загрузка и валидация файла
 * 2. Разрешение конфликтов ИНН (если есть)
 * 3. Обработка ошибок и пропусков
 * 4. Результаты импорта
 */
const EmployeeImportModal = ({ visible, onCancel, onSuccess }) => {
  const { message: messageApp } = App.useApp();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fileData, setFileData] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  const [conflictResolutions, setConflictResolutions] = useState({});
  const [importResult, setImportResult] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

  // Функция сброса состояния модального окна
  const resetModal = () => {
    setStep(0);
    setLoading(false);
    setFileData(null);
    setValidationResult(null);
    setConflictResolutions({});
    setImportResult(null);
    setPagination({ current: 1, pageSize: 10 });
  };

  // Обработчик закрытия модального окна
  const handleCancel = () => {
    resetModal();
    onCancel();
  };

  // Обработка выбора файла
  const handleFileSelect = (file) => {
    console.log('📁 Файл выбран:', file.name, 'размер:', file.size);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        console.log('📖 Читаем файл...');
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        console.log('📊 Листы в файле:', workbook.SheetNames);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(worksheet);
        console.log('📝 Сырые данные из Excel:', rawData);

        // Логируем доступные колонки
        console.log('📋 Доступные колонки в Excel:', Object.keys(rawData[0] || {}));
        
        // Маппируем данные из Excel
        // Поддерживаем оба формата: с явными названиями и с заголовком "Ф.И.О."
        const mappedData = rawData.map((row, idx) => {
          let lastName = '';
          let firstName = '';
          let middleName = '';
          
          // Формат 1: Если есть столбец "Ф.И.О." (заголовок для фамилии) + __EMPTY (имя) + __EMPTY_1 (отчество)
          if (row['Ф.И.О.']) {
            lastName = String(row['Ф.И.О.'] || '').trim();
            firstName = String(row['__EMPTY'] || '').trim();
            middleName = String(row['__EMPTY_1'] || '').trim();
          }
          // Формат 2: Явные названия столбцов
          else if (row['Фамилия']) {
            lastName = String(row['Фамилия'] || '').trim();
            firstName = String(row['Имя'] || '').trim();
            middleName = String(row['Отчество'] || '').trim();
          }
          // Формат 3: Английские названия
          else {
            lastName = String(row['last_name'] || '').trim();
            firstName = String(row['first_name'] || '').trim();
            middleName = String(row['middle_name'] || '').trim();
          }
          
          // КИГ может быть в разных форматах
          let kig = row['КИГ'] || row['kig'] || '';
          if (!kig && row['КИГ \r\nКарта иностранного гражданина']) {
            kig = row['КИГ \r\nКарта иностранного гражданина'];
          }
          
          // Функция нормализации: убирает точки в конце, лишние пробелы
          const normalize = (value) => {
            if (!value) return '';
            return String(value).trim().replace(/\.+$/g, ''); // Убираем точки в конце
          };
          
          // Функция парсинга даты из Excel
          const parseDate = (value) => {
            if (!value) return null;
            
            // Если это число (Excel serial date)
            if (typeof value === 'number') {
              const date = XLSX.SSF.parse_date_code(value);
              return dayjs(new Date(date.y, date.m - 1, date.d)).format('YYYY-MM-DD');
            }
            
            // Если это строка - пытаемся распарсить
            const normalized = normalize(value);
            if (!normalized) return null;
            
            // Пробуем разные форматы: DD.MM.YYYY, DD/MM/YYYY, YYYY-MM-DD
            const parsed = dayjs(normalized, ['DD.MM.YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'], true);
            if (parsed.isValid()) {
              return parsed.format('YYYY-MM-DD');
            }
            
            return null;
          };
          
          const mapped = {
            counterpartyInn: normalize(row['ИНН организации'] || row['inn_organization']),
            counterpartyKpp: normalize(row['КПП организации'] || row['kpp_organization']),
            lastName: lastName,
            firstName: firstName,
            middleName: middleName,
            inn: normalize(row['ИНН сотрудника'] || row['employee_inn']),
            snils: normalize(row['СНИЛС'] || row['snils']),
            kig: normalize(kig),
            kigEndDate: parseDate(row['Срок окончания КИГ'] || row['kig_end_date']),
            citizenship: normalize(row['Гражданство'] || row['citizenship']),
            birthDate: parseDate(row['Дата рождения'] || row['birth_date']),
            position: normalize(row['Должность'] || row['position']),
            organization: normalize(row['Организация'] || row['organization'])
          };
          
          // Логируем ВСЕ данные для диагностики
          if (idx < 3) {
            console.log(`\n📌 Строка ${idx + 1} RAW:`, row);
            console.log(`📌 Строка ${idx + 1} MAPPED:`, mapped);
            console.log(`  - ФИО: "${mapped.lastName}" "${mapped.firstName}" "${mapped.middleName}"`);
            console.log(`  - counterpartyInn: "${mapped.counterpartyInn}"`);
            console.log(`  - inn: "${mapped.inn}"`);
          }
          
          return mapped;
        });

        console.log('✅ Всего отображено записей:', mappedData.length);
        setFileData(mappedData);
        // НЕ переходим автоматически, подождём нажатия кнопки "Проверить"
        messageApp.success(`Файл загружен: ${mappedData.length} записей`);
      } catch (error) {
        console.error('❌ Error reading file:', error);
        messageApp.error('Ошибка при чтении файла');
      }
    };
    reader.readAsBinaryString(file);
    return false;
  };

  // Валидация и проверка контрагентов
  const handleValidate = async () => {
    if (!fileData || fileData.length === 0) {
      messageApp.warning('Выберите файл для загрузки');
      return;
    }

    try {
      setLoading(true);
      console.log('📤 Отправляем данные на валидацию, записей:', fileData.length);
      console.log('📤 Структура первой записи:', fileData[0]);
      console.log('📤 Полные данные:', fileData);
      
      const response = await employeeApi.validateEmployeesImport(fileData);
      
      console.log('📥 Response object:', response);
      console.log('📥 Response status:', response?.status);
      console.log('📥 Response data:', response?.data);
      console.log('Valid employees:', response?.data?.data?.validEmployees);
      console.log('Validation errors:', response?.data?.data?.validationErrors);
      console.log('Conflicting INNs:', response?.data?.data?.conflictingInns);

      const validResult = response?.data?.data;
      setValidationResult(validResult);

      // Определяем следующий шаг
      if (validResult?.hasErrors || validResult?.hasConflicts) {
        // Есть ошибки валидации или конфликты - показываем их
        console.log('📌 Есть ошибки/конфликты, переходим на шаг 2');
        setStep(2);
      } else {
        // Все ОК - готовы к импорту
        console.log('📌 Данные валидны, переходим на шаг 3');
        setStep(3);
      }
    } catch (error) {
      console.error('❌ Validation error:', error);
      console.error('Error response:', error.response?.data);
      messageApp.error(error.response?.data?.message || 'Ошибка валидации');
    } finally {
      setLoading(false);
    }
  };

  // Обработка конфликтов и ошибок
  const handleConflictResolution = async () => {
    try {
      setLoading(true);

      // Фильтруем данные для импорта с учетом разрешений конфликтов
      let filteredEmployees = [...validationResult.validEmployees];

      // Добавляем конфликтующих сотрудников, которых пользователь решил "Заменить"
      validationResult?.conflictingInns?.forEach((conflict) => {
        if (conflictResolutions[conflict.inn] === 'update') {
          // Находим исходные данные сотрудника из fileData по ИНН конфликта
          const originalData = fileData.find(emp => {
            // Нормализуем ИНН для сравнения (убираем пробелы и приводим к строке)
            const empInn = String(emp.inn || '').replace(/\s/g, '');
            const conflictInn = String(conflict.inn || '').replace(/\s/g, '');
            return empInn === conflictInn;
          });
          
          console.log('🔍 Ищем исходные данные для конфликта:', {
            conflictInn: conflict.inn,
            found: !!originalData,
            originalCounterpartyInn: originalData?.counterpartyInn
          });
          
          if (originalData) {
            // Добавляем counterparty данные из исходного файла
            const employeeWithCounterparty = {
              ...conflict.newEmployee,
              counterpartyInn: originalData.counterpartyInn,
              counterpartyKpp: originalData.counterpartyKpp
            };
            console.log('✅ Добавили counterparty данные к сотруднику:', employeeWithCounterparty);
            filteredEmployees.push(employeeWithCounterparty);
          } else {
            console.warn('⚠️ Не нашли исходные данные для ИНН:', conflict.inn);
            // Fallback: если не нашли исходные данные, добавляем как есть
            filteredEmployees.push(conflict.newEmployee);
          }
        }
      });

      console.log('📤 Отправляем для импорта:', {
        total: filteredEmployees.length,
        validEmployees: validationResult.validEmployees.length,
        conflictsToUpdate: Object.values(conflictResolutions).filter(r => r === 'update').length
      });

      const response = await employeeApi.importEmployees(
        filteredEmployees,
        conflictResolutions
      );

      setImportResult(response?.data?.data);
      setStep(4);
      messageApp.success('Импорт завершен');
      onSuccess?.(); // Обновляем список сотрудников сразу после успешного импорта
    } catch (error) {
      console.error('❌ Import error:', error);
      console.error('Error response:', error.response?.data);
      messageApp.error(error.response?.data?.message || 'Ошибка при импорте');
    } finally {
      setLoading(false);
    }
  };

  const handleConflictRadioChange = (inn, resolution) => {
    setConflictResolutions((prev) => ({
      ...prev,
      [inn]: resolution
    }));
  };

  const handleResolveAllConflicts = (resolution) => {
    const allResolutions = {};
    validationResult?.conflictingInns?.forEach((conflict) => {
      allResolutions[conflict.inn] = resolution;
    });
    setConflictResolutions(allResolutions);
  };

  // Шаг 0 - Загрузка файла
  const renderStep0 = () => (
    <div style={{ padding: '40px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <Upload
          maxCount={1}
          accept=".xlsx,.xls"
          beforeUpload={handleFileSelect}
          fileList={fileData ? [{ name: 'employees.xlsx', uid: '-1' }] : []}
          droppable
        >
          <Button icon={<UploadOutlined />} size="large">
            Выберите файл Excel
          </Button>
        </Upload>
        <p style={{ marginTop: '12px', color: '#666', fontSize: '12px' }}>
          или перетащите файл сюда
        </p>
      </div>

      <Divider />

      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ marginBottom: '12px' }}>📋 Структура файла:</h4>
        <p style={{ color: '#666', marginBottom: '8px', fontSize: '12px' }}>
          Файл должен содержать следующие столбцы:
        </p>
        <div style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', fontSize: '12px' }}>
          <div>№, Фамилия, Имя, Отчество, КИГ, Срок окончания КИГ, Гражданство,</div>
          <div>Дата рождения, СНИЛС, Должность, ИНН сотрудника,</div>
          <div>Организация, <strong>ИНН организации</strong>, <strong>КПП организации</strong></div>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <h4 style={{ marginBottom: '8px' }}>🔗 Скачать шаблон:</h4>
        <Button 
          type="link" 
          icon={<LinkOutlined />} 
          onClick={() => window.open('https://docs.google.com/spreadsheets/d/1oho6qSjuhuq524-RZXmvN8XJh6-lSXSjAyYaRunzTP8/edit?usp=sharing', '_blank')}
          style={{ padding: 0 }}
        >
          Google таблица с бланком
        </Button>
      </div>

      <div style={{ background: '#e6f7ff', padding: '12px', borderRadius: '4px', fontSize: '12px' }}>
        <div style={{ marginBottom: '8px' }}>
          <strong>ℹ️ Примечание:</strong> Столбец № пропускается. Столбцы, не указанные выше, игнорируются.
        </div>
        <div>
          <strong>🏢 Контрагенты:</strong> <strong>ИНН организации</strong> и <strong>КПП организации</strong> - 
          контрагент должен быть вашей организацией или вашим субподрядчиком.
        </div>
      </div>
    </div>
  );

  // Шаг 1 - Предпросмотр данных
  const renderStep1 = () => (
    <div>
      <p style={{ marginBottom: '16px' }}>
        Загружено записей: <strong>{fileData?.length || 0}</strong>
      </p>
      {fileData && fileData.length > 0 ? (
        <Table
          dataSource={(fileData || []).map((item, idx) => ({ ...item, _key: idx }))}
          columns={[
            {
              title: '№',
              render: (_, __, index) => index + 1,
              width: 40,
              align: 'center'
            },
            { title: 'Фамилия', dataIndex: 'lastName', key: 'lastName', ellipsis: true, width: 120 },
            { title: 'Имя', dataIndex: 'firstName', key: 'firstName', ellipsis: true, width: 120 },
            { 
              title: 'Дата рождения', 
              dataIndex: 'birthDate', 
              key: 'birthDate', 
              width: 120,
              render: (date) => date ? dayjs(date).format('DD.MM.YYYY') : '-'
            },
            { title: 'ИНН контрагента', dataIndex: 'counterpartyInn', key: 'counterpartyInn', width: 120 },
            { title: 'ИНН сотрудника', dataIndex: 'inn', key: 'inn', ellipsis: true, width: 120 }
          ]}
          pagination={{ pageSize: 5, size: 'small' }}
          size="small"
          scroll={{ x: 900 }}
          rowKey="_key"
        />
      ) : (
        <Empty description="Данные не загружены" />
      )}
    </div>
  );

  // Шаг 2 - Разрешение конфликтов и ошибок
  const renderStep2 = () => {
    const hasValidationErrors = validationResult?.validationErrors?.length > 0;
    const hasConflicts = validationResult?.conflictingInns?.length > 0;

    return (
      <div>
        {hasValidationErrors && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ color: '#d9534f' }}>
              <ExclamationCircleOutlined /> Ошибки валидации ({validationResult.validationErrors.length})
            </h4>
            <Table
              dataSource={validationResult.validationErrors}
              columns={[
                {
                  title: '№',
                  dataIndex: 'rowIndex',
                  width: 50,
                  align: 'center'
                },
                {
                  title: 'Фамилия',
                  dataIndex: 'lastName',
                  key: 'lastName',
                  width: 100
                },
                {
                  title: 'Имя',
                  dataIndex: 'firstName',
                  key: 'firstName',
                  width: 100
                },
                {
                  title: 'ИНН',
                  dataIndex: 'inn',
                  key: 'inn',
                  width: 110
                },
                {
                  title: 'Ошибка',
                  dataIndex: 'errors',
                  key: 'errors',
                  render: (errors) => (
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      {errors.map((err, idx) => (
                        <li key={idx} style={{ color: '#d9534f' }}>
                          {err}
                        </li>
                      ))}
                    </ul>
                  )
                }
              ]}
              pagination={{ pageSize: 5 }}
              size="small"
              rowKey="rowIndex"
            />
            <p style={{ marginTop: '12px', color: '#999' }}>
              ⓘ Эти записи будут пропущены при импорте
            </p>
          </div>
        )}

        {hasConflicts && (
          <div>
            <h4 style={{ color: '#faad14' }}>⚠️ Конфликты ИНН сотрудников ({validationResult.conflictingInns.length})</h4>
            <Space style={{ marginBottom: '16px', width: '100%' }} direction="vertical">
              <p>Эти ИНН уже существуют в системе. Выберите действие для каждого или для всех сразу:</p>
              <Space wrap>
                <Tooltip title="Заменить все существующие сотрудники новыми данными из файла">
                  <Button
                    type="primary"
                    onClick={() => handleResolveAllConflicts('update')}
                    size="small"
                  >
                    Заменить всех
                  </Button>
                </Tooltip>
                <Tooltip title="Пропустить все конфликтующие записи из файла">
                  <Button onClick={() => handleResolveAllConflicts('skip')} size="small">
                    Пропустить всех
                  </Button>
                </Tooltip>
              </Space>
            </Space>

            <Table
              dataSource={validationResult.conflictingInns}
              columns={[
                {
                  title: 'Имя',
                  render: (_, record) => (
                    <div>{record.newEmployee.lastName} {record.newEmployee.firstName}</div>
                  ),
                  width: 120
                },
                {
                  title: 'ИНН',
                  dataIndex: 'inn',
                  key: 'inn',
                  width: 100
                },
                {
                  title: 'На портале',
                  render: (_, record) => (
                    <div style={{ fontSize: '12px' }}>
                      <div><strong>{record.existingEmployee.lastName} {record.existingEmployee.firstName} {record.existingEmployee.middleName || ''}</strong></div>
                      <div style={{ color: '#999' }}>ИНН: {record.existingEmployee.inn}</div>
                      {record.existingEmployee.snils && <div style={{ color: '#999' }}>СНИЛС: {record.existingEmployee.snils}</div>}
                      {record.existingEmployee.birthDate && <div style={{ color: '#999' }}>Дата рожд.: {dayjs(record.existingEmployee.birthDate).format('DD.MM.YYYY')}</div>}
                    </div>
                  ),
                  width: 220
                },
                {
                  title: 'В файле',
                  render: (_, record) => (
                    <div style={{ fontSize: '12px' }}>
                      <div><strong>{record.newEmployee.lastName} {record.newEmployee.firstName} {record.newEmployee.middleName || ''}</strong></div>
                      <div style={{ color: '#999' }}>ИНН: {record.newEmployee.inn}</div>
                      {record.newEmployee.snils && <div style={{ color: '#999' }}>СНИЛС: {record.newEmployee.snils}</div>}
                      {record.newEmployee.birthDate && <div style={{ color: '#999' }}>Дата рожд.: {dayjs(record.newEmployee.birthDate).format('DD.MM.YYYY')}</div>}
                    </div>
                  ),
                  width: 220
                },
                {
                  title: 'Действие',
                  render: (_, record) => (
                    <Radio.Group
                      value={conflictResolutions[record.inn] || 'skip'}
                      onChange={(e) => handleConflictRadioChange(record.inn, e.target.value)}
                    >
                      <Radio value="update">Заменить</Radio>
                      <Radio value="skip">Пропустить</Radio>
                    </Radio.Group>
                  ),
                  width: 150
                }
              ]}
              pagination={{ pageSize: 5 }}
              size="small"
              rowKey="inn"
              scroll={{ x: 700 }}
            />
          </div>
        )}

        {!hasValidationErrors && !hasConflicts && (
          <Empty description="Все данные валидны, конфликтов не найдено" />
        )}
      </div>
    );
  };

  // Шаг 3 - Готовность к импорту
  const renderStep3 = () => {
    // Рассчитываем количество сотрудников с учетом разрешений конфликтов
    let totalEmployees = validationResult?.validEmployees?.length || 0;
    
    validationResult?.conflictingInns?.forEach((conflict) => {
      if (conflictResolutions[conflict.inn] === 'update') {
        totalEmployees++;
      }
    });

    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
        <p style={{ fontSize: 16, marginBottom: 24 }}>
          Данные готовы к импорту
          <br />
          <strong>
            {totalEmployees} сотрудников
          </strong>
        </p>
        {totalEmployees === 0 && (
          <p style={{ color: '#ff4d4f', fontSize: '14px' }}>
            ⚠️ Не выбрано ни одного сотрудника для импорта
          </p>
        )}
      </div>
    );
  };

  // Шаг 4 - Результаты импорта
  const renderStep4 = () => {
    const totalProcessed = (importResult?.created || 0) + (importResult?.updated || 0) + (importResult?.skipped || 0);
    const hasErrors = importResult?.errors?.length > 0;
    
    return (
      <div>
        <div style={{ marginBottom: '24px', padding: '16px', background: '#f6f8fb', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>📊 Результаты импорта</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div style={{ textAlign: 'center', padding: '12px', background: '#fff', borderRadius: '4px' }}>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#52c41a' }}>
                {importResult?.created || 0}
              </div>
              <div style={{ color: '#666', fontSize: 14, marginTop: '4px' }}>✅ Создано</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px', background: '#fff', borderRadius: '4px' }}>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#faad14' }}>
                {importResult?.updated || 0}
              </div>
              <div style={{ color: '#666', fontSize: 14, marginTop: '4px' }}>🔄 Обновлено</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px', background: '#fff', borderRadius: '4px' }}>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#999' }}>
                {importResult?.skipped || 0}
              </div>
              <div style={{ color: '#666', fontSize: 14, marginTop: '4px' }}>⏭️ Пропущено</div>
            </div>
          </div>
          
          {totalProcessed > 0 && (
            <div style={{ marginTop: '16px', textAlign: 'center', color: '#52c41a', fontSize: 16 }}>
              <CheckCircleOutlined /> Всего обработано: <strong>{totalProcessed}</strong> {totalProcessed === 1 ? 'сотрудник' : totalProcessed < 5 ? 'сотрудника' : 'сотрудников'}
            </div>
          )}
        </div>

        {hasErrors && (
          <div style={{ padding: '12px', background: '#fff7e6', borderRadius: '8px', border: '1px solid #ffd591' }}>
            <h4 style={{ color: '#d46b08', margin: '0 0 12px 0' }}>
              ⚠️ Предупреждения ({importResult.errors.length})
            </h4>
            <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 12 }}>
              Сотрудники успешно созданы, но возникли проблемы при дополнительной обработке
            </div>
            <Table
              dataSource={importResult.errors}
              columns={[
                {
                  title: 'Строка',
                  dataIndex: 'rowIndex',
                  width: 70,
                  align: 'center'
                },
                {
                  title: 'Фамилия',
                  dataIndex: 'lastName',
                  key: 'lastName',
                  width: 150
                },
                {
                  title: 'Предупреждение',
                  dataIndex: 'error',
                  key: 'error',
                  render: (error) => (
                    <span style={{ color: '#d46b08' }}>
                      {error.includes('counterparty.update') 
                        ? 'Ошибка обновления КПП контрагента (не критично)'
                        : error
                      }
                    </span>
                  )
                }
              ]}
              pagination={{ pageSize: 5 }}
              size="small"
              rowKey={(record) => `${record.rowIndex}-${record.lastName}`}
            />
          </div>
        )}
      </div>
    );
  };

  // Шаги
  const steps = [
    { title: 'Загрузка', description: 'Выбор файла' },
    { title: 'Проверка', description: 'Валидация данных' },
    { title: 'Конфликты', description: 'Разрешение конфликтов' },
    { title: 'Импорт', description: 'Выполнение' },
    { title: 'Результаты', description: 'Завершено' }
  ];

  // Логика шагов
  const stepContent = {
    0: renderStep0(),
    1: renderStep1(),
    2: renderStep2(),
    3: renderStep3(),
    4: renderStep4()
  };

  const handleNext = async () => {
    if (step === 0) {
      if (!fileData) {
        messageApp.warning('Выберите файл');
        return;
      }
      // Показываем предпросмотр
      setStep(1);
    } else if (step === 1) {
      // На шаге предпросмотра - проводим валидацию
      console.log('📌 Шаг 1: запускаем валидацию');
      await handleValidate();
    } else if (step === 2) {
      // После разрешения конфликтов переходим к импорту
      setStep(3);
    } else if (step === 3) {
      // Выполняем импорт
      await handleConflictResolution();
    } else if (step === 4) {
      // Завершаем
      onSuccess?.();
      handleCancel();
    }
  };

  const handlePrevious = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const getNextButtonText = () => {
    if (step === 0) return 'Проверить';
    if (step === 1) return 'Далее';
    if (step === 2) return 'Начать импорт';
    if (step === 3) return loading ? 'Импортирование...' : 'Импортировать';
    if (step === 4) return 'Завершить';
    return 'Далее';
  };

  const getModalTitle = () => {
    if (step === 4) {
      const hasErrors = importResult?.errors?.length > 0;
      const created = importResult?.created || 0;
      const updated = importResult?.updated || 0;
      
      if (created > 0 || updated > 0) {
        return hasErrors 
          ? '✅ Импорт завершен с предупреждениями'
          : '✅ Импорт успешно завершен';
      }
      return 'Результаты импорта';
    }
    return 'Загрузка сотрудников из Excel';
  };

  return (
    <Modal
      title={getModalTitle()}
      open={visible}
      onCancel={handleCancel}
      width="90vw"
      style={{ maxWidth: '95vw' }}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Отмена
        </Button>,
        step > 0 && (
          <Button key="back" onClick={handlePrevious}>
            Назад
          </Button>
        ),
        <Button
          key="next"
          type="primary"
          onClick={handleNext}
          loading={loading}
          disabled={
            (step === 0 && !fileData) || (step === 3 && loading)
          }
        >
          {getNextButtonText()}
        </Button>
      ]}
    >
      <Spin spinning={loading}>
        <Steps current={step} items={steps} style={{ marginBottom: '24px' }} />
        {stepContent[step]}
      </Spin>
    </Modal>
  );
};

export default EmployeeImportModal;

