import { useState } from 'react';
import { Modal, Steps, Button, Upload, Table, Space, App, Spin, Empty, Radio, message } from 'antd';
import { UploadOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
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
        const mappedData = rawData.map((row, idx) => {
          const mapped = {
            counterpartyInn: row['ИНН'] || row['inn'] || '',
            lastName: row['Фамилия'] || row['last_name'] || '',
            firstName: row['Имя'] || row['first_name'] || '',
            middleName: row['Отчество'] || row['middle_name'] || '',
            inn: row['ИНН Сотрудник'] || row['employee_inn'] || '',
            snils: row['СНИЛС Сотрудник'] || row['snils'] || '',
            idAll: row['id_all'] || ''
          };
          
          // Логируем ВСЕ данные для диагностики
          if (idx < 3) {
            console.log(`\n📌 Строка ${idx + 1} RAW:`, row);
            console.log(`📌 Строка ${idx + 1} MAPPED:`, mapped);
            console.log(`  - counterpartyInn: "${mapped.counterpartyInn}" (from: "${row['ИНН']}")`);
            console.log(`  - lastName: "${mapped.lastName}" (from: "${row['Фамилия']}")`);
            console.log(`  - inn: "${mapped.inn}" (from: "${row['ИНН Сотрудник']}")`);
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
      const filteredEmployees = validationResult.validEmployees;

      const response = await employeeApi.importEmployees(
        filteredEmployees,
        conflictResolutions
      );

      setImportResult(response?.data?.data);
      setStep(4);
      messageApp.success('Импорт завершен');
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
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <Upload
        maxCount={1}
        accept=".xlsx,.xls"
        beforeUpload={handleFileSelect}
        fileList={fileData ? [{ name: 'employees.xlsx', uid: '-1' }] : []}
      >
        <Button icon={<UploadOutlined />} size="large">
          Выберите файл Excel
        </Button>
      </Upload>
      <p style={{ marginTop: '16px', color: '#666' }}>
        Формат: .xlsx или .xls
        <br />
        Обязательные столбцы: ИНН, Фамилия, Имя, Отчество, ИНН Сотрудник, СНИЛС Сотрудник, id_all
      </p>
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
            { title: 'Фамилия', dataIndex: 'lastName', key: 'lastName', ellipsis: true },
            { title: 'Имя', dataIndex: 'firstName', key: 'firstName', ellipsis: true },
            { title: 'ИНН контрагента', dataIndex: 'counterpartyInn', key: 'counterpartyInn' },
            { title: 'ИНН сотрудника', dataIndex: 'inn', key: 'inn', ellipsis: true }
          ]}
          pagination={{ pageSize: 5, size: 'small' }}
          size="small"
          scroll={{ x: 700 }}
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
                  title: 'Строка',
                  dataIndex: 'rowIndex',
                  width: 60,
                  align: 'center'
                },
                {
                  title: 'Фамилия',
                  dataIndex: 'lastName',
                  key: 'lastName'
                },
                {
                  title: 'Ошибки',
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
            <h4>Конфликты ИНН сотрудников ({validationResult.conflictingInns.length})</h4>
            <Space style={{ marginBottom: '16px', width: '100%' }} direction="vertical">
              <p>Эти ИНН уже существуют в системе. Выберите действие:</p>
              <Space>
                <Button
                  type="primary"
                  onClick={() => handleResolveAllConflicts('update')}
                  size="small"
                >
                  Перезаписать все
                </Button>
                <Button onClick={() => handleResolveAllConflicts('skip')} size="small">
                  Пропустить все
                </Button>
              </Space>
            </Space>

            <Table
              dataSource={validationResult.conflictingInns}
              columns={[
                {
                  title: 'ИНН',
                  dataIndex: 'inn',
                  key: 'inn',
                  width: 120
                },
                {
                  title: 'Существующий сотрудник',
                  render: (_, record) => (
                    <div>
                      {record.existingEmployee.lastName} {record.existingEmployee.firstName}
                    </div>
                  ),
                  ellipsis: true
                },
                {
                  title: 'Новый сотрудник',
                  render: (_, record) => (
                    <div>
                      {record.newEmployee.lastName} {record.newEmployee.firstName}
                    </div>
                  ),
                  ellipsis: true
                },
                {
                  title: 'Действие',
                  render: (_, record) => (
                    <Radio.Group
                      value={conflictResolutions[record.inn] || 'skip'}
                      onChange={(e) => handleConflictRadioChange(record.inn, e.target.value)}
                    >
                      <Radio value="update">Перезаписать</Radio>
                      <Radio value="skip">Пропустить</Radio>
                    </Radio.Group>
                  ),
                  width: 200
                }
              ]}
              pagination={{ pageSize: 5 }}
              size="small"
              rowKey="inn"
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
  const renderStep3 = () => (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
      <p style={{ fontSize: 16, marginBottom: 24 }}>
        Данные готовы к импорту
        <br />
        <strong>
          {validationResult?.validEmployees?.length || 0} сотрудников
        </strong>
      </p>
    </div>
  );

  // Шаг 4 - Результаты импорта
  const renderStep4 = () => (
    <div>
      <div style={{ marginBottom: '24px', padding: '12px', background: '#f6f8fb', borderRadius: '4px' }}>
        <h4>Результаты импорта:</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
              {importResult?.created || 0}
            </div>
            <div style={{ color: '#666', fontSize: 12 }}>Создано</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#faad14' }}>
              {importResult?.updated || 0}
            </div>
            <div style={{ color: '#666', fontSize: 12 }}>Обновлено</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff7a7a' }}>
              {importResult?.skipped || 0}
            </div>
            <div style={{ color: '#666', fontSize: 12 }}>Пропущено</div>
          </div>
        </div>
      </div>

      {importResult?.errors?.length > 0 && (
        <div>
          <h4 style={{ color: '#d9534f' }}>Ошибки при импорте ({importResult.errors.length}):</h4>
          <Table
            dataSource={importResult.errors}
            columns={[
              {
                title: 'Строка',
                dataIndex: 'rowIndex',
                width: 60,
                align: 'center'
              },
              {
                title: 'Фамилия',
                dataIndex: 'lastName',
                key: 'lastName'
              },
              {
                title: 'Ошибка',
                dataIndex: 'error',
                key: 'error',
                render: (error) => <span style={{ color: '#d9534f' }}>{error}</span>
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
      onCancel();
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

  return (
    <Modal
      title="Загрузка сотрудников из Excel"
      open={visible}
      onCancel={onCancel}
      width="90vw"
      style={{ maxWidth: '95vw' }}
      footer={[
        <Button key="cancel" onClick={onCancel}>
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

