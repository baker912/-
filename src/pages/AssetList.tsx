import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Input, Tag, Card, Modal, Form, Select, DatePicker, InputNumber, message, Drawer, Row, Col, Dropdown, Tabs, Timeline, Upload, Typography } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, ImportOutlined, DownOutlined, ExportOutlined, ReloadOutlined, FileTextOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { supabase } from '../lib/supabase';
import { Asset, Category, Department } from '../types';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

const { Option } = Select;
const { TabPane } = Tabs;
const { Title } = Typography;
const { RangePicker } = DatePicker;

interface AssetFlow {
  id: string;
  operation_type: string; // 资产转移, 资产借用, etc.
  description: string; // 张三将设备...
  operator: string; // 操作人: 张三
  operation_time: string; // 2025-01-01 09:00:00
}

const AssetList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchForm] = Form.useForm();
  
  // Drawer/Modal state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit'>('view');
  const [form] = Form.useForm();
  const [projects, setProjects] = useState<any[]>([]);
  const [availableSuppliers, setAvailableSuppliers] = useState<any[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState<any[]>([]);
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [flowRecords, setFlowRecords] = useState<any[]>([]);

  useEffect(() => {
    if (editingAsset && drawerMode === 'view') {
      fetchFlowRecords(editingAsset.id);
    }
  }, [editingAsset, drawerMode]);

  const fetchFlowRecords = async (assetId: string) => {
    const { data } = await supabase
      .from('asset_flow_records')
      .select('*')
      .eq('asset_id', assetId)
      .order('operation_time', { ascending: false });
    
    setFlowRecords(data || []);
  };
  
  // Timeline Data
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<Asset[]>([]);

  useEffect(() => {
    fetchAssets();
    fetchMetadata();
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data } = await supabase.from('procurement_contracts').select(`
      id, 
      project_name, 
      project_time,
      bm_number, 
      procurement_order, 
      attachment,
      suppliers:contract_suppliers(supplier_name, id)
    `);
    setProjects(data || []);
  };

  const handleProjectChange = (value: string) => {
    const project = projects.find(p => p.project_name === value);
    if (project) {
      form.setFieldsValue({
        bm_number: project.bm_number,
        purchase_order: project.procurement_order,
        // Reset dependent fields
        supplier: undefined,
        name: undefined,
        brand: undefined,
        model: undefined,
        unit: undefined,
        description: undefined,
        price: undefined
      });
      
      const suppliers = project.suppliers?.map((s: any) => ({ 
        label: s.supplier_name, 
        value: s.supplier_name 
      })) || [];
      
      // Deduplicate suppliers
      const uniqueSuppliers = Array.from(new Map(suppliers.map((item: any) => [item.value, item])).values());
      setAvailableSuppliers(uniqueSuppliers);
      setAvailableEquipment([]);
    } else {
      setAvailableSuppliers([]);
      setAvailableEquipment([]);
      form.setFieldsValue({ supplier: undefined, name: undefined });
    }
  };

  const handleSupplierChange = async (value: string) => {
    // Fetch equipment from asset_dictionary based on project and supplier
    const projectName = form.getFieldValue('project_name');
    
    if (projectName && value) {
      const { data } = await supabase
        .from('asset_dictionary')
        .select('*')
        .eq('project_name', projectName)
        .eq('supplier', value);
        
      const equipment = data?.map((item: any) => ({
        label: item.equipment_name,
        value: item.equipment_name,
        category_id: item.category_id, // Add this
        ...item // keep all data to auto-fill
      })) || [];
      
      setAvailableEquipment(equipment);
      form.setFieldsValue({ 
        name: undefined,
        brand: undefined,
        model: undefined,
        unit: undefined,
        description: undefined,
        purchase_price: undefined
      });
    }
  };

  const handleEquipmentChange = (value: string) => {
    const equipment = availableEquipment.find(e => e.value === value);
    if (equipment) {
      const currentRate = equipment.tax_rate || form.getFieldValue('tax_rate') || 0;
      form.setFieldsValue({
        category_id: equipment.category_id, // Auto-fill category
        brand: equipment.brand,
        model: equipment.model, // This maps to asset_code in our logic if we treat model as type code, but here it's descriptive
        unit: equipment.unit,
        description: equipment.accessory_info, // Accessary info to description
        purchase_price: equipment.price,
        tax_rate: equipment.tax_rate,
        warranty_years: equipment.usage_years, // Auto-fill usage years
        tax_inclusive_price: equipment.price && currentRate ? equipment.price * (1 + currentRate / 100) : undefined // Correct calculation
      });
    }
  };

  const calculateMonthsUsed = () => {
    const purchaseDate = form.getFieldValue('purchase_date');
    if (!purchaseDate) return 0;
    
    const now = dayjs();
    const start = dayjs(purchaseDate);
    return Math.max(0, now.diff(start, 'month'));
  };

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${'asset_entry'}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('request_attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('request_attachments')
        .getPublicUrl(filePath);

      setFileList(prev => [...prev, {
        uid: fileName,
        name: file.name,
        status: 'done',
        url: publicUrl
      }]);
      
      const currentImages = form.getFieldValue('images') || [];
      form.setFieldsValue({ images: [...currentImages, publicUrl] });
      
      message.success('上传成功');
      return false;
    } catch (error: any) {
      message.error('上传失败: ' + error.message);
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (file: any) => {
    const newFileList = fileList.filter(item => item.uid !== file.uid);
    setFileList(newFileList);
    const newImages = newFileList.map(item => item.url);
    form.setFieldsValue({ images: newImages });
  };

  const fetchAssets = async (values: any = {}) => {
    setLoading(true);
    try {
      let query = supabase
        .from('assets')
        .select(`
          *,
          category:categories(name),
          department:departments(name)
        `)
        .order('created_at', { ascending: false });

      if (values.name) query = query.ilike('name', `%${values.name}%`);
      if (values.category_id) query = query.eq('category_id', values.category_id);
      if (values.asset_code) query = query.ilike('asset_code', `%${values.asset_code}%`);
      if (values.serial_number) query = query.ilike('serial_number', `%${values.serial_number}%`);
      if (values.employee_code) query = query.ilike('employee_code', `%${values.employee_code}%`);
      if (values.employee_name) query = query.ilike('employee_name', `%${values.employee_name}%`);
      if (values.model) query = query.ilike('model', `%${values.model}%`);
      if (values.brand) query = query.ilike('brand', `%${values.brand}%`);
      if (values.is_faulty !== undefined && values.is_faulty !== null) query = query.eq('is_faulty', values.is_faulty);
      if (values.status) query = query.eq('status', values.status);

      const { data, error } = await query;

      if (error) {
        message.error('获取资产列表失败: ' + error.message);
      } else {
        setAssets(data as any || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    const { data: catData } = await supabase.from('categories').select('*');
    const { data: deptData } = await supabase.from('departments').select('*');
    setCategories(catData || []);
    setDepartments(deptData || []);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('assets').delete().eq('id', id);
      if (error) throw error;
      message.success('删除成功');
      fetchAssets();
    } catch (error: any) {
      message.error('删除失败: ' + error.message);
    }
  };

  const handleEdit = (record: Asset) => {
    setEditingAsset(record);
    form.setFieldsValue({
      ...record,
      purchase_date: record.purchase_date ? dayjs(record.purchase_date) : null,
      factory_date: record.factory_date ? dayjs(record.factory_date) : null,
      arrival_date: record.arrival_date ? dayjs(record.arrival_date) : null,
      accounting_date: record.accounting_date ? dayjs(record.accounting_date) : null,
      planned_retirement_date: record.planned_retirement_date ? dayjs(record.planned_retirement_date) : null,
    });
    setIsDrawerOpen(true);
  };

  const handleAdd = () => {
    setEditingAsset(null);
    form.resetFields();
    // Default values
    form.setFieldsValue({
      status: 'in_stock',
      purchase_date: dayjs(),
      is_faulty: false
    });
    setIsDrawerOpen(true);
  };

  const handleSave = async (values: any) => {
    try {
      const payload = {
        ...values,
        purchase_date: values.purchase_date ? values.purchase_date.format('YYYY-MM-DD') : null,
        factory_date: values.factory_date ? values.factory_date.format('YYYY-MM-DD') : null,
        arrival_date: values.arrival_date ? values.arrival_date.format('YYYY-MM-DD') : null,
        accounting_date: values.accounting_date ? values.accounting_date.format('YYYY-MM-DD') : null,
        planned_retirement_date: values.planned_retirement_date ? values.planned_retirement_date.format('YYYY-MM-DD') : null,
      };

      let error;
      if (editingAsset) {
        const { error: updateError } = await supabase
          .from('assets')
          .update(payload)
          .eq('id', editingAsset.id);
        error = updateError;
      } else {
        // Generate a random asset code if not provided or ensure uniqueness logic (simplified here)
        // In real app, backend or DB trigger handles this often, or frontend generates UUID/Serial
        if (!payload.asset_code) {
           payload.asset_code = 'AST-' + Date.now().toString().slice(-6);
        }
        
        const { error: insertError } = await supabase
          .from('assets')
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      message.success(editingAsset ? '更新成功' : '添加成功');
      setIsDrawerOpen(false);
      fetchAssets();
    } catch (error: any) {
      message.error('保存失败: ' + error.message);
    }
  };

  const handleExport = (type: 'all' | 'selected') => {
    const exportData = type === 'selected' ? selectedRows : assets;
    
    if (exportData.length === 0) {
      message.warning('暂无数据可导出');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(exportData.map((item, index) => ({
      序号: index + 1,
      设备名称: item.name,
      资产编号: item.asset_code,
      设备序列号: item.serial_number,
      资产状态: item.status,
      员工姓名: item.employee_name,
      员工工号: item.employee_code,
      部门: item.department_name,
      更新日期: dayjs(item.updated_at).format('YYYY-MM-DD HH:mm:ss'),
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "资产清单");
    XLSX.writeFile(wb, `资产清单_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`);
  };

  const exportMenu = {
    items: [
      {
        key: 'selected',
        label: '导出选中数据',
        disabled: selectedRowKeys.length === 0,
        onClick: () => handleExport('selected'),
      },
      {
        key: 'all',
        label: '导出全部数据',
        onClick: () => handleExport('all'),
      },
    ],
  };

  const importMenu = {
    items: [
      {
        key: 'template',
        label: '下载模版',
        onClick: () => {
          const ws = XLSX.utils.json_to_sheet([
            {
              资产名称: '示例资产',
              资产编号: 'AST-001',
              分类: '示例分类',
              部门: '示例部门',
              状态: '库存',
              采购价格: 1000,
              采购日期: '2023-01-01',
              存放位置: 'A-101',
              备注描述: '示例备注'
            }
          ]);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "模版");
          XLSX.writeFile(wb, `资产导入模版.xlsx`);
        }
      },
      {
        key: 'import',
        label: '导入数据',
        onClick: () => message.info('导入功能开发中')
      },
    ],
  };

  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'in_use': return { color: 'green', text: '在用' };
      case 'in_stock': return { color: 'default', text: '在库' };
      case 'maintenance': return { color: 'orange', text: '维修' };
      case 'scrapped': return { color: 'red', text: '报废' };
      case 'cleared': return { color: 'default', text: '清运' };
      default: return { color: 'default', text: status };
    }
  };

  const columns = [
    {
      title: '序号',
      key: 'index',
      render: (_: any, __: any, index: number) => index + 1,
      width: 60,
    },
    {
      title: '品类',
      dataIndex: ['category', 'name'],
      key: 'category',
      width: 100,
      render: (text: string) => text || '-',
    },
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '资产编号',
      dataIndex: 'asset_code',
      key: 'asset_code',
    },
    {
      title: '设备序列号',
      dataIndex: 'serial_number',
      key: 'serial_number',
      render: (text: string) => text || '-',
    },
    {
      title: '资产状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const { color, text } = getStatusInfo(status);
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '借用',
      dataIndex: 'project_name', // Assuming project name represents 'borrow' context or similar
      key: 'project_name',
      render: (text: string) => text || 'XXX', // Mock as per image
    },
    {
      title: '员工姓名',
      dataIndex: 'employee_name',
      key: 'employee_name',
      render: (text: string) => text || '-',
    },
    {
      title: '员工工号',
      dataIndex: 'employee_code',
      key: 'employee_code',
      render: (text: string) => text || '-',
    },
    {
      title: '部门',
      dataIndex: 'department_name', // Or use derived department from relation if updated
      key: 'department_name',
      render: (text: string, record: any) => text || record.department?.name || '-',
    },
    {
      title: '最新记录',
      dataIndex: 'last_record',
      key: 'last_record',
      render: (text: string) => text || '-',
    },
    {
      title: '入库时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '更新日期',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 180,
      render: (_: any, record: Asset) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => {
            setDrawerMode('view');
            handleEdit(record);
          }}>详情</Button>
          <Button type="link" size="small" onClick={() => {
            setDrawerMode('edit');
            handleEdit(record);
          }}>编辑</Button>
          <Button type="link" danger size="small" onClick={() => {
            Modal.confirm({
              title: '确认删除',
              content: '确定要删除这个资产吗？此操作不可恢复。',
              onOk: () => handleDelete(record.id)
            });
          }}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="bg-white p-4 mb-4 rounded-lg shadow-sm">
        <Form form={searchForm} layout="inline" className="w-full">
          <Row gutter={[16, 16]} className="w-full">
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="category_id" label="品类" className="w-full mb-0">
                <Select placeholder="请选择" allowClear>
                  {categories.map((c: any) => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="name" label="设备名称" className="w-full mb-0">
                <Input placeholder="请输入" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="asset_code" label="资产编号" className="w-full mb-0">
                <Input placeholder="请输入" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="serial_number" label="设备序列号" className="w-full mb-0">
                <Input placeholder="请输入" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="employee_code" label="员工工号" className="w-full mb-0">
                <Input placeholder="请输入" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="employee_name" label="员工姓名" className="w-full mb-0">
                <Input placeholder="请输入" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="model" label="型号" className="w-full mb-0">
                <Input placeholder="请输入" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="brand" label="品牌" className="w-full mb-0">
                <Input placeholder="请输入" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="is_faulty" label="是否故障" className="w-full mb-0">
                <Select placeholder="请选择" allowClear>
                  <Option value={false}>否</Option>
                  <Option value={true}>是</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="status" label="资产状态" className="w-full mb-0">
                <Select placeholder="请选择" allowClear>
                  <Option value="in_stock">在库</Option>
                  <Option value="in_use">在用</Option>
                  <Option value="scrapped">报废</Option>
                  <Option value="cleared">清运</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="created_at_range" label="入库时间" className="w-full mb-0">
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="updated_at_range" label="更新时间" className="w-full mb-0">
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6} className="text-right">
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchAssets(searchForm.getFieldsValue())}>查找</Button>
                <Button icon={<ReloadOutlined />} onClick={() => {
                  searchForm.resetFields();
                  fetchAssets({});
                }}>重置</Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => {
               setDrawerMode('edit');
               handleAdd();
            }}>资产入库</Button>
            <Dropdown menu={importMenu}>
              <Button icon={<ImportOutlined />}>
                导入 <DownOutlined />
              </Button>
            </Dropdown>
            <Dropdown menu={exportMenu}>
              <Button icon={<ExportOutlined />}>
                导出 <DownOutlined />
              </Button>
            </Dropdown>
          </div>
          {selectedRowKeys.length > 0 && (
            <span className="text-gray-500">已选择 {selectedRowKeys.length} 项</span>
          )}
        </div>
        
        <Table 
          rowSelection={{
            selectedRowKeys,
            onChange: (keys, rows) => {
              setSelectedRowKeys(keys);
              setSelectedRows(rows);
            },
          }}
          columns={columns} 
          dataSource={assets} 
          rowKey="id" 
          loading={loading}
          scroll={{ x: 1300 }}
          pagination={{ pageSize: 10 }}
          className="flex-1"
        />
      </div>

      <Drawer
        title={editingAsset ? (drawerMode === 'view' ? "资产详情" : "编辑资产") : "资产入库"}
        width={1000}
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        extra={
          <Space>
            <Button onClick={() => setIsDrawerOpen(false)}>关闭</Button>
            {drawerMode === 'edit' && (
              <Button type="primary" onClick={() => form.submit()}>保存</Button>
            )}
            {drawerMode === 'view' && (
              <Button type="primary" onClick={() => setDrawerMode('edit')}>编辑</Button>
            )}
          </Space>
        }
      >
        {drawerMode === 'view' ? (
          <Tabs defaultActiveKey="1" items={[
            {
              key: '1',
              label: '设备信息',
              children: (
                <div className="p-4">
                  {/* Project Info Section */}
                  <div className="mb-6 border rounded-lg p-4 bg-white shadow-sm">
                    <div className="font-bold mb-4 text-gray-700 border-b pb-2">项目信息</div>
                    <Row gutter={[24, 16]}>
                      <Col span={12}>
                        <div className="flex"><span className="w-24 text-gray-500">项目名称：</span><span>{editingAsset?.project_name || '-'}</span></div>
                      </Col>
                      <Col span={12}>
                        <div className="flex"><span className="w-24 text-gray-500">BM单号：</span><span>{editingAsset?.bm_number || '-'}</span></div>
                      </Col>
                      <Col span={12}>
                        <div className="flex"><span className="w-24 text-gray-500">采购订单：</span><span>{editingAsset?.purchase_order || '-'}</span></div>
                      </Col>
                      <Col span={24}>
                        <div className="flex items-start">
                          <span className="w-24 text-gray-500">附件文件：</span>
                          <Space direction="vertical">
                             {(editingAsset?.attachments as any[])?.length > 0 ? (
                               (editingAsset?.attachments as any[]).map((file: string, idx: number) => (
                                 <a key={idx} href={file} target="_blank" rel="noreferrer" className="flex items-center text-blue-500">
                                   <FileTextOutlined className="mr-1"/> 文件{idx + 1} <DownloadOutlined className="ml-2"/>
                                 </a>
                               ))
                             ) : <span>无</span>}
                          </Space>
                        </div>
                      </Col>
                    </Row>
                  </div>

                  {/* Device Info Section */}
                  <div className="border rounded-lg p-4 bg-white shadow-sm">
                    <div className="font-bold mb-4 text-gray-700 border-b pb-2">
                      设备信息 
                      <Tag color={getStatusInfo(editingAsset?.status || '').color} className="ml-2">
                        {getStatusInfo(editingAsset?.status || '').text}
                      </Tag>
                    </div>
                    <Row gutter={[24, 16]}>
                      <Col span={12}><div className="flex"><span className="w-24 text-gray-500">设备名称：</span><span>{editingAsset?.name}</span></div></Col>
                      <Col span={12}><div className="flex"><span className="w-24 text-gray-500">品牌：</span><span>{editingAsset?.brand || '-'}</span></div></Col>
                      <Col span={12}><div className="flex"><span className="w-24 text-gray-500">型号：</span><span>{editingAsset?.model || '-'}</span></div></Col>
                      <Col span={12}><div className="flex"><span className="w-24 text-gray-500">单位：</span><span>{editingAsset?.unit || '台'}</span></div></Col>
                      <Col span={24}><div className="flex"><span className="w-24 text-gray-500">备注：</span><span>{editingAsset?.description || '-'}</span></div></Col>
                      <Col span={12}><div className="flex"><span className="w-24 text-gray-500">数量：</span><span>1</span></div></Col>
                      <Col span={12}><div className="flex"><span className="w-24 text-gray-500">单价：</span><span>¥{editingAsset?.purchase_price?.toFixed(2)}</span></div></Col>
                      <Col span={12}><div className="flex"><span className="w-24 text-gray-500">资产编号：</span><span>{editingAsset?.asset_code}</span></div></Col>
                      <Col span={12}><div className="flex"><span className="w-24 text-gray-500">设备序列号：</span><span>{editingAsset?.serial_number || '-'}</span></div></Col>
                      <Col span={12}><div className="flex"><span className="w-24 text-gray-500">出厂时间：</span><span>{editingAsset?.factory_date ? dayjs(editingAsset.factory_date).format('YYYY-MM-DD') : '-'}</span></div></Col>
                      <Col span={12}><div className="flex"><span className="w-24 text-gray-500">到货时间：</span><span>{editingAsset?.arrival_date ? dayjs(editingAsset.arrival_date).format('YYYY-MM-DD') : '-'}</span></div></Col>
                      <Col span={12}><div className="flex"><span className="w-24 text-gray-500">维保年限：</span><span>{editingAsset?.warranty_years ? `${editingAsset.warranty_years}年` : '-'}</span></div></Col>
                      <Col span={12}><div className="flex"><span className="w-24 text-gray-500">入账日期：</span><span>{editingAsset?.accounting_date ? dayjs(editingAsset.accounting_date).format('YYYY-MM-DD') : '-'}</span></div></Col>
                      <Col span={12}><div className="flex"><span className="w-24 text-gray-500">制造厂家：</span><span>{editingAsset?.manufacturer || '-'}</span></div></Col>
                      <Col span={12}><div className="flex"><span className="w-24 text-gray-500">厂家国别：</span><span>{editingAsset?.origin_country || '-'}</span></div></Col>
                      <Col span={12}><div className="flex"><span className="w-24 text-gray-500">计划停止时间：</span><span>{editingAsset?.planned_retirement_date ? dayjs(editingAsset.planned_retirement_date).format('YYYY-MM-DD') : '-'}</span></div></Col>
                      <Col span={12}><div className="flex"><span className="w-24 text-gray-500">是否故障：</span><span>{editingAsset?.is_faulty ? '是' : '否'}</span></div></Col>
                      <Col span={12}><div className="flex"><span className="w-24 text-gray-500">入库时间：</span><span>{editingAsset?.created_at ? dayjs(editingAsset.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}</span></div></Col>
                      <Col span={12}><div className="flex"><span className="w-24 text-gray-500">入库员：</span><span>{editingAsset?.entry_person || '-'}</span></div></Col>
                    </Row>
                  </div>
                </div>
              )
            },
            {
              key: '2',
              label: '使用信息',
              children: (
                <div className="p-4">
                  <div className="border rounded-lg p-8 bg-white shadow-sm">
                     <Row gutter={[48, 24]}>
                        <Col span={12}>
                          <div className="flex items-center"><span className="w-24 text-right mr-4 text-gray-500">使用状态：</span><div className="bg-gray-100 px-3 py-1 rounded flex-1">{getStatusInfo(editingAsset?.status || '').text}</div></div>
                        </Col>
                        <Col span={12}>
                          <div className="flex items-center"><span className="w-24 text-right mr-4 text-gray-500">楼层：</span><div className="bg-gray-100 px-3 py-1 rounded flex-1">{editingAsset?.floor || '-'}</div></div>
                        </Col>
                        <Col span={12}>
                          <div className="flex items-center"><span className="w-24 text-right mr-4 text-gray-500">空间属性：</span><div className="bg-gray-100 px-3 py-1 rounded flex-1">{editingAsset?.room_type || '-'}</div></div>
                        </Col>
                        <Col span={12}>
                          <div className="flex items-center"><span className="w-24 text-right mr-4 text-gray-500">具体位置：</span><div className="bg-gray-100 px-3 py-1 rounded flex-1">{editingAsset?.specific_location || editingAsset?.location || '-'}</div></div>
                        </Col>
                        <Col span={12}>
                          <div className="flex items-center"><span className="w-24 text-right mr-4 text-gray-500">员工姓名：</span><div className="bg-gray-100 px-3 py-1 rounded flex-1">{editingAsset?.employee_name || '-'}</div></div>
                        </Col>
                        <Col span={12}>
                          <div className="flex items-center"><span className="w-24 text-right mr-4 text-gray-500">部门：</span><div className="bg-gray-100 px-3 py-1 rounded flex-1">{editingAsset?.department_name || '-'}</div></div>
                        </Col>
                        <Col span={12}>
                          <div className="flex items-center"><span className="w-24 text-right mr-4 text-gray-500">员工工号：</span><div className="bg-gray-100 px-3 py-1 rounded flex-1">{editingAsset?.employee_code || '-'}</div></div>
                        </Col>
                        <Col span={12}>
                          <div className="flex items-center"><span className="w-24 text-right mr-4 text-gray-500">使用时间：</span><div className="bg-gray-100 px-3 py-1 rounded flex-1">-</div></div>
                        </Col>
                     </Row>
                  </div>
                </div>
              )
            },
            {
              key: '3',
              label: '流转记录',
              children: (
                <div className="p-4">
                  <div className="border rounded-lg p-6 bg-white shadow-sm">
                    <div className="font-bold mb-6 text-base">流转记录</div>
                    {/* Real Data for Timeline */}
                    <Timeline
                      items={flowRecords.length > 0 ? flowRecords.map(record => ({
                        color: 'blue',
                        children: (
                          <div className="border border-blue-200 rounded p-3 mb-4 bg-white">
                            <div className="font-bold text-gray-700 mb-1">
                              {record.operation_type === 'requisition' && '资产领用'}
                              {record.operation_type === 'return' && '资产归还'}
                              {record.operation_type === 'borrow' && '资产借用'}
                              {record.operation_type === 'transfer' && '资产转移'}
                              {record.operation_type === 'scrap' && '资产报废'}
                              {record.operation_type === 'dispose' && '资产清运'}
                            </div>
                            <div className="text-blue-500 mb-2">
                              {record.operator} 于 {dayjs(record.operation_time).format('YYYY-MM-DD HH:mm:ss')} 进行操作。
                              {record.description && <div>备注：{record.description}</div>}
                              {record.target_employee_name && <div>涉及人员：{record.target_employee_name}</div>}
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>操作人：{record.operator}</span>
                              <span>{dayjs(record.operation_time).format('YYYY-MM-DD HH:mm:ss')}</span>
                            </div>
                          </div>
                        )
                      })) : [
                        {
                          color: 'gray',
                          children: '暂无流转记录'
                        }
                      ]}
                    />
                  </div>
                </div>
              )
            }
          ]} />
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
            onValuesChange={(changedValues, allValues) => {
              if ('tax_rate' in changedValues || 'purchase_price' in changedValues) {
                const price = Number(allValues.purchase_price) || 0;
                const rate = Number(allValues.tax_rate) || 0;
                // Ensure we have valid numbers before calculating
                if (!isNaN(price) && !isNaN(rate)) {
                  const inclusive = price * rate;
                  form.setFieldsValue({ tax_inclusive_price: inclusive });
                }
              }
            }}
          >
            {/* Project Information Section */}
            <div className="mb-6">
              <Title level={5} className="mb-4 text-gray-700">项目信息</Title>
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    name="project_name"
                    label="项目名称"
                    rules={[{ required: true, message: '请选择项目名称' }]}
                  >
                    <Select 
                      placeholder="请选择" 
                      onChange={handleProjectChange}
                      showSearch
                      optionFilterProp="children"
                    >
                      {projects.map(p => (
                        <Option key={p.id} value={p.project_name}>{p.project_name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="成本中心">
                    <Input disabled className="bg-gray-50" value="上海分公司" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="bm_number" label="BM单号">
                    <Input disabled className="bg-gray-50" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="purchase_order" label="采购订单">
                    <Input disabled className="bg-gray-50" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="supplier"
                    label="供应商"
                    rules={[{ required: true, message: '请选择供应商' }]}
                  >
                    <Select 
                      placeholder="请选择" 
                      onChange={handleSupplierChange}
                      options={availableSuppliers}
                      disabled={!form.getFieldValue('project_name')}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* Equipment Information Section */}
            <div className="mb-6">
              <Title level={5} className="mb-4 text-gray-700">设备信息</Title>
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    name="category_id"
                    label="品类"
                    rules={[{ required: true, message: '请选择品类' }]}
                  >
                    <Select placeholder="请选择">
                      {categories.map((c: any) => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="设备名称"
                    rules={[{ required: true, message: '请选择设备名称' }]}
                  >
                    <Select 
                      placeholder="请选择" 
                      onChange={handleEquipmentChange}
                      options={availableEquipment}
                      disabled={!form.getFieldValue('supplier')}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="brand" label="品牌">
                    <Input disabled className="bg-gray-50" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="model" label="型号">
                    <Input disabled className="bg-gray-50" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="unit" label="单位">
                    <Input disabled className="bg-gray-50" />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="description" label="配件信息">
                    <Input.TextArea rows={3} disabled className="bg-gray-50" />
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* Entry Information Section */}
            <div className="mb-6">
              <Title level={5} className="mb-4 text-gray-700">入库信息</Title>
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    name="asset_code"
                    label="资产编号"
                    rules={[{ required: true, message: '请输入资产编号' }]}
                  >
                    <Input placeholder="请输入资产编号" disabled={!!editingAsset} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item 
                    name="serial_number" 
                    label="设备序列号"
                    rules={[{ required: true, message: '请输入设备序列号' }]}
                  >
                    <Input placeholder="请输入" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="purchase_price"
                    label="单价"
                  >
                    <InputNumber 
                      style={{ width: '100%' }} 
                      prefix="¥" 
                      precision={2}
                      disabled className="bg-gray-50"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="warranty_years"
                    label="使用年限"
                  >
                    <InputNumber 
                      style={{ width: '100%' }} 
                      addonAfter="年"
                      disabled className="bg-gray-50"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="tax_rate"
                    label="税率"
                  >
                    <InputNumber 
                      style={{ width: '100%' }} 
                      formatter={value => `${value}%`}
                      parser={value => value?.replace('%', '') as unknown as number}
                      disabled className="bg-gray-50"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="tax_inclusive_price"
                    label="含税价格"
                  >
                    <InputNumber 
                      style={{ width: '100%' }} 
                      prefix="¥" 
                      precision={2}
                      disabled className="bg-gray-50"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="status"
                    label="状态"
                    initialValue="in_stock"
                    rules={[{ required: true }]}
                  >
                    <Select>
                      <Option value="in_stock">在库</Option>
                      <Option value="in_use">在用</Option>
                      <Option value="scrapped">报废</Option>
                      <Option value="cleared">清运</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="is_faulty"
                    label="是否故障"
                    initialValue={false}
                  >
                    <Select>
                      <Option value={false}>否</Option>
                      <Option value={true}>是</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="purchase_date"
                    label="入账时间"
                  >
                    <DatePicker showTime style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="已使用月数">
                    <Input 
                      value={`${calculateMonthsUsed()}个月`} 
                      disabled 
                      className="bg-gray-50"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="factory_date" label="出厂时间">
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="arrival_date" label="到货时间">
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                {/* warranty_years has been moved next to purchase_price */}
                <Col span={12}>
                  <Form.Item name="accounting_date" label="入账日期">
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="manufacturer" label="制造厂家">
                    <Input placeholder="请输入" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="origin_country" label="厂家国别">
                    <Input placeholder="请输入" />
                  </Form.Item>
                </Col>
                {/* planned_retirement_date replaced by calculated months used */}
                <Col span={24}>
                  <Form.Item label="设备照片">
                    <Upload
                      listType="picture-card"
                      fileList={fileList}
                      beforeUpload={handleUpload}
                      onRemove={handleRemoveImage}
                      maxCount={5}
                    >
                      {fileList.length >= 5 ? null : (
                        <div>
                          <PlusOutlined />
                          <div style={{ marginTop: 8 }}>上传</div>
                        </div>
                      )}
                    </Upload>
                    <Form.Item name="images" hidden><Input /></Form.Item>
                  </Form.Item>
                </Col>
              </Row>
            </div>

            {/* User Information Section */}
            <div className="mb-6">
              <Title level={5} className="mb-4 text-gray-700">使用信息</Title>
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    name="floor"
                    label="入库楼层"
                  >
                    <Input placeholder="请输入" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="room_type"
                    label="空间属性"
                  >
                    <Input placeholder="请输入" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="specific_location"
                    label="具体位置"
                  >
                    <Input placeholder="请输入" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="employee_name"
                    label="员工姓名"
                  >
                    <Input placeholder="请输入" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="employee_code"
                    label="员工工号"
                  >
                    <Input placeholder="请输入" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="department_name"
                    label="部门"
                  >
                    <Input placeholder="请输入" />
                  </Form.Item>
                </Col>
              </Row>
            </div>
          </Form>
        )}
      </Drawer>
    </div>
  );
};

export default AssetList;
