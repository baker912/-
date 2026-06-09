import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import { normalizeBoolean, normalizeDateOnly, normalizeDateTimeIso, normalizeNumber, splitSemicolonList } from './excelImport';

function asString(v: any) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

const TOKEN_KEY = 'am_token';
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

function apiUrl(p: string) {
  if (API_BASE_URL) return `${String(API_BASE_URL).replace(/\/+$/, '')}${p}`;
  return p;
}

async function apiPostJson(path: string, body: any) {
  const token = localStorage.getItem(TOKEN_KEY) || '';
  const res = await fetch(apiUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body ?? {})
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const msg = json?.error?.message || json?.message || res.statusText || 'Request failed';
    throw new Error(msg);
  }
  return json;
}

function makeCode(prefix: string) {
  const a = Date.now().toString(36).slice(-8);
  const b = Math.random().toString(36).slice(2, 6);
  return `${prefix}${a}${b}`.slice(0, 20);
}

function normalizeAssetStatus(v: any) {
  const s = asString(v);
  if (!s) return null;
  const lower = s.toLowerCase();
  if (['in_stock', 'in_use', 'maintenance', 'scrapped', 'cleared'].includes(lower)) return lower;
  if (['库存', '在库', '入库'].includes(s)) return 'in_stock';
  if (['在用', '使用中'].includes(s)) return 'in_use';
  if (['维修', '维护'].includes(s)) return 'maintenance';
  if (['报废'].includes(s)) return 'scrapped';
  if (['清运'].includes(s)) return 'cleared';
  return lower;
}

async function ensureCategoryIdByName(name: string) {
  const n = asString(name);
  if (!n) return null;
  const { data: existed } = await supabase.from('categories').select('id,name').eq('name', n).limit(1).single();
  if (existed?.id) return existed.id as string;
  const code = makeCode('CAT');
  const { data: created, error } = await supabase.from('categories').insert({ name: n, code, description: null }).select('*');
  if (error) throw error;
  const row = Array.isArray(created) ? created[0] : created;
  return row?.id as string;
}

async function ensureDepartmentIdByName(name: string) {
  const n = asString(name);
  if (!n) return null;
  const { data: existed } = await supabase.from('departments').select('id,name').eq('name', n).limit(1).single();
  if (existed?.id) return existed.id as string;
  const code = makeCode('DEP');
  const { data: created, error } = await supabase.from('departments').insert({ name: n, code, manager_id: null }).select('*');
  if (error) throw error;
  const row = Array.isArray(created) ? created[0] : created;
  return row?.id as string;
}

async function getCurrentUserId() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id || null;
}

async function batchFetchBy<T = any>(table: string, key: string, values: string[], select = '*') {
  const uniq = Array.from(new Set(values.map(asString).filter(Boolean)));
  if (uniq.length === 0) return [] as T[];
  const { data, error } = await supabase.from(table).select(select).in(key, uniq);
  if (error) throw error;
  return (data || []) as T[];
}

export type ImportResult = {
  inserted: number;
  updated: number;
  failed: number;
  errors: Array<{ row: any; message: string }>;
};

export async function importAssets(rows: any[]): Promise<ImportResult> {
  const errors: ImportResult['errors'] = [];
  const normalized = rows
    .map((r) => ({
      asset_code: asString(r.asset_code),
      name: asString(r.name),
      description: asString(r.description) || null,
      equipment_type: asString(r.equipment_type) || null,
      brand: asString(r.brand) || null,
      model: asString(r.model) || null,
      serial_number: asString(r.serial_number) || null,
      status: normalizeAssetStatus(r.status) || 'in_stock',
      purchase_price: normalizeNumber(r.purchase_price),
      purchase_date: normalizeDateOnly(r.purchase_date),
      arrival_date: normalizeDateOnly(r.arrival_date),
      project_name: asString(r.project_name) || null,
      bm_number: asString(r.bm_number) || null,
      purchase_order: asString(r.purchase_order) || null,
      category_id: asString(r.category_id) || null,
      category_name: asString(r.category_name) || '',
      department_id: asString(r.department_id) || null,
      department_name: asString(r.department_name) || '',
      employee_name: asString(r.employee_name) || null,
      employee_code: asString(r.employee_code) || null,
      location: asString(r.location) || null,
      floor: asString(r.floor) || null,
      room_type: asString(r.room_type) || null,
      specific_location: asString(r.specific_location) || null,
      is_faulty: normalizeBoolean(r.is_faulty),
    }))
    .filter((r) => r.asset_code && r.name);

  const codes = normalized.map((r) => r.asset_code);
  const existed = await batchFetchBy<any>('assets', 'asset_code', codes, 'id,asset_code');
  const existedMap = new Map(existed.map((x: any) => [x.asset_code, x.id]));

  let inserted = 0;
  let updated = 0;

  for (const r of normalized) {
    try {
      let categoryId = r.category_id;
      if (!categoryId && r.category_name) categoryId = await ensureCategoryIdByName(r.category_name);
      let departmentId = r.department_id;
      if (!departmentId && r.department_name) departmentId = await ensureDepartmentIdByName(r.department_name);

      const values: any = {
        asset_code: r.asset_code,
        name: r.name,
        description: r.description,
        equipment_type: r.equipment_type,
        brand: r.brand,
        model: r.model,
        serial_number: r.serial_number,
        status: r.status,
        purchase_price: r.purchase_price,
        purchase_date: r.purchase_date,
        arrival_date: r.arrival_date,
        project_name: r.project_name,
        bm_number: r.bm_number,
        purchase_order: r.purchase_order,
        category_id: categoryId,
        department_id: departmentId,
        employee_name: r.employee_name,
        employee_code: r.employee_code,
        location: r.location,
        floor: r.floor,
        room_type: r.room_type,
        specific_location: r.specific_location,
      };
      if (r.is_faulty !== null) values.is_faulty = r.is_faulty;

      const id = existedMap.get(r.asset_code);
      if (id) {
        const { error } = await supabase.from('assets').update(values).eq('id', id);
        if (error) throw error;
        updated++;
      } else {
        const { error } = await supabase.from('assets').insert(values);
        if (error) throw error;
        inserted++;
      }
    } catch (e: any) {
      errors.push({ row: r, message: e?.message || '导入失败' });
    }
  }

  return { inserted, updated, failed: errors.length, errors };
}

export async function importAssetRequests(rows: any[]): Promise<ImportResult> {
  const errors: ImportResult['errors'] = [];
  const currentUserId = await getCurrentUserId();

  const normalized = rows
    .map((r) => ({
      request_name: asString(r.request_name),
      request_type: asString(r.request_type),
      description: asString(r.description) || null,
      attachment: asString(r.attachment) || null,
      created_by_email: asString(r.created_by_email),
    }))
    .filter((r) => r.request_name && r.request_type);

  let inserted = 0;
  for (const r of normalized) {
    try {
      let createdBy = currentUserId;
      if (r.created_by_email) {
        const { data: u } = await supabase.from('users').select('id,email').eq('email', r.created_by_email).limit(1).single();
        if (u?.id) createdBy = u.id as string;
      }

      const values: any = {
        request_name: r.request_name,
        request_type: r.request_type,
        description: r.description,
        attachment: r.attachment,
        created_by: createdBy
      };
      const { error } = await supabase.from('asset_requests').insert(values);
      if (error) throw error;
      inserted++;
    } catch (e: any) {
      errors.push({ row: r, message: e?.message || '导入失败' });
    }
  }

  return { inserted, updated: 0, failed: errors.length, errors };
}

export async function importProcurementContracts(contracts: any[], suppliers: any[]): Promise<ImportResult> {
  const errors: ImportResult['errors'] = [];
  const currentUserId = await getCurrentUserId();

  const normalizedContracts = contracts
    .map((r) => ({
      project_name: asString(r.project_name),
      bm_number: asString(r.bm_number),
      procurement_order: asString(r.procurement_order),
      project_time: asString(r.project_time) || null,
      description: asString(r.description) || null,
      attachment: asString(r.attachment) || null,
      technical_spec: splitSemicolonList(r.technical_spec),
      other_attachments: splitSemicolonList(r.other_attachments)
    }))
    .filter((r) => r.project_name && r.bm_number && r.procurement_order);

  const bmNumbers = normalizedContracts.map((c) => c.bm_number);
  const existed = await batchFetchBy<any>('procurement_contracts', 'bm_number', bmNumbers, 'id,bm_number,procurement_order');
  const existedMap = new Map(existed.map((x: any) => [`${x.bm_number}||${x.procurement_order}`, x.id]));

  let inserted = 0;
  let updated = 0;

  for (const c of normalizedContracts) {
    try {
      const key = `${c.bm_number}||${c.procurement_order}`;
      const values: any = {
        project_name: c.project_name,
        bm_number: c.bm_number,
        procurement_order: c.procurement_order,
        project_time: c.project_time,
        description: c.description,
        attachment: c.attachment,
        technical_spec: c.technical_spec,
        other_attachments: c.other_attachments,
        created_by: currentUserId
      };

      const id = existedMap.get(key);
      if (id) {
        const { error } = await supabase.from('procurement_contracts').update(values).eq('id', id);
        if (error) throw error;
        updated++;
      } else {
        const { data, error } = await supabase.from('procurement_contracts').insert(values).select('id,bm_number,procurement_order');
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.id) existedMap.set(key, row.id);
        inserted++;
      }
    } catch (e: any) {
      errors.push({ row: c, message: e?.message || '导入失败' });
    }
  }

  const allContracts = await batchFetchBy<any>('procurement_contracts', 'bm_number', bmNumbers, 'id,bm_number,procurement_order');
  const bmContractMap = new Map<string, any[]>();
  for (const x of allContracts) {
    const bm = asString(x.bm_number);
    if (!bm) continue;
    const list = bmContractMap.get(bm) || [];
    list.push(x);
    bmContractMap.set(bm, list);
  }

  function resolveContractId(bm: string, order: string) {
    const b = asString(bm);
    const o = asString(order);
    if (!b) return null;
    if (o) return existedMap.get(`${b}||${o}`) || null;
    const list = bmContractMap.get(b) || [];
    if (list.length === 1) return list[0]?.id || null;
    return null;
  }

  const normalizedSuppliers = suppliers
    .map((r) => ({
      bm_number: asString(r.bm_number),
      procurement_order: asString(r.procurement_order),
      supplier_name: asString(r.supplier_name),
      contact_person: asString(r.contact_person) || null,
      contact_phone: asString(r.contact_phone) || null,
      contract_files: splitSemicolonList(r.contract_files),
      order_files: splitSemicolonList(r.order_files),
      payment_files: splitSemicolonList(r.payment_files),
      acceptance_files: splitSemicolonList(r.acceptance_files),
      remarks: asString(r.remarks) || null
    }))
    .filter((r) => r.bm_number && r.supplier_name);

  const contractIdsToClear = new Set<string>();
  for (const s of normalizedSuppliers) {
    const contractId = resolveContractId(s.bm_number, s.procurement_order);
    if (contractId) contractIdsToClear.add(contractId);
  }
  for (const contractId of contractIdsToClear) {
    await supabase.from('contract_suppliers').delete().eq('contract_id', contractId);
  }

  for (const s of normalizedSuppliers) {
    try {
      const contractId = resolveContractId(s.bm_number, s.procurement_order);
      if (!contractId) {
        if (asString(s.procurement_order)) throw new Error(`找不到合同：${s.bm_number} / ${s.procurement_order}`);
        throw new Error(`找不到合同：${s.bm_number}（未填写采购订单且该 BM 单号不唯一）`);
      }
      const values: any = {
        contract_id: contractId,
        supplier_name: s.supplier_name,
        contact_person: s.contact_person,
        contact_phone: s.contact_phone,
        contract_files: s.contract_files,
        order_files: s.order_files,
        payment_files: s.payment_files,
        acceptance_files: s.acceptance_files,
        remarks: s.remarks
      };
      const { error } = await supabase.from('contract_suppliers').insert(values);
      if (error) throw error;
    } catch (e: any) {
      errors.push({ row: s, message: e?.message || '导入失败' });
    }
  }

  return { inserted, updated, failed: errors.length, errors };
}

export async function importAssetDictionary(rows: any[]): Promise<ImportResult> {
  const errors: ImportResult['errors'] = [];
  const currentUserId = await getCurrentUserId();

  const normalized = rows
    .map((r) => ({
      project_name: asString(r.project_name),
      bm_number: asString(r.bm_number) || null,
      procurement_order: asString(r.procurement_order) || null,
      equipment_name: asString(r.equipment_name),
      equipment_type: asString(r.equipment_type) || null,
      brand: asString(r.brand) || null,
      model: asString(r.model) || null,
      unit: asString(r.unit) || null,
      price: normalizeNumber(r.price),
      tax_rate: normalizeNumber(r.tax_rate),
      usage_years: normalizeNumber(r.usage_years),
      warranty_period: normalizeNumber(r.warranty_period),
      supplier: asString(r.supplier) || null,
      category_id: asString(r.category_id) || null,
      category_name: asString(r.category_name) || '',
      accessory_info: asString(r.accessory_info) || null
    }))
    .filter((r) => r.project_name && r.equipment_name);

  let inserted = 0;

  for (const r of normalized) {
    try {
      let categoryId = r.category_id;
      if (!categoryId && r.category_name) categoryId = await ensureCategoryIdByName(r.category_name);

      const values: any = {
        project_name: r.project_name,
        bm_number: r.bm_number,
        procurement_order: r.procurement_order,
        equipment_name: r.equipment_name,
        equipment_type: r.equipment_type,
        brand: r.brand,
        model: r.model,
        unit: r.unit,
        price: r.price,
        supplier: r.supplier,
        created_by: currentUserId,
        category_id: categoryId,
        tax_rate: r.tax_rate,
        usage_years: r.usage_years,
        warranty_period: r.warranty_period,
        accessory_info: r.accessory_info
      };
      const { error } = await supabase.from('asset_dictionary').insert(values);
      if (error) throw error;
      inserted++;
    } catch (e: any) {
      errors.push({ row: r, message: e?.message || '导入失败' });
    }
  }

  return { inserted, updated: 0, failed: errors.length, errors };
}

export async function importAssetFlowRecords(rows: any[]): Promise<ImportResult> {
  const errors: ImportResult['errors'] = [];

  const normalized = rows
    .map((r) => ({
      asset_code: asString(r.asset_code),
      operation_type: asString(r.operation_type),
      operator: asString(r.operator),
      operation_time: normalizeDateTimeIso(r.operation_time),
      description: asString(r.description) || null,
      related_form_no: asString(r.related_form_no) || null,
      target_employee_name: asString(r.target_employee_name) || null,
      target_employee_code: asString(r.target_employee_code) || null,
      target_department_name: asString(r.target_department_name) || null,
      target_floor: asString(r.target_floor) || null,
      target_room_type: asString(r.target_room_type) || null,
      target_specific_location: asString(r.target_specific_location) || null,
      target_location: asString(r.target_location) || null,
      borrow_start_time: normalizeDateTimeIso(r.borrow_start_time),
      borrow_end_time: normalizeDateTimeIso(r.borrow_end_time),
      return_type: asString(r.return_type) || null
    }))
    .filter((r) => r.asset_code && r.operation_type && r.operator && r.operation_time);

  const codes = normalized.map((r) => r.asset_code);
  const assets = await batchFetchBy<any>('assets', 'asset_code', codes, 'id,asset_code');
  const map = new Map(assets.map((a: any) => [a.asset_code, a.id]));

  let inserted = 0;

  for (const r of normalized) {
    try {
      const assetId = map.get(r.asset_code);
      if (!assetId) throw new Error(`找不到资产编号：${r.asset_code}`);
      const values: any = {
        asset_id: assetId,
        operation_type: r.operation_type,
        operator: r.operator,
        operation_time: r.operation_time,
        description: r.description,
        related_form_no: r.related_form_no,
        target_employee_name: r.target_employee_name,
        target_employee_code: r.target_employee_code,
        target_department_name: r.target_department_name,
        target_floor: r.target_floor,
        target_room_type: r.target_room_type,
        target_specific_location: r.target_specific_location,
        target_location: r.target_location,
        borrow_start_time: r.borrow_start_time,
        borrow_end_time: r.borrow_end_time,
        return_type: r.return_type
      };
      const { error } = await supabase.from('asset_flow_records').insert(values);
      if (error) throw error;
      inserted++;
    } catch (e: any) {
      errors.push({ row: r, message: e?.message || '导入失败' });
    }
  }

  return { inserted, updated: 0, failed: errors.length, errors };
}

export async function importSysDictionary(dictRows: any[], itemRows: any[]): Promise<ImportResult> {
  const errors: ImportResult['errors'] = [];

  const dicts = dictRows
    .map((r) => ({
      code: asString(r.code),
      name: asString(r.name),
      description: asString(r.description) || null
    }))
    .filter((r) => r.code && r.name);

  const codes = dicts.map((d) => d.code);
  const existed = await batchFetchBy<any>('sys_dictionaries', 'code', codes, 'id,code');
  const dictIdMap = new Map(existed.map((d: any) => [d.code, d.id]));

  let inserted = 0;
  let updated = 0;

  for (const d of dicts) {
    try {
      const id = dictIdMap.get(d.code);
      if (id) {
        const { error } = await supabase.from('sys_dictionaries').update({ name: d.name, description: d.description }).eq('id', id);
        if (error) throw error;
        updated++;
      } else {
        const { data, error } = await supabase.from('sys_dictionaries').insert({ code: d.code, name: d.name, description: d.description }).select('id,code');
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        if (row?.id) dictIdMap.set(d.code, row.id);
        inserted++;
      }
    } catch (e: any) {
      errors.push({ row: d, message: e?.message || '导入失败' });
    }
  }

  const items = itemRows
    .map((r) => ({
      dict_code: asString(r.dict_code),
      label: asString(r.label),
      value: asString(r.value),
      sort_order: normalizeNumber(r.sort_order) ?? 0,
      status: normalizeBoolean(r.status) ?? true,
      description: asString(r.description) || null
    }))
    .filter((r) => r.dict_code && r.label && r.value);

  const clearDictIds = new Set<string>();
  for (const it of items) {
    const id = dictIdMap.get(it.dict_code);
    if (id) clearDictIds.add(id);
  }
  for (const dictId of clearDictIds) {
    await supabase.from('sys_dictionary_items').delete().eq('dict_id', dictId);
  }

  for (const it of items) {
    try {
      const dictId = dictIdMap.get(it.dict_code);
      if (!dictId) throw new Error(`找不到字典编码：${it.dict_code}`);
      const values: any = {
        dict_id: dictId,
        label: it.label,
        value: it.value,
        sort_order: it.sort_order,
        status: it.status,
        description: it.description
      };
      const { error } = await supabase.from('sys_dictionary_items').insert(values);
      if (error) throw error;
    } catch (e: any) {
      errors.push({ row: it, message: e?.message || '导入失败' });
    }
  }

  return { inserted, updated, failed: errors.length, errors };
}

export async function importUsers(rows: any[]): Promise<ImportResult> {
  const list = rows
    .map((r) => ({
      email: asString(r.email),
      name: asString(r.name),
      role: asString(r.role) || 'user',
      job_title: asString(r.job_title) || null,
      password: asString(r.password)
    }))
    .filter((r) => r.email && r.name);

  const r = await apiPostJson('/api/admin/users/import', { users: list });
  return {
    inserted: Number(r?.inserted || 0),
    updated: Number(r?.updated || 0),
    failed: Number(r?.failed || 0),
    errors: Array.isArray(r?.errors) ? r.errors : []
  };
}

export function formatImportSummary(r: ImportResult) {
  const parts = [];
  if (r.inserted) parts.push(`新增 ${r.inserted}`);
  if (r.updated) parts.push(`更新 ${r.updated}`);
  if (r.failed) parts.push(`失败 ${r.failed}`);
  return parts.join('，') || '无可导入数据';
}

export function buildErrorReportXlsx(errors: ImportResult['errors']) {
  const ws = XLSX.utils.json_to_sheet((errors || []).map((e) => ({ 错误: e.message, 数据: JSON.stringify(e.row) })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '错误');
  return wb;
}

export function errorReportFileName(prefix: string) {
  return `${prefix}_导入错误_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`;
}
