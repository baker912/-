import React, { useEffect, useState } from 'react';
import { Table, Button, Input, Space, Card, Modal, Form, Select, message, Drawer, Tag, Upload, Dropdown, Row, Col } from 'antd';
import { SearchOutlined, PlusOutlined, ReloadOutlined, UploadOutlined, LinkOutlined, ImportOutlined, DownOutlined, ExportOutlined } from '@ant-design/icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

const { Option } = Select;

interface AssetRequest {
  id: string;
  request_name: string;
  request_type: string;
  attachment?: string;
  description?: string;
  created_by?: string;
  created_at: string;
  related_asset_id?: string;
  creator?: {
    name: string;
    email: string;
  };
}

const RequestList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AssetRequest[]>([]);
  const [searchText, setSearchText] = useState('');
  const { user } = useAuth();
  
  // New state for dropdowns
  const [usersList, setUsersList] = useState<any[]>([]);
  const [assetsList, setAssetsList] = useState<any[]>([]);
  
  // Drawer/Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AssetRequest | null>(null);
  const [form] = Form.useForm();
  
  // Upload state
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);

  useEffect(() => {
    fetchRequests();
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      // Fetch users with departments
      // Note: This assumes users table has department_id or we join differently. 
      // Since I added department_id to users, I should join it.
      // But users table might not have department_id populated yet.
      // Let's check if we can join departments on users.department_id
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          *,
          department:department_id(id, name)
        `);
      
      if (usersError) console.error('Error fetching users:', usersError);
      setUsersList(usersData || []);

      // Fetch all assets for selection
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select('id, name, asset_code, model');
        
      if (assetsError) console.error('Error fetching assets:', assetsError);
      setAssetsList(assetsData || []);
    } catch (error) {
      console.error('Error fetching metadata:', error);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('asset_requests')
        .select(`
          *,
          creator:created_by(name, email)
        `)
        .order('created_at', { ascending: false });

      if (searchText) {
        query = query.ilike('request_name', `%${searchText}%`);
      }

      const { data: result, error } = await query;

      if (error) {
        message.error('获取需求列表失败: ' + error.message);
      } else {
        setData(result as any || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('asset_requests').delete().eq('id', id);
      if (error) throw error;
      message.success('删除成功');
      fetchRequests();
    } catch (error: any) {
      message.error('删除失败: ' + error.message);
    }
  };

  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

  // Filter state for Asset Modal
  const [assetSearchText, setAssetSearchText] = useState('');
  const [filteredAssets, setFilteredAssets] = useState<any[]>([]);

  useEffect(() => {
    if (isAssetModalOpen) {
      setFilteredAssets(assetsList);
    }
  }, [isAssetModalOpen, assetsList]);

  const handleAssetSearch = (value: string) => {
    setAssetSearchText(value);
    const filtered = assetsList.filter(asset => 
      asset.name?.toLowerCase().includes(value.toLowerCase()) || 
      asset.asset_code?.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredAssets(filtered);
  };

  const handleAssetSelect = (asset: any) => {
    setSelectedAsset(asset);
    form.setFieldsValue({ related_asset_id: asset.id });
    setIsAssetModalOpen(false);
  };

  const handleEdit = (record: AssetRequest) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    
    // Find and set selected asset for display
    if (record.related_asset_id) {
        const asset = assetsList.find(a => a.id === record.related_asset_id);
        setSelectedAsset(asset);
    } else {
        setSelectedAsset(null);
    }

    // Initialize fileList if attachment exists
    if (record.attachment) {
      setFileList([{
        uid: '-1',
        name: '已上传附件',
        status: 'done',
        url: record.attachment,
      }]);
    } else {
      setFileList([]);
    }
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setSelectedAsset(null);
    form.resetFields();
    form.setFieldsValue({ quantity: 1 }); // Default quantity
    setFileList([]);
    setIsModalOpen(true);
  };

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('request_attachments')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('request_attachments')
        .getPublicUrl(filePath);

      setFileList([{
        uid: fileName,
        name: file.name,
        status: 'done',
        url: publicUrl
      }]);
      
      form.setFieldsValue({ attachment: publicUrl });
      message.success('上传成功');
      return false; // Prevent default upload behavior
    } catch (error: any) {
      message.error('上传失败: ' + error.message);
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setFileList([]);
    form.setFieldsValue({ attachment: '' });
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
          .from('asset_requests')
          .update(payload)
          .eq('id', editingItem.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('asset_requests')
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      message.success(editingItem ? '更新成功' : '添加成功');
      setIsModalOpen(false);
      fetchRequests();
    } catch (error: any) {
      message.error('保存失败: ' + error.message);
    }
  };

  const importMenu = {
    items: [
      {
        key: 'template',
        label: '下载模版',
        onClick: () => {
          const ws = XLSX.utils.json_to_sheet([
            {
              需求名称: '示例需求',
              需求类别: '固定资产',
              备注说明: '示例备注'
            }
          ]);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "模版");
          XLSX.writeFile(wb, `需求导入模版.xlsx`);
        }
      },
      {
        key: 'import',
        label: '导入数据',
        onClick: () => message.info('导入功能开发中')
      },
    ],
  };

  const columns = [
    {
      title: '序号',
      key: 'index',
      render: (_: any, __: any, index: number) => index + 1,
      width: 80,
    },
    {
      title: '需求名称',
      dataIndex: 'request_name',
      key: 'request_name',
    },
    {
      title: '需求类别',
      dataIndex: 'request_type',
      key: 'request_type',
      render: (type: string) => <Tag color="blue">{type}</Tag>
    },
    {
      title: '附件',
      dataIndex: 'attachment',
      key: 'attachment',
      render: (text: string) => text ? (
        <a href={text} target="_blank" rel="noopener noreferrer">
          <LinkOutlined /> 查看附件
        </a>
      ) : '无',
    },
    {
      title: '备注说明',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '创建人',
      dataIndex: ['creator', 'name'],
      key: 'creator',
      render: (text: string, record: AssetRequest) => text || record.creator?.email || '未知',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right' as const,
      width: 120,
      render: (_: any, record: AssetRequest) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" danger size="small" onClick={() => {
            Modal.confirm({
              title: '确认删除',
              content: '确定要删除这条需求记录吗？',
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
        <div className="flex items-center gap-4">
          <span className="text-gray-600">需求名称：</span>
          <Input 
            placeholder="请输入" 
            style={{ width: 200 }} 
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onPressEnter={fetchRequests}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={fetchRequests}>查找</Button>
          <Button icon={<ReloadOutlined />} onClick={() => { setSearchText(''); fetchRequests(); }}>重置</Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="mb-4 flex gap-2">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>新增</Button>
          <Dropdown menu={importMenu}>
            <Button icon={<ImportOutlined />}>
              导入 <DownOutlined />
            </Button>
          </Dropdown>
        </div>
        
        <Table 
          columns={columns} 
          dataSource={data} 
          rowKey="id" 
          loading={loading}
          scroll={{ x: 1300 }}
          pagination={{ 
            total: data.length,
            showTotal: (total, range) => `共 ${total} 条记录 第 ${Math.ceil(range[1] / 10)}/${Math.ceil(total / 10)} 页`,
            showSizeChanger: true,
            showQuickJumper: true
          }}
        />
      </div>

      {/* Edit/Add Modal */}
      <Modal
        title={editingItem ? "编辑需求" : "新增需求"}
        width={800}
        onCancel={() => setIsModalOpen(false)}
        open={isModalOpen}
        footer={[
          <Button key="cancel" onClick={() => setIsModalOpen(false)}>取消</Button>,
          <Button key="submit" type="primary" onClick={() => form.submit()}>提交</Button>
        ]}
        centered
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="request_name"
                label="需求名称"
                rules={[{ required: true, message: '请输入需求名称' }]}
              >
                <Input placeholder="请输入需求名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="request_type"
                label="需求类别"
                rules={[{ required: true, message: '请选择需求类别' }]}
              >
                <Select placeholder="请选择">
                  <Option value="高级经理需求">高级经理需求</Option>
                  <Option value="经理需求">经理需求</Option>
                  <Option value="主管需求">主管需求</Option>
                  <Option value="员工需求">员工需求</Option>
                  <Option value="其他">其他</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="product_name"
                label="产品名称"
              >
                <Input placeholder="请输入产品名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="product_model"
                label="产品型号"
              >
                <Input placeholder="请输入产品型号" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="quantity"
                label="数量"
                initialValue={1}
              >
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="requester_id"
                label="需求人"
              >
                <Select 
                  placeholder="请选择需求人"
                  showSearch
                  optionFilterProp="children"
                  onChange={(value) => {
                    const user = usersList.find(u => u.id === value);
                    if (user?.department) {
                      form.setFieldsValue({ department_id: user.department.id });
                    } else {
                      form.setFieldsValue({ department_id: null });
                    }
                  }}
                >
                  {usersList.map(u => (
                    <Option key={u.id} value={u.id}>{u.name || u.email}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="submitter_id"
                label="提报人"
              >
                <Select 
                  placeholder="请选择提报人"
                  showSearch
                  optionFilterProp="children"
                >
                  {usersList.map(u => (
                    <Option key={u.id} value={u.id}>{u.name || u.email}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="department_id"
                label="需求部门"
              >
                <Select disabled placeholder="自动带出">
                  {usersList.map(u => u.department ? (
                    <Option key={u.department.id} value={u.department.id}>{u.department.name}</Option>
                  ) : null)}
                  {/* Also include all departments in case we want to show it even if not in user list, but disabled means we only care about display */}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="attachment"
            label="附件"
            hidden
          >
            <Input />
          </Form.Item>

          <Form.Item label="附件上传">
            <Upload
              fileList={fileList}
              beforeUpload={handleUpload}
              onRemove={handleRemoveFile}
              maxCount={1}
            >
              <Button icon={<UploadOutlined />} loading={uploading}>点击上传</Button>
            </Upload>
          </Form.Item>

          <Form.Item
            name="description"
            label="备注说明"
          >
            <Input.TextArea rows={4} placeholder="请输入备注说明" />
          </Form.Item>

          {/* Related Asset Module - Moved to bottom */}
          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="font-medium text-gray-700">关联设备</span>
              {!selectedAsset ? (
                <Button type="dashed" onClick={() => setIsAssetModalOpen(true)} icon={<PlusOutlined />}>
                  选择设备
                </Button>
              ) : (
                <Button type="link" onClick={() => setIsAssetModalOpen(true)}>
                  更换设备
                </Button>
              )}
            </div>
            
            <Form.Item name="related_asset_id" hidden>
              <Input />
            </Form.Item>

            {selectedAsset ? (
              <Card size="small" className="bg-gray-50 border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-800">{selectedAsset.name}</div>
                    <div className="text-gray-500 text-xs mt-1">编号: {selectedAsset.asset_code} | 型号: {selectedAsset.model || '-'}</div>
                  </div>
                  <Button 
                    type="text" 
                    danger 
                    size="small" 
                    onClick={() => {
                      setSelectedAsset(null);
                      form.setFieldsValue({ related_asset_id: null });
                    }}
                  >
                    移除
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="text-gray-400 text-sm text-center py-4 bg-gray-50 rounded border border-dashed border-gray-200">
                暂无关联设备
              </div>
            )}
          </div>
        </Form>
      </Modal>

      {/* Asset Selection Modal */}
      <Modal
        title="选择关联设备"
        open={isAssetModalOpen}
        onCancel={() => setIsAssetModalOpen(false)}
        footer={null}
        width={700}
      >
        <div className="mb-4">
          <Input 
            prefix={<SearchOutlined className="text-gray-400" />}
            placeholder="搜索设备名称或编号" 
            value={assetSearchText}
            onChange={(e) => handleAssetSearch(e.target.value)}
            allowClear
          />
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          <Table
            dataSource={filteredAssets}
            rowKey="id"
            pagination={false}
            size="small"
            onRow={(record) => ({
              onClick: () => handleAssetSelect(record),
              className: 'cursor-pointer hover:bg-blue-50'
            })}
            columns={[
              { title: '资产编号', dataIndex: 'asset_code', width: 120 },
              { title: '设备名称', dataIndex: 'name', width: 150 },
              { title: '型号', dataIndex: 'model' },
              { 
                title: '操作', 
                width: 80,
                render: () => <Button size="small" type="link">选择</Button>
              }
            ]}
          />
        </div>
      </Modal>
    </div>
  );
};

export default RequestList;
