import React, { useEffect, useState } from 'react';
import { Table, Button, Input, Space, Card, Modal, Form, message, Upload, Row, Col, Typography, Drawer, DatePicker, Dropdown } from 'antd';
import { SearchOutlined, PlusOutlined, UploadOutlined, LinkOutlined, SaveOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, FileTextOutlined, ImportOutlined, ExportOutlined, DownOutlined } from '@ant-design/icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;

interface Supplier {
  id?: string;
  contract_id?: string;
  supplier_name: string;
  contact_person: string;
  contact_phone: string;
  contract_files?: string[];
  order_files?: string[];
  payment_files?: string[];
  acceptance_files?: string[];
  remarks?: string;
}

interface Contract {
  id: string;
  project_name: string;
  project_time: string;
  bm_number: string;
  procurement_order: string;
  technical_spec?: string[];
  other_attachments?: string[];
  description?: string;
  created_at: string;
  suppliers?: Supplier[];
}

const ProcurementContract: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Contract[]>([]);
  const [searchBM, setSearchBM] = useState('');
  const [searchOrder, setSearchOrder] = useState('');
  const { user } = useAuth();
  
  // Drawer/Form State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Contract | null>(null);
  const [form] = Form.useForm();
  
  // Upload States for Main Form
  const [techSpecList, setTechSpecList] = useState<any[]>([]);
  const [otherAttachList, setOtherAttachList] = useState<any[]>([]);

  // Supplier Modal State
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplierIndex, setEditingSupplierIndex] = useState<number>(-1);
  const [supplierForm] = Form.useForm();
  
  // Selection State
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<Contract[]>([]);

  // Upload States for Supplier Form
  const [contractFiles, setContractFiles] = useState<any[]>([]);
  const [orderFiles, setOrderFiles] = useState<any[]>([]);
  const [paymentFiles, setPaymentFiles] = useState<any[]>([]);
  const [acceptanceFiles, setAcceptanceFiles] = useState<any[]>([]);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('procurement_contracts')
        .select(`
          *,
          suppliers:contract_suppliers(*)
        `)
        .order('created_at', { ascending: false });

      if (searchBM) {
        query = query.ilike('bm_number', `%${searchBM}%`);
      }
      if (searchOrder) {
        query = query.ilike('procurement_order', `%${searchOrder}%`);
      }

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

  const handleUpload = async (file: File, bucket: string = 'contract_attachments') => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      message.error('上传失败: ' + error.message);
      throw error;
    }
  };

  const handleSave = async (values: any) => {
    try {
      // 1. Prepare Contract Payload
      const contractPayload = {
        project_name: values.project_name,
        project_time: values.project_time, // Keep as string or date
        bm_number: values.bm_number,
        procurement_order: values.procurement_order,
        technical_spec: values.technical_spec || [],
        other_attachments: values.other_attachments || [],
        description: values.description,
        created_by: user?.id,
      };

      let contractId = editingItem?.id;
      let error;

      if (contractId) {
        delete contractPayload.created_by;
        const { error: updateError } = await supabase
          .from('procurement_contracts')
          .update(contractPayload)
          .eq('id', contractId);
        error = updateError;
      } else {
        const { data: newContract, error: insertError } = await supabase
          .from('procurement_contracts')
          .insert([contractPayload])
          .select()
          .single();
        if (newContract) contractId = newContract.id;
        error = insertError;
      }

      if (error) throw error;

      // 2. Handle Suppliers (Delete existing and re-create for simplicity, or upsert)
      // For simplicity in this demo, we'll delete all old suppliers for this contract and insert new ones
      // In a real high-concurrency app, Upsert or Diff-based update is better.
      if (contractId) {
        // Delete old suppliers
        await supabase.from('contract_suppliers').delete().eq('contract_id', contractId);

        // Insert new suppliers
        if (values.suppliers && values.suppliers.length > 0) {
          const suppliersPayload = values.suppliers.map((s: any) => ({
            contract_id: contractId,
            supplier_name: s.supplier_name,
            contact_person: s.contact_person,
            contact_phone: s.contact_phone,
            contract_files: s.contract_files || [],
            order_files: s.order_files || [],
            payment_files: s.payment_files || [],
            acceptance_files: s.acceptance_files || [],
          }));
          const { error: supplierError } = await supabase.from('contract_suppliers').insert(suppliersPayload);
          if (supplierError) throw supplierError;
        }
      }

      message.success(editingItem ? '更新成功' : '保存成功');
      setIsDrawerOpen(false);
      fetchContracts();
    } catch (error: any) {
      console.error(error);
      message.error('保存失败: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('procurement_contracts').delete().eq('id', id);
      if (error) throw error;
      message.success('删除成功');
      fetchContracts();
    } catch (error: any) {
      message.error('删除失败: ' + error.message);
    }
  };

  const handleEdit = (record: Contract) => {
    setEditingItem(record);
    
    // Initialize file lists
    setTechSpecList((record.technical_spec || []).map((url, i) => ({ uid: `t-${i}`, name: '文件', status: 'done', url })));
    setOtherAttachList((record.other_attachments || []).map((url, i) => ({ uid: `o-${i}`, name: '文件', status: 'done', url })));
    
    // Form values
    form.setFieldsValue({
      ...record,
      suppliers: record.suppliers || []
    });
    
    setIsDrawerOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    setTechSpecList([]);
    setOtherAttachList([]);
    // Default one empty supplier row
    form.setFieldsValue({
      suppliers: [{}]
    });
    setIsDrawerOpen(true);
  };

  const handleSupplierAdd = () => {
    setEditingSupplierIndex(-1);
    supplierForm.resetFields();
    setContractFiles([]);
    setOrderFiles([]);
    setPaymentFiles([]);
    setAcceptanceFiles([]);
    setSupplierModalOpen(true);
  };

  const handleSupplierEdit = (index: number, supplier: any) => {
    setEditingSupplierIndex(index);
    supplierForm.setFieldsValue(supplier);
    
    // Initialize files for modal
    setContractFiles((supplier.contract_files || []).map((url: string, i: number) => ({ uid: `c-${i}`, name: '文件', status: 'done', url })));
    setOrderFiles((supplier.order_files || []).map((url: string, i: number) => ({ uid: `o-${i}`, name: '文件', status: 'done', url })));
    setPaymentFiles((supplier.payment_files || []).map((url: string, i: number) => ({ uid: `p-${i}`, name: '文件', status: 'done', url })));
    setAcceptanceFiles((supplier.acceptance_files || []).map((url: string, i: number) => ({ uid: `a-${i}`, name: '文件', status: 'done', url })));
    
    setSupplierModalOpen(true);
  };

  const handleSupplierSave = () => {
    supplierForm.validateFields().then(values => {
      const currentSuppliers = form.getFieldValue('suppliers') || [];
      const newSupplier = {
        ...values,
        contract_files: contractFiles.map(f => f.url),
        order_files: orderFiles.map(f => f.url),
        payment_files: paymentFiles.map(f => f.url),
        acceptance_files: acceptanceFiles.map(f => f.url),
      };

      let newSuppliers;
      if (editingSupplierIndex > -1) {
        newSuppliers = [...currentSuppliers];
        newSuppliers[editingSupplierIndex] = newSupplier;
      } else {
        newSuppliers = [...currentSuppliers, newSupplier];
      }

      form.setFieldsValue({ suppliers: newSuppliers });
      setSupplierModalOpen(false);
    });
  };

  const handleExport = (type: 'all' | 'selected') => {
    const exportData = type === 'selected' ? selectedRows : data;
    
    if (exportData.length === 0) {
      message.warning('暂无数据可导出');
      return;
    }

    // Flatten data for export, including suppliers if needed (taking first supplier for simplicity or multiple rows)
    // Here we export basic contract info + count of suppliers
    const ws = XLSX.utils.json_to_sheet(exportData.map((item, index) => ({
      序号: index + 1,
      项目名称: item.project_name,
      BM单号: item.bm_number,
      采购订单: item.procurement_order,
      项目时间: item.project_time,
      供应商数量: item.suppliers?.length || 0,
      创建时间: dayjs(item.created_at).format('YYYY-MM-DD HH:mm:ss'),
      备注: item.description
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "采购订单合同");
    XLSX.writeFile(wb, `采购订单合同_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`);
  };

  const importMenu = {
    items: [
      {
        key: 'template',
        label: '下载模版',
        onClick: () => {
          const ws = XLSX.utils.json_to_sheet([
            {
              项目名称: '示例项目',
              BM单号: 'BM000001',
              采购订单: 'PO000001',
              项目时间: '2023-Q1',
              备注: '示例备注'
            }
          ]);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "模版");
          XLSX.writeFile(wb, `采购合同导入模版.xlsx`);
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

  // Custom Upload Component for Table
  const TableUpload = ({ value = [] }: any) => {
    return (
      <div className="flex flex-col gap-1">
        {value && value.length > 0 ? (
          <Space direction="vertical" size={0}>
            {value.map((url: string, index: number) => (
              <div key={index} className="flex items-center text-xs">
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 truncate max-w-[80px] inline-block">
                  文件{index + 1}
                </a>
              </div>
            ))}
          </Space>
        ) : (
          <span className="text-gray-400 text-xs">无文件</span>
        )}
      </div>
    );
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
      title: '项目时间',
      dataIndex: 'project_time',
      key: 'project_time',
    },
    {
      title: '供应商数量',
      key: 'supplier_count',
      render: (_: any, record: Contract) => record.suppliers?.length || 0,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 120,
      render: (_: any, record: Contract) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" danger size="small" onClick={() => {
            Modal.confirm({
              title: '确认删除',
              content: '确定要删除这条采购合同记录吗？',
              onOk: () => handleDelete(record.id)
            });
          }}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Header Filter Area */}
      <div className="bg-white p-4 mb-4 rounded-lg shadow-sm flex justify-between items-center">
        <Space size="large">
          <Space>
            <span className="text-gray-600">BM单号：</span>
            <Input 
              placeholder="请输入" 
              value={searchBM}
              onChange={e => setSearchBM(e.target.value)}
              style={{ width: 180 }}
            />
          </Space>
          <Space>
            <span className="text-gray-600">采购单号：</span>
            <Input 
              placeholder="请输入" 
              value={searchOrder}
              onChange={e => setSearchOrder(e.target.value)}
              style={{ width: 180 }}
            />
          </Space>
          <Button type="primary" icon={<SearchOutlined />} onClick={fetchContracts}>查询</Button>
          <Button icon={<ReloadOutlined />} onClick={() => { setSearchBM(''); setSearchOrder(''); fetchContracts(); }}>重置</Button>
        </Space>
      </div>

      {/* Main Content Area */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
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
          scroll={{ x: 1300 }}
          pagination={{ 
            total: data.length,
            showTotal: (total) => `共 ${total} 条记录`,
            pageSize: 10
          }}
        />
      </div>

      {/* Large Drawer for Add/Edit */}
      <Drawer
        title={editingItem ? "编辑采购订单合同" : "新增采购订单合同"}
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
        >
          {/* Main Info Card */}
          <div className="mb-6">
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  name="project_name"
                  label="项目名称"
                  rules={[{ required: true, message: '请输入项目名称' }]}
                >
                  <Input placeholder="请输入" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="project_time"
                  label="项目时间"
                  rules={[{ required: true, message: '请输入项目时间' }]}
                >
                  <Input placeholder="请输入" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="bm_number"
                  label="BM单号"
                  rules={[{ required: true, message: '请输入BM单号' }]}
                >
                  <Input placeholder="请输入" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="procurement_order"
                  label="采购订单"
                  rules={[{ required: true, message: '请输入采购订单' }]}
                >
                  <Input placeholder="请输入" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item label="技术任务书">
                  <div className="flex flex-col gap-2">
                    <Upload
                      fileList={techSpecList}
                      beforeUpload={async (file) => {
                        const url = await handleUpload(file);
                        const newUrlList = [...(form.getFieldValue('technical_spec') || []), url];
                        form.setFieldsValue({ technical_spec: newUrlList });
                        setTechSpecList([...techSpecList, { uid: file.name, name: file.name, status: 'done', url }]);
                        return false;
                      }}
                      onRemove={(file) => {
                        const newFileList = techSpecList.filter(f => f.uid !== file.uid);
                        setTechSpecList(newFileList);
                        form.setFieldsValue({ technical_spec: newFileList.map(f => f.url) });
                      }}
                      maxCount={9}
                    >
                      <Button type="primary" icon={<UploadOutlined />}>点击上传</Button>
                    </Upload>
                    <Text type="secondary" className="text-xs">最多上传9个附件，每个附件大小不超过30M，格式不限。</Text>
                    <Form.Item name="technical_spec" hidden><Input /></Form.Item>
                  </div>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="其他附件">
                  <div className="flex flex-col gap-2">
                    <Upload
                      fileList={otherAttachList}
                      beforeUpload={async (file) => {
                        const url = await handleUpload(file);
                        const newUrlList = [...(form.getFieldValue('other_attachments') || []), url];
                        form.setFieldsValue({ other_attachments: newUrlList });
                        setOtherAttachList([...otherAttachList, { uid: file.name, name: file.name, status: 'done', url }]);
                        return false;
                      }}
                      onRemove={(file) => {
                        const newFileList = otherAttachList.filter(f => f.uid !== file.uid);
                        setOtherAttachList(newFileList);
                        form.setFieldsValue({ other_attachments: newFileList.map(f => f.url) });
                      }}
                      maxCount={9}
                    >
                      <Button type="primary" icon={<UploadOutlined />}>点击上传</Button>
                    </Upload>
                    <Text type="secondary" className="text-xs">最多上传9个附件，每个附件大小不超过30M，格式不限。</Text>
                    <Form.Item name="other_attachments" hidden><Input /></Form.Item>
                  </div>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="description"
              label="备注说明"
            >
              <Input.TextArea 
                rows={4} 
                placeholder="请输入" 
                maxLength={500} 
                showCount 
              />
            </Form.Item>
          </div>

          <div className="mt-8">
            <div className="flex items-center gap-4 mb-4">
              <span className="font-bold text-base">供应商信息</span>
              <Button 
                type="primary" 
                ghost 
                icon={<PlusOutlined />} 
                onClick={handleSupplierAdd}
              >
                新增一项
              </Button>
            </div>

            <Form.List name="suppliers">
              {(fields, { remove }) => (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-700">
                        <th className="p-2 border border-gray-200 w-12">序号</th>
                        <th className="p-2 border border-gray-200 w-40">供应商</th>
                        <th className="p-2 border border-gray-200 w-24">负责人</th>
                        <th className="p-2 border border-gray-200 w-32">联系方式</th>
                        <th className="p-2 border border-gray-200 w-24">合同</th>
                        <th className="p-2 border border-gray-200 w-24">订单</th>
                        <th className="p-2 border border-gray-200 w-24">付款确认单</th>
                        <th className="p-2 border border-gray-200 w-24">验收材料</th>
                        <th className="p-2 border border-gray-200 w-32">备注</th>
                        <th className="p-2 border border-gray-200 w-20">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, index) => {
                        const supplier = form.getFieldValue(['suppliers', index]);
                        return (
                          <tr key={field.key} className="hover:bg-gray-50">
                            <td className="p-2 border border-gray-200 text-center">{index + 1}</td>
                            <td className="p-2 border border-gray-200">{supplier?.supplier_name}</td>
                            <td className="p-2 border border-gray-200">{supplier?.contact_person}</td>
                            <td className="p-2 border border-gray-200">{supplier?.contact_phone}</td>
                            <td className="p-2 border border-gray-200 text-center">
                              <TableUpload value={supplier?.contract_files} />
                            </td>
                            <td className="p-2 border border-gray-200 text-center">
                              <TableUpload value={supplier?.order_files} />
                            </td>
                            <td className="p-2 border border-gray-200 text-center">
                              <TableUpload value={supplier?.payment_files} />
                            </td>
                            <td className="p-2 border border-gray-200 text-center">
                              <TableUpload value={supplier?.acceptance_files} />
                            </td>
                            <td className="p-2 border border-gray-200 text-center">
                              <div className="truncate max-w-[120px] mx-auto text-gray-500" title={supplier?.remarks}>
                                {supplier?.remarks || '-'}
                              </div>
                            </td>
                            <td className="p-2 border border-gray-200 text-center">
                              <Space size="small">
                                <Button 
                                  type="text" 
                                  size="small" 
                                  icon={<EditOutlined className="text-blue-500" />} 
                                  onClick={() => handleSupplierEdit(index, supplier)}
                                />
                                <Button 
                                  type="text" 
                                  size="small" 
                                  danger 
                                  icon={<DeleteOutlined />} 
                                  onClick={() => remove(field.name)}
                                />
                              </Space>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {fields.length === 0 && (
                    <div className="text-center py-4 text-gray-400 border border-t-0 border-gray-200">
                      暂无供应商信息，请点击上方“新增一项”添加
                    </div>
                  )}
                </div>
              )}
            </Form.List>
          </div>
        </Form>
      </Drawer>

      {/* Supplier Modal */}
      <Modal
        title={<div className="text-center text-lg font-bold pb-2 border-b">新增供应商信息</div>}
        open={supplierModalOpen}
        onCancel={() => setSupplierModalOpen(false)}
        onOk={handleSupplierSave}
        width={600}
        okText="确认"
        cancelText="取消"
        centered
        styles={{ body: { padding: '24px' } }}
      >
        <Form
          form={supplierForm}
          layout="vertical"
        >
          {/* 基本信息分组 */}
          <div className="mb-6">
            <div className="text-base font-medium mb-4 border-l-4 border-blue-500 pl-2">基本信息</div>
            <Form.Item
              name="supplier_name"
              label="供应商"
              rules={[{ required: true, message: '请输入供应商' }]}
            >
              <Input placeholder="请输入供应商名称" />
            </Form.Item>

            <Row gutter={24}>
              <Col span={12}>
                <Form.Item
                  name="contact_person"
                  label="负责人"
                >
                  <Input placeholder="请输入负责人姓名" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="contact_phone"
                  label="联系方式"
                >
                  <Input placeholder="请输入联系电话" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="remarks"
              label="备注"
            >
              <Input.TextArea placeholder="请输入备注信息" rows={2} maxLength={200} showCount />
            </Form.Item>
          </div>

          <div className="border-t my-6"></div>

          {/* 附件资料分组 */}
          <div>
            <div className="text-base font-medium mb-4 border-l-4 border-blue-500 pl-2">附件资料</div>
            <div className="grid grid-cols-1 gap-6">
              {[
                { label: '合同', state: contractFiles, setState: setContractFiles },
                { label: '订单', state: orderFiles, setState: setOrderFiles },
                { label: '付款确认单', state: paymentFiles, setState: setPaymentFiles },
                { label: '验收材料', state: acceptanceFiles, setState: setAcceptanceFiles },
              ].map((item, idx) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-gray-700">{item.label}</span>
                    <Upload
                      fileList={item.state}
                      beforeUpload={async (file) => {
                        const url = await handleUpload(file);
                        item.setState([...item.state, { uid: file.name, name: file.name, status: 'done', url }]);
                        return false;
                      }}
                      onRemove={(file) => {
                        item.setState(item.state.filter(f => f.uid !== file.uid));
                      }}
                      maxCount={9}
                    >
                      <Button type="primary" size="small" icon={<UploadOutlined />}>点击上传</Button>
                    </Upload>
                  </div>
                  <div className="text-xs text-gray-400 mb-2">
                    最多上传9个附件，每个附件大小不超过30M，格式不限。
                  </div>
                  {/* File List Display if needed visually distinct from Upload component default */}
                </div>
              ))}
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ProcurementContract;
