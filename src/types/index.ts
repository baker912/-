export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  job_title?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  code: string;
  description?: string;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  manager_id?: string;
  created_at: string;
}

export interface Asset {
  id: string;
  asset_code: string;
  name: string;
  description?: string;
  category_id?: string;
  department_id?: string;
  purchase_price?: number;
  purchase_date?: string;
  status: 'in_stock' | 'in_use' | 'maintenance' | 'disposed' | 'scrapped' | 'cleared';
  location?: string;
  managed_by?: string;
  images?: string[];
  created_at: string;
  updated_at: string;
  
  // New fields from migration
  serial_number?: string;
  floor?: string;
  room_type?: string;
  specific_location?: string;
  factory_date?: string;
  arrival_date?: string;
  warranty_years?: number;
  accounting_date?: string;
  manufacturer?: string;
  origin_country?: string;
  planned_retirement_date?: string;
  is_faulty?: boolean;
  entry_person?: string;
  project_name?: string;
  bm_number?: string;
  purchase_order?: string;
  brand?: string;
  model?: string;
  unit?: string;
  equipment_type?: string;
  attachments?: string[];
  employee_name?: string;
  employee_code?: string;
  department_name?: string;
  last_record?: string;

  // Joins
  category?: Category;
  department?: Department;
  manager?: User;
}

export interface AssetStatusHistory {
  id: string;
  asset_id: string;
  operator_id?: string;
  previous_status?: string;
  new_status: string;
  reason?: string;
  changed_at: string;
  
  // Joins
  operator?: User;
}
