const { DataTypes } = require('sequelize');

function defineModels(sequelize) {
  const User = sequelize.define(
    'users',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      role: { type: DataTypes.ENUM('admin', 'manager', 'user'), allowNull: false, defaultValue: 'user' },
      job_title: { type: DataTypes.STRING(100), allowNull: true },
      password_hash: { type: DataTypes.STRING(255), allowNull: false }
    },
    { tableName: 'users' }
  );

  const Category = sequelize.define(
    'categories',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      description: { type: DataTypes.TEXT, allowNull: true }
    },
    { tableName: 'categories', updatedAt: false }
  );

  const Department = sequelize.define(
    'departments',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      manager_id: { type: DataTypes.UUID, allowNull: true }
    },
    { tableName: 'departments', updatedAt: false }
  );

  const Asset = sequelize.define(
    'assets',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      asset_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(200), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      category_id: { type: DataTypes.UUID, allowNull: true },
      department_id: { type: DataTypes.UUID, allowNull: true },
      purchase_price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      purchase_date: { type: DataTypes.DATEONLY, allowNull: true },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'in_stock' },
      location: { type: DataTypes.STRING(200), allowNull: true },
      managed_by: { type: DataTypes.UUID, allowNull: true },
      images: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
      serial_number: { type: DataTypes.STRING(100), allowNull: true },
      floor: { type: DataTypes.STRING(50), allowNull: true },
      room_type: { type: DataTypes.STRING(50), allowNull: true },
      specific_location: { type: DataTypes.STRING(200), allowNull: true },
      factory_date: { type: DataTypes.DATEONLY, allowNull: true },
      arrival_date: { type: DataTypes.DATEONLY, allowNull: true },
      warranty_years: { type: DataTypes.INTEGER, allowNull: true },
      manufacturer: { type: DataTypes.STRING(200), allowNull: true },
      origin_country: { type: DataTypes.STRING(100), allowNull: true },
      planned_retirement_date: { type: DataTypes.DATEONLY, allowNull: true },
      is_faulty: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
      entry_person: { type: DataTypes.STRING(100), allowNull: true },
      project_name: { type: DataTypes.STRING(200), allowNull: true },
      bm_number: { type: DataTypes.STRING(50), allowNull: true },
      purchase_order: { type: DataTypes.STRING(50), allowNull: true },
      brand: { type: DataTypes.STRING(100), allowNull: true },
      model: { type: DataTypes.STRING(100), allowNull: true },
      unit: { type: DataTypes.STRING(20), allowNull: true },
      equipment_type: { type: DataTypes.STRING(100), allowNull: true },
      attachments: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
      employee_name: { type: DataTypes.STRING(100), allowNull: true },
      employee_code: { type: DataTypes.STRING(50), allowNull: true },
      department_name: { type: DataTypes.STRING(100), allowNull: true },
      last_record: { type: DataTypes.TEXT, allowNull: true }
    },
    { tableName: 'assets' }
  );

  const AssetFlowRecord = sequelize.define(
    'asset_flow_records',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      asset_id: { type: DataTypes.UUID, allowNull: false },
      operation_type: { type: DataTypes.STRING(50), allowNull: false },
      operator: { type: DataTypes.STRING(100), allowNull: false },
      operation_time: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      description: { type: DataTypes.TEXT, allowNull: true },
      related_form_no: { type: DataTypes.STRING(100), allowNull: true },
      target_employee_name: { type: DataTypes.STRING(100), allowNull: true },
      target_employee_code: { type: DataTypes.STRING(50), allowNull: true },
      target_department_name: { type: DataTypes.STRING(100), allowNull: true },
      target_floor: { type: DataTypes.STRING(50), allowNull: true },
      target_room_type: { type: DataTypes.STRING(100), allowNull: true },
      target_specific_location: { type: DataTypes.STRING(200), allowNull: true },
      target_location: { type: DataTypes.STRING(200), allowNull: true },
      borrow_start_time: { type: DataTypes.DATE, allowNull: true },
      borrow_end_time: { type: DataTypes.DATE, allowNull: true },
      return_type: { type: DataTypes.STRING(50), allowNull: true }
    },
    { tableName: 'asset_flow_records', updatedAt: false }
  );

  const AssetRequest = sequelize.define(
    'asset_requests',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      request_name: { type: DataTypes.STRING(200), allowNull: false },
      request_type: { type: DataTypes.STRING(50), allowNull: false },
      attachment: { type: DataTypes.STRING(255), allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      created_by: { type: DataTypes.UUID, allowNull: true }
    },
    { tableName: 'asset_requests' }
  );

  const ProcurementContract = sequelize.define(
    'procurement_contracts',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      project_name: { type: DataTypes.STRING(200), allowNull: false },
      bm_number: { type: DataTypes.STRING(50), allowNull: false },
      procurement_order: { type: DataTypes.STRING(50), allowNull: false },
      attachment: { type: DataTypes.STRING(255), allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
      created_by: { type: DataTypes.UUID, allowNull: true },
      project_time: { type: DataTypes.TEXT, allowNull: true },
      technical_spec: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
      other_attachments: { type: DataTypes.JSON, allowNull: true, defaultValue: [] }
    },
    { tableName: 'procurement_contracts' }
  );

  const ContractSupplier = sequelize.define(
    'contract_suppliers',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      contract_id: { type: DataTypes.UUID, allowNull: false },
      supplier_name: { type: DataTypes.TEXT, allowNull: true },
      contact_person: { type: DataTypes.TEXT, allowNull: true },
      contact_phone: { type: DataTypes.TEXT, allowNull: true },
      contract_files: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
      order_files: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
      payment_files: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
      acceptance_files: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
      remarks: { type: DataTypes.TEXT, allowNull: true }
    },
    { tableName: 'contract_suppliers', updatedAt: false }
  );

  const SysDictionary = sequelize.define(
    'sys_dictionaries',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true }
    },
    { tableName: 'sys_dictionaries' }
  );

  const SysDictionaryItem = sequelize.define(
    'sys_dictionary_items',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      dict_id: { type: DataTypes.UUID, allowNull: false },
      label: { type: DataTypes.STRING(100), allowNull: false },
      value: { type: DataTypes.STRING(100), allowNull: false },
      sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      status: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      description: { type: DataTypes.TEXT, allowNull: true }
    },
    { tableName: 'sys_dictionary_items' }
  );

  const AssetDictionary = sequelize.define(
    'asset_dictionary',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      project_name: { type: DataTypes.STRING(200), allowNull: false },
      bm_number: { type: DataTypes.STRING(50), allowNull: true },
      procurement_order: { type: DataTypes.STRING(50), allowNull: true },
      equipment_name: { type: DataTypes.STRING(200), allowNull: false },
      brand: { type: DataTypes.STRING(100), allowNull: true },
      model: { type: DataTypes.STRING(100), allowNull: true },
      unit: { type: DataTypes.STRING(20), allowNull: true },
      price: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      supplier: { type: DataTypes.STRING(200), allowNull: true },
      created_by: { type: DataTypes.UUID, allowNull: true },
      category_id: { type: DataTypes.UUID, allowNull: true },
      equipment_type: { type: DataTypes.STRING(100), allowNull: true },
      tax_rate: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
      usage_years: { type: DataTypes.INTEGER, allowNull: true },
      warranty_period: { type: DataTypes.INTEGER, allowNull: true },
      accessory_info: { type: DataTypes.TEXT, allowNull: true }
    },
    { tableName: 'asset_dictionary' }
  );

  Department.belongsTo(User, { as: 'manager', foreignKey: 'manager_id' });

  Asset.belongsTo(Category, { as: 'category', foreignKey: 'category_id' });
  Asset.belongsTo(Department, { as: 'department', foreignKey: 'department_id' });
  Asset.belongsTo(User, { as: 'manager', foreignKey: 'managed_by' });

  AssetFlowRecord.belongsTo(Asset, { as: 'asset', foreignKey: 'asset_id' });
  Asset.hasMany(AssetFlowRecord, { as: 'asset_flow_records', foreignKey: 'asset_id' });

  AssetRequest.belongsTo(User, { as: 'creator', foreignKey: 'created_by' });

  ProcurementContract.hasMany(ContractSupplier, { as: 'suppliers', foreignKey: 'contract_id' });
  ContractSupplier.belongsTo(ProcurementContract, { as: 'contract', foreignKey: 'contract_id' });

  SysDictionary.hasMany(SysDictionaryItem, { as: 'items', foreignKey: 'dict_id' });
  SysDictionaryItem.belongsTo(SysDictionary, { as: 'dictionary', foreignKey: 'dict_id' });

  AssetDictionary.belongsTo(User, { as: 'creator', foreignKey: 'created_by' });
  AssetDictionary.belongsTo(Category, { as: 'category', foreignKey: 'category_id' });

  return {
    User,
    Category,
    Department,
    Asset,
    AssetFlowRecord,
    AssetRequest,
    ProcurementContract,
    ContractSupplier,
    SysDictionary,
    SysDictionaryItem,
    AssetDictionary
  };
}

module.exports = { defineModels };
