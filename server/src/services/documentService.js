import { 
  Document, 
  Packer, 
  Paragraph, 
  Table, 
  TableRow, 
  TableCell, 
  TextRun,
  AlignmentType,
  WidthType,
  VerticalAlign,
  BorderStyle
} from 'docx';
import Application from '../models/Application.js';
import Employee from '../models/Employee.js';
import Citizenship from '../models/Citizenship.js';
import Position from '../models/Position.js';
import Counterparty from '../models/Counterparty.js';
import ConstructionSite from '../models/ConstructionSite.js';
import Contract from '../models/Contract.js';
import { formatSnils, formatKig, formatInn, formatPatentNumber, formatBlankNumber } from '../utils/formatters.js';

/**
 * Генерация документа Word для заявки
 */
export const generateApplicationDocument = async (applicationId) => {
  // Получаем заявку с полными данными
  const application = await Application.findByPk(applicationId, {
    include: [
      {
        model: Counterparty,
        as: 'counterparty',
        attributes: ['id', 'name', 'type', 'inn', 'kpp', 'ogrn', 'legalAddress', 'phone', 'email']
      },
      {
        model: ConstructionSite,
        as: 'constructionSite',
        attributes: ['id', 'shortName', 'fullName', 'address']
      },
      {
        model: Contract,
        as: 'subcontract',
        attributes: ['id', 'contractNumber', 'contractDate']
      },
      {
        model: Employee,
        as: 'employees',
        through: { attributes: [] },
        include: [
          {
            model: Citizenship,
            as: 'citizenship',
            attributes: ['id', 'name']
          },
          {
            model: Position,
            as: 'position',
            attributes: ['id', 'name']
          }
        ]
      }
    ]
  });

  if (!application) {
    throw new Error('Заявка не найдена');
  }

  // Реквизиты организации берем из контрагента
  const counterparty = application.counterparty;
  const orgData = {
    name: counterparty?.name || '',
    inn: counterparty?.inn || '',
    kpp: counterparty?.kpp || '',
    ogrn: counterparty?.ogrn || '',
    address: counterparty?.legalAddress || '',
    phone: counterparty?.phone || '',
    email: counterparty?.email || ''
  };

  // Создаем документ
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1134, // ~2 см
            right: 850, // ~1.5 см
            bottom: 1134, // ~2 см
            left: 1134, // ~2 см
          },
        },
      },
      children: [
        // Шапка с реквизитами
        ...createHeader(orgData),
        
        // Пустая строка
        new Paragraph({ text: '' }),
        
        // Дата экспорта
        ...createExportDate(),
        
        // Заголовок заявки
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 400 },
          children: [
            new TextRun({
              text: 'ЗАЯВКА НА ВЫДАЧУ ПРОПУСКОВ',
              bold: true,
              size: 28
            })
          ]
        }),
        
        // Текст заявки
        ...createApplicationText(application),
        
        // Заголовок списка работников
        new Paragraph({
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: 'Список работников:',
              bold: true,
              size: 22
            })
          ]
        }),
        
        // Таблица сотрудников
        createEmployeesTable(application.employees),
        
        // Подписи
        ...createSignatures(counterparty?.name || '')
      ]
    }]
  });

  // Генерируем буфер
  const buffer = await Packer.toBuffer(doc);
  return buffer;
};

/**
 * Создание шапки с реквизитами
 */
function createHeader(orgData) {
  const paragraphs = [];
  
  // Название организации
  if (orgData.name) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: orgData.name,
            bold: true,
            size: 22
          })
        ]
      })
    );
  }
  
  // ИНН и КПП
  if (orgData.inn || orgData.kpp) {
    const innKppText = [
      orgData.inn ? `ИНН ${orgData.inn}` : '',
      orgData.kpp ? `КПП ${orgData.kpp}` : ''
    ].filter(Boolean).join('  ');
    
    if (innKppText) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 50 },
          children: [
            new TextRun({
              text: innKppText,
              size: 20
            })
          ]
        })
      );
    }
  }
  
  // ОГРН
  if (orgData.ogrn) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 50 },
        children: [
          new TextRun({
            text: `ОГРН ${orgData.ogrn}`,
            size: 20
          })
        ]
      })
    );
  }
  
  // Адрес
  if (orgData.address) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 50 },
        children: [
          new TextRun({
            text: orgData.address,
            size: 20
          })
        ]
      })
    );
  }
  
  // Телефон
  if (orgData.phone) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 50 },
        children: [
          new TextRun({
            text: `Телефон ${orgData.phone}`,
            size: 20
          })
        ]
      })
    );
  }
  
  // Email
  if (orgData.email) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [
          new TextRun({
            text: `Email ${orgData.email}`,
            size: 20
          })
        ]
      })
    );
  }
  
  // Создаем таблицу с рамкой для реквизитов
  const borderStyle = {
    style: BorderStyle.SINGLE,
    size: 6,
    color: '000000'
  };

  const headerTable = new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: paragraphs,
            borders: {
              top: borderStyle,
              bottom: borderStyle,
              left: borderStyle,
              right: borderStyle
            },
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100
            }
          })
        ]
      })
    ],
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    }
  });
  
  return [headerTable];
}

/**
 * Создание даты экспорта
 */
function createExportDate() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('ru-RU');
  
  return [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: dateStr,
          size: 22
        })
      ]
    }),
    new Paragraph({ text: '' }), // Пустая строка
    new Paragraph({ text: '' })  // Пустая строка
  ];
}

/**
 * Создание текста заявки
 */
function createApplicationText(application) {
  const constructionSiteAddress = application.constructionSite?.address || '';
  const constructionSiteName = application.constructionSite?.fullName || application.constructionSite?.shortName || '';
  const siteInfo = [constructionSiteName, constructionSiteAddress].filter(Boolean).join(', ');
  
  // Дата экспорта
  const exportDate = new Date().toLocaleDateString('ru-RU');
  
  // Дата окончания из заявки
  const endDate = application.passValidUntil 
    ? new Date(application.passValidUntil).toLocaleDateString('ru-RU')
    : 'не указана';
  
  return [
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `Прошу разрешить доступ в дневное время с 08.00 до 20.00 на объект по адресу: ${siteInfo}.`,
          size: 22
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'Все привлекаемые сотрудники ознакомлены с правилами по охране труда, техники безопасности и пожарной безопасности, имеют разрешения на трудовую деятельность.',
          size: 22
        })
      ]
    }),
    new Paragraph({
      spacing: { before: 100, after: 200 },
      children: [
        new TextRun({
          text: `Период допуска на объект: с ${exportDate} по ${endDate}.`,
          bold: true,
          size: 22
        })
      ]
    })
  ];
}

/**
 * Создание таблицы сотрудников
 */
function createEmployeesTable(employees) {
  const borderStyle = {
    style: BorderStyle.SINGLE,
    size: 6,
    color: '000000'
  };

  const tableBorders = {
    top: borderStyle,
    bottom: borderStyle,
    left: borderStyle,
    right: borderStyle,
    insideHorizontal: borderStyle,
    insideVertical: borderStyle
  };

  // Заголовок таблицы
  const headerRow = new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ 
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '№', bold: true, size: 20 })]
        })],
        width: { size: 5, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ 
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Ф.И.О.', bold: true, size: 20 })]
        })],
        width: { size: 15, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ 
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Гражданство / Должность', bold: true, size: 20 })]
        })],
        width: { size: 15, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ 
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Дата рождения', bold: true, size: 20 })]
        })],
        width: { size: 10, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ 
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Паспортные данные', bold: true, size: 20 })]
        })],
        width: { size: 20, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ 
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Патент', bold: true, size: 20 })]
        })],
        width: { size: 20, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        borders: tableBorders
      }),
      new TableCell({
        children: [new Paragraph({ 
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Инструктаж по ТБ проведен, дата и подпись', bold: true, size: 20 })]
        })],
        width: { size: 15, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        borders: tableBorders
      })
    ]
  });

  // Строки с данными сотрудников
  const dataRows = employees.map((employee, index) => {
    // ФИО (каждое слово на отдельной строке)
    const fullName = [
      employee.lastName || '',
      employee.firstName || '',
      employee.middleName || ''
    ].filter(Boolean).join('\n');

    // Гражданство + Должность
    const citizenshipPosition = [
      employee.citizenship?.name || '-',
      employee.position?.name || '-'
    ].join('\n');

    // Дата рождения
    const birthDate = employee.birthDate 
      ? new Date(employee.birthDate).toLocaleDateString('ru-RU')
      : '-';

    // Паспортные данные (с форматированным СНИЛС, КИГ и ИНН)
    const passportData = [
      employee.passportNumber || '-',
      employee.passportDate ? new Date(employee.passportDate).toLocaleDateString('ru-RU') : '-',
      employee.passportIssuer || '-',
      `СНИЛС: ${formatSnils(employee.snils)}`,
      `КИГ: ${formatKig(employee.kig)}`,
      `ИНН: ${formatInn(employee.inn)}`
    ].join('\n');

    // Патент (с форматированными номером патента и номером бланка)
    const patentData = [
      `№ патента: ${formatPatentNumber(employee.patentNumber)}`,
      employee.patentIssueDate ? new Date(employee.patentIssueDate).toLocaleDateString('ru-RU') : '-',
      `№ бланка: ${formatBlankNumber(employee.blankNumber)}`
    ].join('\n');

    return new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ 
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: String(index + 1), size: 20 })]
          })],
          verticalAlign: VerticalAlign.CENTER,
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ 
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: fullName, size: 20 })]
          })],
          verticalAlign: VerticalAlign.CENTER,
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ 
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: citizenshipPosition, size: 20 })]
          })],
          verticalAlign: VerticalAlign.CENTER,
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ 
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: birthDate, size: 20 })]
          })],
          verticalAlign: VerticalAlign.CENTER,
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ 
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: passportData, size: 20 })]
          })],
          verticalAlign: VerticalAlign.CENTER,
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ 
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: patentData, size: 20 })]
          })],
          verticalAlign: VerticalAlign.CENTER,
          borders: tableBorders
        }),
        new TableCell({
          children: [new Paragraph({ 
            children: [new TextRun({ text: '', size: 20 })]
          })],
          verticalAlign: VerticalAlign.CENTER,
          borders: tableBorders
        })
      ]
    });
  });

  return new Table({
    rows: [headerRow, ...dataRows],
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    }
  });
}

/**
 * Создание блока подписей
 */
function createSignatures(companyName) {
  return [
    // Пустая строка перед подписями
    new Paragraph({ text: '', spacing: { before: 400 } }),
    
    // ФИО инженера ген.подрядчика по ТБ
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: 'ФИО инженера ген.подрядчика по ТБ _________________',
          size: 22
        })
      ]
    }),
    
    // Пустая строка
    new Paragraph({ text: '' }),
    
    // Пустая строка
    new Paragraph({ text: '' }),
    
    // Генеральный директор [компания]
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: `Генеральный директор ${companyName} ________________  / ______________`,
          size: 22
        })
      ]
    }),
    
    // Пустая строка
    new Paragraph({ text: '' }),
    
    // Пустая строка
    new Paragraph({ text: '' }),
    
    // Пустая строка
    new Paragraph({ text: '' }),
    
    // Представитель Ген. подрядчика
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: 'Представитель Ген. подрядчика _________________ / ______________',
          size: 22
        })
      ]
    }),
    
    // Пустая строка
    new Paragraph({ text: '' }),
    
    // Пустая строка
    new Paragraph({ text: '' }),
    
    // Пустая строка
    new Paragraph({ text: '' }),
    
    // Должность ответственного лица
    new Paragraph({
      children: [
        new TextRun({
          text: 'Должность ответственного лица _________________',
          size: 22
        })
      ]
    })
  ];
}

