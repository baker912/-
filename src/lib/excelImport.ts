import * as XLSX from 'xlsx';

export type ParsedWorkbook = Record<string, any[]>;

function asString(v: any) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function isEmptyRow(row: any[]) {
  return row.every((c) => asString(c) === '');
}

function normalizeSheetName(name: string) {
  return asString(name) || 'Sheet1';
}

function looksLikeFieldKey(v: any) {
  const s = asString(v);
  if (!s) return false;
  return /^[a-z][a-z0-9_]*$/i.test(s);
}

function containsTemplateMetaHints(row: any[]) {
  return row.some((c) => {
    const s = asString(c);
    return s === '必填' || s === '可选';
  });
}

function pickHeaderRowIndex(aoa: any[][]) {
  const maxScan = Math.min(10, aoa.length);
  let bestIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < maxScan; i++) {
    const row = aoa[i] || [];
    if (!row.length || isEmptyRow(row)) continue;
    const score = row.filter(looksLikeFieldKey).length;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return { index: bestIdx, score: bestScore };
}

function getSheet(wb: XLSX.WorkBook, sheetName: string) {
  const exact = wb.Sheets?.[sheetName];
  if (exact) return exact;
  const wanted = normalizeSheetName(sheetName);
  const found = (wb.SheetNames || []).find((n) => normalizeSheetName(n) === wanted);
  if (found) return wb.Sheets?.[found];
  return null;
}

function parseTemplateSheetFromWb(wb: XLSX.WorkBook, sheetName = '模板'): any[] {
  const ws = getSheet(wb, sheetName);
  if (!ws) {
    const available = (wb.SheetNames || []).join('、') || '无';
    throw new Error(`找不到工作表「${sheetName}」，当前文件包含：${available}`);
  }

  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as any[][];
  if (!aoa || aoa.length === 0) return [];

  const { index: headerIdx, score } = pickHeaderRowIndex(aoa);
  if (score <= 0) return [];

  const keysRow = (aoa[headerIdx] || []).map(asString);
  let startIdx = headerIdx + 1;
  const metaRows = [aoa[headerIdx + 1] || [], aoa[headerIdx + 2] || [], aoa[headerIdx + 3] || []];
  if (metaRows.some(containsTemplateMetaHints)) startIdx = headerIdx + 4;

  const out: any[] = [];
  for (let i = startIdx; i < aoa.length; i++) {
    const row = aoa[i] || [];
    if (row.length === 0 || isEmptyRow(row)) continue;
    const obj: any = {};
    for (let c = 0; c < keysRow.length; c++) {
      const k = keysRow[c];
      if (!k) continue;
      const v = row[c];
      if (v === undefined) continue;
      obj[k] = v;
    }
    if (Object.keys(obj).length > 0) out.push(obj);
  }
  return out;
}

export async function readWorkbook(file: File): Promise<XLSX.WorkBook> {
  const buf = await file.arrayBuffer();
  return XLSX.read(buf, { type: 'array' });
}

export function parseTemplateSheets(wb: XLSX.WorkBook, sheetNames: string[]): ParsedWorkbook {
  const out: ParsedWorkbook = {};
  for (const rawName of sheetNames) {
    const name = normalizeSheetName(rawName);
    out[name] = parseTemplateSheetFromWb(wb, name);
  }
  return out;
}

export function splitSemicolonList(v: any) {
  const s = asString(v);
  if (!s) return [];
  return s
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean);
}

export function normalizeBoolean(v: any): boolean | null {
  if (v === null || v === undefined || asString(v) === '') return null;
  if (typeof v === 'boolean') return v;
  const s = asString(v).toLowerCase();
  if (['true', '1', 'yes', 'y', '是', '对'].includes(s)) return true;
  if (['false', '0', 'no', 'n', '否', '错'].includes(s)) return false;
  return null;
}

export function normalizeNumber(v: any): number | null {
  if (v === null || v === undefined || asString(v) === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(asString(v).replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  return n;
}

function excelDateNumberToDate(n: number): Date | null {
  const parsed = XLSX.SSF.parse_date_code(n);
  if (!parsed) return null;
  const dt = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, Math.floor(parsed.S || 0)));
  return Number.isFinite(dt.getTime()) ? dt : null;
}

export function normalizeDateOnly(v: any): string | null {
  if (v === null || v === undefined || asString(v) === '') return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    const dt = excelDateNumberToDate(v);
    return dt ? dt.toISOString().slice(0, 10) : null;
  }
  const s = asString(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dt = new Date(s);
  if (Number.isFinite(dt.getTime())) return dt.toISOString().slice(0, 10);
  return null;
}

export function normalizeDateTimeIso(v: any): string | null {
  if (v === null || v === undefined || asString(v) === '') return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'number') {
    const dt = excelDateNumberToDate(v);
    return dt ? dt.toISOString() : null;
  }
  const s = asString(v);
  if (!s) return null;
  const dt = new Date(s.replace(' ', 'T'));
  if (Number.isFinite(dt.getTime())) return dt.toISOString();
  return null;
}
