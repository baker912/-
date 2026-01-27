import React, { useEffect, useState } from 'react';
import { Table, Button, Input, InputNumber, Space, Card, Modal, Form, message, Drawer, Row, Col, Typography, Select, Upload, Dropdown } from 'antd';
import { SearchOutlined, PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, ImportOutlined, UploadOutlined, LinkOutlined, ExportOutlined, DownOutlined } from '@ant-design/icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

const { Option } = Select;
const { Title } = Typography;

interface DictionaryItem {
  id: string;
  project_name: string;
  bm_number: string;
  procurement_order: string;
  equipment_name: string;
  brand: string;
  model: string;
  unit: string;
  price: number;
  supplier: string;
  category_id?: string;
  category?: {
    name: string;
  };
  created_by?: string;
  created_at: string;
  creator?: {
    name: string;
    email: string;
  };
  description?: string;
  accessory_info?: string;
  attachment?: string;
  images?: string[];
  usage_years?: number;
}

const AssetDictionary: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DictionaryItem[]>([]);
  const [searchForm] = Form.useForm();
  const { user } = useAuth();
  
  // Drawer/Form State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DictionaryItem | null>(null);
  const [form] = Form.useForm();
  const [projects, setProjects] = useState<any[]>([]);
  const [availableSuppliers, setAvailableSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Selection State
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<DictionaryItem[]>([]);
  
  // Upload State
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    fetchProjects();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*');
    setCategories(data || []);
  };

  const fetchProjects = async () => {
    // Need to fetch contracts with suppliers
    const { data } = await supabase.from('procurement_contracts').select(`
      id, 
      project_name, 
      project_time,
      bm_number, 
      procurement_order, 
      attachment,
      suppliers:contract_suppliers(supplier_name)
    `);
    setProjects(data || []);
  };

  const fetchData = async (filters: any = {}) => {
    setLoading(true);
    try {
      let query = supabase
        .from('asset_dictionary')
        .select(`
          *,
          category:categories(name),
          creator:users(name, email)
        `)
        .order('created_at', { ascending: false });

      if (filters.project_name) query = query.ilike('project_name', `%${filters.project_name}%`);
      if (filters.category_id) query = query.eq('category_id', filters.category_id);
      if (filters.equipment_name) query = query.ilike('equipment_name', `%${filters.equipment_name}%`);
      if (filters.supplier) query = query.ilike('supplier', `%${filters.supplier}%`);
      if (filters.brand) query = query.ilike('brand', `%${filters.brand}%`);
      if (filters.model) query = query.ilike('model', `%${filters.model}%`);

      const { data: result, error } = await query;

      if (error) {
        message.error('获取列表失败: ' + error.message);
      } else {
        setData(result as any || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const values = searchForm.getFieldsValue();
    fetchData(values);
  };

  const handleReset = () => {
    searchForm.resetFields();
    fetchData();
  };

  const handleProjectChange = (value: string) => {
    const project = projects.find(p => p.project_name === value);
    if (project) {
      form.setFieldsValue({
        bm_number: project.bm_number,
        procurement_order: project.procurement_order,
        attachment: project.attachment,
        project_time: project.project_time,
        cost_center: '上海分公司', // Mock value for now, or fetch from project if available
        supplier: undefined // Reset supplier when project changes
      });
      
      // Update available suppliers based on project
      const suppliers = project.suppliers?.map((s: any) => ({ 
        label: s.supplier_name, 
        value: s.supplier_name 
      })) || [];
      
      // Deduplicate suppliers
      const uniqueSuppliers = Array.from(new Map(suppliers.map((item: any) => [item.value, item])).values());
      setAvailableSuppliers(uniqueSuppliers);
    } else {
      setAvailableSuppliers([]);
      form.setFieldsValue({ supplier: undefined });
    }
  };

  const handleSave = async (values: any) => {
    try {
      const payload = {
        ...values,
        created_by: user?.id,
      };

      let error;
      if (editingItem) {
        delete payload.created_by;
        const { error: updateError } = await supabase
          .from('asset_dictionary')
          .update(payload)
          .eq('id', editingItem.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('asset_dictionary')
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      message.success(editingItem ? '更新成功' : '保存成功');
      setIsDrawerOpen(false);
      fetchData(searchForm.getFieldsValue());
    } catch (error: any) {
      message.error('保存失败: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('asset_dictionary').delete().eq('id', id);
      if (error) throw error;
      message.success('删除成功');
      fetchData(searchForm.getFieldsValue());
    } catch (error: any) {
      message.error('删除失败: ' + error.message);
    }
  };

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('request_attachments') // Reuse existing bucket or create new one
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
      
      // Update form images field (array of URLs)
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

  const handleEdit = (record: DictionaryItem) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    
    // Initialize fileList from images array
    if (record.images && record.images.length > 0) {
      setFileList(record.images.map((url, index) => ({
        uid: `-${index}`,
        name: `图片${index + 1}`,
        status: 'done',
        url: url
      })));
    } else {
      setFileList([]);
    }
    
    setIsDrawerOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    setFileList([]);
    setIsDrawerOpen(true);
  };

  const handleExport = (type: 'all' | 'selected') => {
    const exportData = type === 'selected' ? selectedRows : data;
    
    if (exportData.length === 0) {
      message.warning('暂无数据可导出');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(exportData.map((item, index) => ({
      序号: index + 1,
      项目名称: item.project_name,
      品类: item.category?.name || '-',
      BM单号: item.bm_number,
      采购订单: item.procurement_order,
      设备名称: item.equipment_name,
      品牌: item.brand,
      型号: item.model,
      单位: item.unit,
      单价: item.price,
      供应商: item.supplier,
      配件信息: item.accessory_info,
      创建时间: dayjs(item.created_at).format('YYYY-MM-DD HH:mm:ss'),
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "资产类目");
    XLSX.writeFile(wb, `资产类目_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`);
  };

  const importMenu = {
    items: [
      {
        key: 'template',
        label: '下载模版',
        onClick: () => {
          // Generate a template Excel file
          const ws = XLSX.utils.json_to_sheet([
            {
              项目名称: '示例项目',
              设备名称: '示例设备',
              品牌: '示例品牌',
              型号: '示例型号',
              单位: '台',
              单价: 100,
              供货商: '示例供货商',
              配件信息: '示例配件',
              备注信息: '示例备注'
            }
          ]);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "模版");
          XLSX.writeFile(wb, `资产类目导入模版.xlsx`);
        }
      },
      {
        key: 'import',
        label: '导入数据',
        onClick: () => message.info('导入功能开发中')
      },
    ],
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

  const columns = [
    {
      title: '序号',
      key: 'index',
      render: (_: any, __: any, index: number) => index + 1,
      width: 60,
    },
    {
      title: '项目名称',
      dataIndex: 'project_name',
      key: 'project_name',
      width: 150,
    },
    {
      title: '品类',
      dataIndex: ['category', 'name'],
      key: 'category',
      width: 100,
      render: (text: string) => text || '-',
    },
    {
      title: 'BM单号',
      dataIndex: 'bm_number',
      key: 'bm_number',
    },
    {
      title: '采购订单',
      dataIndex: 'procurement_order',
      key: 'procurement_order',
    },
    {
      title: '设备名称',
      dataIndex: 'equipment_name',
      key: 'equipment_name',
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      key: 'brand',
    },
    {
      title: '型号',
      dataIndex: 'model',
      key: 'model',
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
    },
    {
      title: '单价',
      dataIndex: 'price',
      key: 'price',
      render: (val: number) => `¥${val?.toFixed(2) || '0.00'}`,
    },
    {
      title: '供应商',
      dataIndex: 'supplier',
      key: 'supplier',
    },
    {
      title: '创建人',
      dataIndex: ['creator', 'name'],
      key: 'creator',
      render: (text: string, record: DictionaryItem) => text || record.creator?.email || '未知',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
      width: 160,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 120,
      render: (_: any, record: DictionaryItem) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" danger size="small" onClick={() => {
            Modal.confirm({
              title: '确认删除',
              content: '确定要删除这条记录吗？',
              onOk: () => handleDelete(record.id)
            });
          }}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Search Filter Area */}
      <div className="bg-white p-4 mb-4 rounded-lg shadow-sm">
        <Form form={searchForm} layout="inline" className="w-full">
          <Row gutter={[16, 16]} className="w-full">
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="project_name" label="项目名称" className="w-full mb-0">
                <Input placeholder="请输入" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="category_id" label="品类" className="w-full mb-0">
                <Select placeholder="请选择" allowClear>
                  {categories.map((c: any) => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="equipment_name" label="设备名称" className="w-full mb-0">
                <Input placeholder="请输入" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="supplier" label="供应商" className="w-full mb-0">
                <Input placeholder="请输入" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="brand" label="品牌" className="w-full mb-0">
                <Input placeholder="请输入" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="model" label="型号" className="w-full mb-0">
                <Input placeholder="请输入" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={12} xl={12} className="text-right">
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>查找</Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </div>

      {/* Main Content Area */}
      <div className="bg-white p-4 rounded-lg shadow-sm flex-1 flex flex-col">
        <div className="mb-4 flex justify-between items-center">
          <div className="flex gap-2">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增</Button>
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
          dataSource={data} 
          rowKey="id" 
          loading={loading}
          scroll={{ x: 1500 }}
          pagination={{ 
            total: data.length,
            showTotal: (total) => `共 ${total} 条记录`,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSize: 10
          }}
          className="flex-1"
        />
      </div>

      {/* Drawer Form */}
      <Drawer
        title={editingItem ? "编辑资产类目" : "新增资产类目"}
        width={800}
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        extra={
          <Button type="primary" onClick={() => form.submit()}>保存</Button>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          onValuesChange={(changedValues, allValues) => {
            if ('tax_rate' in changedValues || 'price' in changedValues) {
              const price = Number(allValues.price) || 0;
              const rate = Number(allValues.tax_rate) || 0;
              // Ensure we have valid numbers before calculating
              if (!isNaN(price) && !isNaN(rate)) {
                const inclusive = price * rate;
                form.setFieldsValue({ tax_inclusive_price: inclusive });
              }
            }
          }}
        >
          <div className="mb-6">
            <Title level={5} className="mb-4">项目信息</Title>
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
                <Form.Item name="project_time" label="项目时间">
                  <Input disabled className="bg-gray-50" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="bm_number" label="BM单号">
                  <Input disabled className="bg-gray-50" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="procurement_order" label="采购订单">
                  <Input disabled className="bg-gray-50" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="cost_center" label="成本中心">
                  <Input disabled className="bg-gray-50" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="supplier" label="选择供应商" rules={[{ required: true, message: '请选择供应商' }]}>
                  <Select placeholder="请选择" options={availableSuppliers} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="附件文件" shouldUpdate={(prev, curr) => prev.attachment !== curr.attachment}>
                  {({ getFieldValue }) => {
                    const attachment = getFieldValue('attachment');
                    return attachment ? (
                      <div className="flex items-center">
                        <a href={attachment} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 flex items-center">
                          <LinkOutlined className="mr-1" /> 查看附件
                        </a>
                      </div>
                    ) : <span className="text-gray-400">无附件</span>;
                  }}
                </Form.Item>
                <Form.Item name="attachment" hidden><Input /></Form.Item>
              </Col>
            </Row>
          </div>

          <div className="mb-6">
            <Title level={5} className="mb-4">类目信息</Title>
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
                  name="equipment_name"
                  label="设备名称"
                  rules={[{ required: true, message: '请输入设备名称' }]}
                >
                  <Input placeholder="请输入" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="brand"
                  label="品牌"
                  rules={[{ required: true, message: '请输入品牌' }]}
                >
                  <Input placeholder="请输入" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="model"
                  label="型号"
                  rules={[{ required: true, message: '请输入型号' }]}
                >
                  <Input placeholder="请输入" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="unit"
                  label="单位"
                  rules={[{ required: true, message: '请输入单位' }]}
                >
                  <Input placeholder="请输入" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="price"
                  label="单价（不含税）"
                  rules={[{ required: true, message: '请输入单价' }]}
                >
                  <InputNumber 
                    style={{ width: '100%' }} 
                    prefix="¥" 
                    placeholder="请输入" 
                    precision={2}
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
                    step={0.01}
                    placeholder="请输入税率"
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
                    disabled 
                    className="bg-gray-50"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="usage_years"
                  label="使用年限"
                  rules={[{ required: true, message: '请输入使用年限' }]}
                >
                  <InputNumber 
                    style={{ width: '100%' }} 
                    min={0}
                    placeholder="请输入年限"
                    addonAfter="年"
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="accessory_info" label="配件信息">
                  <Input.TextArea rows={4} placeholder="请输入" showCount maxLength={500} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="description" label="备注信息">
                  <Input.TextArea rows={4} placeholder="请输入" showCount maxLength={500} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label="上传图片">
                  <Upload
                    listType="picture-card"
                    fileList={fileList}
                    beforeUpload={handleUpload}
                    onRemove={handleRemoveImage}
                    maxCount={9}
                  >
                    {fileList.length >= 9 ? null : (
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
        </Form>
      </Drawer>
    </div>
  );
};

export default AssetDictionary;
