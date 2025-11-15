import { sequelize } from '../config/database.js';
import User from './User.js';
import Employee from './Employee.js';
import Pass from './Pass.js';
import File from './File.js';
import Counterparty from './Counterparty.js';
import ConstructionSite from './ConstructionSite.js';
import Contract from './Contract.js';

// Define associations

// User -> Employee (создатель/редактор)
User.hasMany(Employee, { foreignKey: 'created_by', as: 'createdEmployees' });
User.hasMany(Employee, { foreignKey: 'updated_by', as: 'updatedEmployees' });
Employee.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Employee.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });

// Counterparty -> Employee (подрядчик -> сотрудники подрядчика)
Counterparty.hasMany(Employee, { foreignKey: 'counterparty_id', as: 'employees' });
Employee.belongsTo(Counterparty, { foreignKey: 'counterparty_id', as: 'counterparty' });

// Counterparty -> User (контрагент -> пользователи контрагента)
Counterparty.hasMany(User, { foreignKey: 'counterparty_id', as: 'users' });
User.belongsTo(Counterparty, { foreignKey: 'counterparty_id', as: 'counterparty' });

// User -> Counterparty (создатель/редактор)
User.hasMany(Counterparty, { foreignKey: 'created_by', as: 'createdCounterparties' });
User.hasMany(Counterparty, { foreignKey: 'updated_by', as: 'updatedCounterparties' });
Counterparty.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Counterparty.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });

// Employee -> Pass (один сотрудник может иметь много пропусков)
Employee.hasMany(Pass, { foreignKey: 'employee_id', as: 'passes' });
Pass.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });

// User -> Pass (выдавший/отозвавший)
User.hasMany(Pass, { foreignKey: 'issued_by', as: 'issuedPasses' });
User.hasMany(Pass, { foreignKey: 'revoked_by', as: 'revokedPasses' });
Pass.belongsTo(User, { foreignKey: 'issued_by', as: 'issuer' });
Pass.belongsTo(User, { foreignKey: 'revoked_by', as: 'revoker' });

// User -> File (загрузивший)
User.hasMany(File, { foreignKey: 'uploaded_by', as: 'uploadedFiles' });
File.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });

// ConstructionSite -> Contract (объект -> договоры на объекте)
ConstructionSite.hasMany(Contract, { foreignKey: 'construction_site_id', as: 'contracts' });
Contract.belongsTo(ConstructionSite, { foreignKey: 'construction_site_id', as: 'constructionSite' });

// User -> ConstructionSite (создатель/редактор)
User.hasMany(ConstructionSite, { foreignKey: 'created_by', as: 'createdConstructionSites' });
User.hasMany(ConstructionSite, { foreignKey: 'updated_by', as: 'updatedConstructionSites' });
ConstructionSite.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
ConstructionSite.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });

// Counterparty -> Contract (контрагент -> договоры)
Counterparty.hasMany(Contract, { foreignKey: 'counterparty1_id', as: 'contractsAsParty1' });
Counterparty.hasMany(Contract, { foreignKey: 'counterparty2_id', as: 'contractsAsParty2' });
Contract.belongsTo(Counterparty, { foreignKey: 'counterparty1_id', as: 'counterparty1' });
Contract.belongsTo(Counterparty, { foreignKey: 'counterparty2_id', as: 'counterparty2' });

// User -> Contract (создатель/редактор)
User.hasMany(Contract, { foreignKey: 'created_by', as: 'createdContracts' });
User.hasMany(Contract, { foreignKey: 'updated_by', as: 'updatedContracts' });
Contract.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Contract.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });

export {
  sequelize,
  User,
  Employee,
  Pass,
  File,
  Counterparty,
  ConstructionSite,
  Contract
};


