import * as XLSX from 'xlsx';

export type TemplateField = {
  key: string;
  label: string;
  required?: boolean;
  example?: any;
  note?: string;
};

type TemplateSpec = {
  fileName: string;
  templateRows: Array<Record<string, any>>;
  fields: TemplateField[];
  extraSheets?: Array<{
    name: string;
    fields: TemplateField[];
    rows: Array<Record<string, any>>;
  }>;
};

function buildAoa(fields: TemplateField[], rows: Array<Record<string, any>>) {
  const keys = fields.map((f) => f.key);
  const labels = fields.map((f) => f.label);
  const required = fields.map((f) => (f.required ? '必填' : '可选'));
  const notes = fields.map((f) => f.note || '');
  const dataRows = rows.map((r) => keys.map((k) => (r[k] ?? '') as any));
  return [keys, labels, required, notes, ...dataRows];
}

function buildSpecSheetRows(fields: TemplateField[]) {
  return fields.map((f) => ({
    字段名: f.key,
    字段中文名: f.label,
    是否必填: f.required ? '必填' : '可选',
    示例: f.example ?? '',
    说明: f.note ?? ''
  }));
}

function buildWorkbook(spec: TemplateSpec) {
  const wb = XLSX.utils.book_new();

  const templateWs = XLSX.utils.aoa_to_sheet(buildAoa(spec.fields, spec.templateRows));
  XLSX.utils.book_append_sheet(wb, templateWs, '模板');

  const exampleWs = XLSX.utils.aoa_to_sheet(buildAoa(spec.fields, spec.templateRows));
  XLSX.utils.book_append_sheet(wb, exampleWs, '示例');

  const docsWs = XLSX.utils.json_to_sheet(buildSpecSheetRows(spec.fields));
  XLSX.utils.book_append_sheet(wb, docsWs, '字段说明');

  for (const s of spec.extraSheets || []) {
    const ws = XLSX.utils.aoa_to_sheet(buildAoa(s.fields, s.rows));
    XLSX.utils.book_append_sheet(wb, ws, s.name);
    const wsDocs = XLSX.utils.json_to_sheet(buildSpecSheetRows(s.fields));
    XLSX.utils.book_append_sheet(wb, wsDocs, `${s.name}_字段说明`);
  }

  return wb;
}

const templates: Record<string, TemplateSpec> = {
  assets: {
    fileName: '资产导入模板_含示例.xlsx',
    fields: [
      { key: 'asset_code', label: '资产编号', required: true, example: 'AST-000001', note: '唯一；建议使用公司规则编码' },
      { key: 'name', label: '设备名称', required: true, example: '员工笔记本' },
      { key: 'equipment_type', label: '设备分类', required: false, example: '办公设备' },
      { key: 'brand', label: '品牌', required: false, example: 'Lenovo' },
      { key: 'model', label: '型号', required: false, example: 'ThinkPad X1 Carbon' },
      { key: 'serial_number', label: '设备序列号', required: false, example: 'SN202606090001' },
      { key: 'status', label: '资产状态', required: true, example: 'in_stock', note: '枚举：in_stock/in_use/maintenance/scrapped/cleared' },
      { key: 'purchase_price', label: '采购价格', required: false, example: 8999.0, note: '数字；单位元' },
      { key: 'purchase_date', label: '采购日期', required: false, example: '2026-06-01', note: 'YYYY-MM-DD' },
      { key: 'arrival_date', label: '入库日期', required: false, example: '2026-06-05', note: 'YYYY-MM-DD' },
      { key: 'project_name', label: '项目名称', required: false, example: '上海分公司 IT 设备采购' },
      { key: 'bm_number', label: 'BM单号', required: false, example: 'BM000001' },
      { key: 'purchase_order', label: '采购订单号', required: false, example: 'PO000001' },
      { key: 'category_name', label: '品类名称', required: false, example: '办公设备', note: '可填名称或填 category_id' },
      { key: 'category_id', label: '品类ID', required: false, example: '', note: 'UUID；可留空' },
      { key: 'department_name', label: '部门名称', required: false, example: 'IT开发部', note: '可填名称或填 department_id' },
      { key: 'department_id', label: '部门ID', required: false, example: '', note: 'UUID；可留空' },
      { key: 'employee_name', label: '责任人姓名', required: false, example: '张三', note: '在用资产建议填写' },
      { key: 'employee_code', label: '责任人工号', required: false, example: 'EMP1001' },
      { key: 'location', label: '位置(合并)', required: false, example: '7F 开放办公区 工位-001' },
      { key: 'floor', label: '楼层', required: false, example: '7F' },
      { key: 'room_type', label: '区域类型', required: false, example: '开放办公区' },
      { key: 'specific_location', label: '具体位置', required: false, example: '工位-001' },
      { key: 'is_faulty', label: '是否故障', required: false, example: false, note: 'true/false' },
      { key: 'description', label: '备注描述', required: false, example: '首次入库' }
    ],
    templateRows: [
      {
        asset_code: 'AST-000001',
        name: '员工笔记本',
        equipment_type: '办公设备',
        brand: 'Lenovo',
        model: 'ThinkPad X1 Carbon',
        serial_number: 'SN202606090001',
        status: 'in_stock',
        purchase_price: 8999.0,
        purchase_date: '2026-06-01',
        arrival_date: '2026-06-05',
        project_name: '上海分公司 IT 设备采购',
        bm_number: 'BM000001',
        purchase_order: 'PO000001',
        category_name: '办公设备',
        category_id: '',
        department_name: '',
        department_id: '',
        employee_name: '',
        employee_code: '',
        location: '7F 开放办公区 工位-001',
        floor: '7F',
        room_type: '开放办公区',
        specific_location: '工位-001',
        is_faulty: false,
        description: '首次入库'
      },
      {
        asset_code: 'AST-000002',
        name: '扫码枪',
        equipment_type: '生产设备',
        brand: 'Honeywell',
        model: '1900GHD',
        serial_number: 'SN202606090002',
        status: 'in_use',
        purchase_price: 650.0,
        purchase_date: '2026-05-20',
        arrival_date: '2026-05-25',
        project_name: '仓储升级',
        bm_number: 'BM000002',
        purchase_order: 'PO000002',
        category_name: '生产设备',
        category_id: '',
        department_name: '仓储部',
        department_id: '',
        employee_name: '李四',
        employee_code: 'EMP1002',
        location: '4F 仓库 库房-01',
        floor: '4F',
        room_type: '仓库',
        specific_location: '库房-01',
        is_faulty: false,
        description: '已发放'
      }
    ]
  },
  asset_requests: {
    fileName: '需求导入模板_含示例.xlsx',
    fields: [
      { key: 'request_name', label: '需求名称', required: true, example: '采购员工笔记本' },
      { key: 'request_type', label: '需求类别', required: true, example: '固定资产', note: '可自定义；建议用字典统一' },
      { key: 'description', label: '备注说明', required: false, example: '用于新员工入职' },
      { key: 'attachment', label: '附件URL', required: false, example: 'http://150.158.23.194/storage/request_attachments/demo.pdf' },
      { key: 'created_by_email', label: '创建人邮箱', required: false, example: 'admin@faw-vw.com', note: '可留空；导入时可用当前登录人' },
      { key: 'related_asset_code', label: '关联资产编号', required: false, example: 'AST-000001', note: '如为归还/维修等需求可关联资产' }
    ],
    templateRows: [
      {
        request_name: '采购员工笔记本',
        request_type: '固定资产',
        description: '用于新员工入职',
        attachment: 'http://150.158.23.194/storage/request_attachments/demo.pdf',
        created_by_email: 'admin@faw-vw.com',
        related_asset_code: 'AST-000001'
      },
      {
        request_name: '打印机耗材补充',
        request_type: '耗材',
        description: 'A4 纸 + 墨盒',
        attachment: '',
        created_by_email: 'admin@faw-vw.com',
        related_asset_code: ''
      }
    ]
  },
  procurement_contracts: {
    fileName: '采购合同导入模板_含示例.xlsx',
    fields: [
      { key: 'project_name', label: '项目名称', required: true, example: '上海分公司 IT 设备采购' },
      { key: 'bm_number', label: 'BM单号', required: true, example: 'BM000001' },
      { key: 'procurement_order', label: '采购订单', required: true, example: 'PO000001' },
      { key: 'project_time', label: '项目时间', required: false, example: '2026-Q2', note: '可填 2026-06 或 2026-Q2 等' },
      { key: 'description', label: '备注', required: false, example: '首批设备采购' },
      { key: 'attachment', label: '附件URL', required: false, example: '' },
      { key: 'technical_spec', label: '技术任务书URLs', required: false, example: 'url1;url2', note: '多个用英文分号 ; 分隔' },
      { key: 'other_attachments', label: '其他附件URLs', required: false, example: 'url1;url2', note: '多个用英文分号 ; 分隔' }
    ],
    templateRows: [
      {
        project_name: '上海分公司 IT 设备采购',
        bm_number: 'BM000001',
        procurement_order: 'PO000001',
        project_time: '2026-Q2',
        description: '首批设备采购',
        attachment: '',
        technical_spec: '',
        other_attachments: ''
      }
    ],
    extraSheets: [
      {
        name: '供应商',
        fields: [
          { key: 'bm_number', label: 'BM单号', required: true, example: 'BM000001', note: '用于关联到合同' },
          { key: 'procurement_order', label: '采购订单', required: false, example: 'PO000001' },
          { key: 'supplier_name', label: '供应商名称', required: true, example: '示例供应商有限公司' },
          { key: 'contact_person', label: '联系人', required: false, example: '王五' },
          { key: 'contact_phone', label: '联系电话', required: false, example: '13800138000' },
          { key: 'contract_files', label: '合同文件URLs', required: false, example: 'url1;url2', note: '多个用 ; 分隔' },
          { key: 'order_files', label: '订单文件URLs', required: false, example: 'url1;url2', note: '多个用 ; 分隔' },
          { key: 'payment_files', label: '付款确认URLs', required: false, example: 'url1;url2', note: '多个用 ; 分隔' },
          { key: 'acceptance_files', label: '验收材料URLs', required: false, example: 'url1;url2', note: '多个用 ; 分隔' },
          { key: 'remarks', label: '备注', required: false, example: '开票信息已确认' }
        ],
        rows: [
          {
            bm_number: 'BM000001',
            procurement_order: 'PO000001',
            supplier_name: '示例供应商有限公司',
            contact_person: '王五',
            contact_phone: '13800138000',
            contract_files: '',
            order_files: '',
            payment_files: '',
            acceptance_files: '',
            remarks: '开票信息已确认'
          }
        ]
      }
    ]
  },
  asset_dictionary: {
    fileName: '资产类目导入模板_含示例.xlsx',
    fields: [
      { key: 'project_name', label: '项目名称', required: true, example: '上海分公司 IT 设备采购' },
      { key: 'bm_number', label: 'BM单号', required: false, example: 'BM000001' },
      { key: 'procurement_order', label: '采购订单', required: false, example: 'PO000001' },
      { key: 'equipment_name', label: '设备名称', required: true, example: '员工笔记本' },
      { key: 'equipment_type', label: '设备分类', required: false, example: '办公设备' },
      { key: 'brand', label: '品牌', required: false, example: 'Lenovo' },
      { key: 'model', label: '型号', required: false, example: 'ThinkPad X1 Carbon' },
      { key: 'unit', label: '单位', required: false, example: '台' },
      { key: 'price', label: '单价', required: false, example: 8999.0, note: '数字；单位元' },
      { key: 'tax_rate', label: '税率(%)', required: false, example: 13, note: '数字；例如 13' },
      { key: 'usage_years', label: '使用年限(年)', required: false, example: 5 },
      { key: 'warranty_period', label: '质保期(月)', required: false, example: 24 },
      { key: 'supplier', label: '供应商', required: false, example: '示例供应商有限公司' },
      { key: 'category_name', label: '品类名称', required: false, example: '办公设备', note: '可填名称或填 category_id' },
      { key: 'category_id', label: '品类ID', required: false, example: '' },
      { key: 'accessory_info', label: '配件信息', required: false, example: '电源适配器*1; 鼠标*1', note: '建议用 ; 分隔' }
    ],
    templateRows: [
      {
        project_name: '上海分公司 IT 设备采购',
        bm_number: 'BM000001',
        procurement_order: 'PO000001',
        equipment_name: '员工笔记本',
        equipment_type: '办公设备',
        brand: 'Lenovo',
        model: 'ThinkPad X1 Carbon',
        unit: '台',
        price: 8999.0,
        tax_rate: 13,
        usage_years: 5,
        warranty_period: 24,
        supplier: '示例供应商有限公司',
        category_name: '办公设备',
        category_id: '',
        accessory_info: '电源适配器*1; 鼠标*1'
      }
    ]
  },
  asset_flow_records: {
    fileName: '资产流转记录导入模板_含示例.xlsx',
    fields: [
      { key: 'asset_code', label: '资产编号', required: true, example: 'AST-000002', note: '用于关联资产' },
      { key: 'operation_type', label: '操作类型', required: true, example: 'requisition', note: '枚举：requisition/borrow/return/transfer/scrap/dispose/inbound' },
      { key: 'operator', label: '操作人', required: true, example: '系统管理员' },
      { key: 'operation_time', label: '操作时间', required: true, example: '2026-06-09 10:30:00', note: 'YYYY-MM-DD HH:mm:ss' },
      { key: 'description', label: '说明', required: false, example: '领用给张三' },
      { key: 'related_form_no', label: 'ITSH单号', required: false, example: 'ITSH202606090001' },
      { key: 'target_employee_name', label: '相关人员', required: false, example: '张三' },
      { key: 'target_employee_code', label: '相关工号', required: false, example: 'EMP1001' },
      { key: 'target_department_name', label: '相关部门', required: false, example: 'IT开发部' },
      { key: 'target_floor', label: '目标楼层', required: false, example: '7F' },
      { key: 'target_room_type', label: '目标区域类型', required: false, example: '开放办公区' },
      { key: 'target_specific_location', label: '目标具体位置', required: false, example: '工位-001' },
      { key: 'target_location', label: '目标位置(合并)', required: false, example: '7F 开放办公区 工位-001' },
      { key: 'borrow_start_time', label: '借用开始时间', required: false, example: '2026-06-10 09:00:00', note: '仅 borrow' },
      { key: 'borrow_end_time', label: '借用结束时间', required: false, example: '2026-06-17 18:00:00', note: '仅 borrow' },
      { key: 'return_type', label: '归还类型', required: false, example: 'normal', note: '仅 return；枚举 normal/resignation' }
    ],
    templateRows: [
      {
        asset_code: 'AST-000002',
        operation_type: 'requisition',
        operator: '系统管理员',
        operation_time: '2026-06-09 10:30:00',
        description: '领用给张三',
        related_form_no: 'ITSH202606090001',
        target_employee_name: '张三',
        target_employee_code: 'EMP1001',
        target_department_name: 'IT开发部',
        target_floor: '7F',
        target_room_type: '开放办公区',
        target_specific_location: '工位-001',
        target_location: '7F 开放办公区 工位-001',
        borrow_start_time: '',
        borrow_end_time: '',
        return_type: ''
      },
      {
        asset_code: 'AST-000002',
        operation_type: 'return',
        operator: '系统管理员',
        operation_time: '2026-06-20 17:00:00',
        description: '离职归还入库',
        related_form_no: 'ITSH202606200001',
        target_employee_name: '张三',
        target_employee_code: 'EMP1001',
        target_department_name: 'IT开发部',
        target_floor: '',
        target_room_type: '',
        target_specific_location: '',
        target_location: '',
        borrow_start_time: '',
        borrow_end_time: '',
        return_type: 'resignation'
      }
    ]
  },
  sys_dictionary: {
    fileName: '字典与字典项导入模板_含示例.xlsx',
    fields: [
      { key: 'code', label: '字典编码', required: true, example: 'asset_status', note: '唯一；建议英文小写+下划线' },
      { key: 'name', label: '字典名称', required: true, example: '资产状态' },
      { key: 'description', label: '字典说明', required: false, example: '资产生命周期状态' }
    ],
    templateRows: [
      { code: 'asset_status', name: '资产状态', description: '资产生命周期状态' }
    ],
    extraSheets: [
      {
        name: '字典项',
        fields: [
          { key: 'dict_code', label: '字典编码', required: true, example: 'asset_status', note: '用于关联到字典' },
          { key: 'label', label: '显示名称', required: true, example: '在库' },
          { key: 'value', label: '值', required: true, example: 'in_stock' },
          { key: 'sort_order', label: '排序', required: false, example: 0 },
          { key: 'status', label: '是否启用', required: false, example: true, note: 'true/false' },
          { key: 'description', label: '说明', required: false, example: '库存中' }
        ],
        rows: [
          { dict_code: 'asset_status', label: '在库', value: 'in_stock', sort_order: 0, status: true, description: '库存中' },
          { dict_code: 'asset_status', label: '在用', value: 'in_use', sort_order: 1, status: true, description: '已分配使用人' }
        ]
      }
    ]
  },
  users: {
    fileName: '人员导入模板_含示例.xlsx',
    fields: [
      { key: 'email', label: '邮箱', required: true, example: 'user1@faw-vw.com', note: '唯一' },
      { key: 'name', label: '姓名', required: true, example: '张三' },
      { key: 'role', label: '角色', required: true, example: 'user', note: '枚举：admin/manager/user' },
      { key: 'job_title', label: '职位', required: false, example: '研发工程师' },
      { key: 'password', label: '初始密码', required: true, example: '123456', note: '导入时需后端进行加密存储' }
    ],
    templateRows: [
      { email: 'user1@faw-vw.com', name: '张三', role: 'user', job_title: '研发工程师', password: '123456' },
      { email: 'manager1@faw-vw.com', name: '李四', role: 'manager', job_title: '部门主管', password: '123456' }
    ]
  },
  roles: {
    fileName: '角色导入模板_含示例.xlsx',
    fields: [
      { key: 'role_key', label: '权限字符', required: true, example: 'admin', note: '唯一；用于程序判定' },
      { key: 'role_name', label: '角色名称', required: true, example: '超级管理员' },
      { key: 'sort_order', label: '显示顺序', required: false, example: 1 },
      { key: 'status', label: '是否启用', required: false, example: true, note: 'true/false' },
      { key: 'description', label: '备注', required: false, example: '拥有全部权限' }
    ],
    templateRows: [
      { role_key: 'admin', role_name: '超级管理员', sort_order: 1, status: true, description: '拥有全部权限' },
      { role_key: 'warehouse', role_name: '库房管理员', sort_order: 2, status: true, description: '负责入库/领用/归还' }
    ]
  }
};

export function downloadImportTemplate(key: keyof typeof templates) {
  const spec = templates[key];
  if (!spec) return;
  const wb = buildWorkbook(spec);
  XLSX.writeFile(wb, spec.fileName);
}

