import React, { useEffect, useState } from 'react';
import { Table, Button, Input, Space, Card, Modal, Form, Select, message, Drawer, Tag, Upload, Dropdown } from 'antd';
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
  
  // Drawer/Modal state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AssetRequest | null>(null);
  const [form] = Form.useForm();
  
  // Upload state
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('asset_requests')
        .select(`
          *,
          creator:users(name, email)
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

  const handleEdit = (record: AssetRequest) => {
    setEditingItem(record);
    form.setFieldsValue(record);
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
    setIsDrawerOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    setFileList([]);
    setIsDrawerOpen(true);
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
      setIsDrawerOpen(false);
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

      {/* Edit/Add Drawer */}
      <Drawer
        title={editingItem ? "编辑需求" : "新增需求"}
        width={500}
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        extra={
          <Space>
            <Button onClick={() => setIsDrawerOpen(false)}>取消</Button>
            <Button type="primary" onClick={() => form.submit()}>提交</Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Form.Item
            name="request_name"
            label="需求名称"
            rules={[{ required: true, message: '请输入需求名称' }]}
          >
            <Input placeholder="请输入需求名称" />
          </Form.Item>

          <Form.Item
            name="request_type"
            label="需求类别"
            rules={[{ required: true, message: '请选择需求类别' }]}
          >
            <Select placeholder="请选择">
              <Option value="固定资产">固定资产</Option>
              <Option value="非标备件">非标备件</Option>
            </Select>
          </Form.Item>

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
        </Form>
      </Drawer>
    </div>
  );
};

export default RequestList;
