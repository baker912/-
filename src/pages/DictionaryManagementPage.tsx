import React, { useEffect, useState } from 'react';
import { 
  Table, 
  Button, 
  Input, 
  Modal, 
  Form, 
  Space, 
  message, 
  Card, 
  Row, 
  Col, 
  Divider, 
  Switch, 
  Tag, 
  Popconfirm,
  InputNumber
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined, 
  ReloadOutlined,
  BookOutlined,
  UnorderedListOutlined
} from '@ant-design/icons';
import { supabase } from '../lib/supabase';

interface Dictionary {
  id: string;
  code: string;
  name: string;
  description: string;
}

interface DictionaryItem {
  id: string;
  dict_id: string;
  label: string;
  value: string;
  sort_order: number;
  status: boolean;
  description: string;
}

const DictionaryManagementPage: React.FC = () => {
  const [loadingDicts, setLoadingDicts] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  
  const [dicts, setDicts] = useState<Dictionary[]>([]);
  const [items, setItems] = useState<DictionaryItem[]>([]);
  
  const [selectedDict, setSelectedDict] = useState<Dictionary | null>(null);
  
  // Modals
  const [isDictModalOpen, setIsDictModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingDict, setEditingDict] = useState<Dictionary | null>(null);
  const [editingItem, setEditingItem] = useState<DictionaryItem | null>(null);
  
  const [dictForm] = Form.useForm();
  const [itemForm] = Form.useForm();
  const [searchForm] = Form.useForm();

  useEffect(() => {
    fetchDicts();
  }, []);

  useEffect(() => {
    if (selectedDict) {
      fetchItems(selectedDict.id);
    } else {
      setItems([]);
    }
  }, [selectedDict]);

  // --- Dictionaries Operations ---

  const fetchDicts = async (keyword: string = '') => {
    setLoadingDicts(true);
    try {
      let query = supabase
        .from('sys_dictionaries')
        .select('*')
        .order('created_at', { ascending: true });
        
      if (keyword) {
        query = query.or(`name.ilike.%${keyword}%,code.ilike.%${keyword}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDicts(data || []);
      
      // Select first one by default if none selected and data exists
      if (!selectedDict && data && data.length > 0) {
        setSelectedDict(data[0]);
      }
    } catch (error: any) {
      message.error('获取字典列表失败: ' + error.message);
    } finally {
      setLoadingDicts(false);
    }
  };

  const handleDictSubmit = async (values: any) => {
    try {
      if (editingDict) {
        const { error } = await supabase
          .from('sys_dictionaries')
          .update(values)
          .eq('id', editingDict.id);
        if (error) throw error;
        message.success('更新成功');
      } else {
        const { error } = await supabase
          .from('sys_dictionaries')
          .insert([values]);
        if (error) throw error;
        message.success('创建成功');
      }
      setIsDictModalOpen(false);
      fetchDicts();
    } catch (error: any) {
      message.error('操作失败: ' + error.message);
    }
  };

  const handleDeleteDict = async (id: string) => {
    try {
      const { error } = await supabase.from('sys_dictionaries').delete().eq('id', id);
      if (error) throw error;
      message.success('删除成功');
      if (selectedDict?.id === id) {
        setSelectedDict(null);
      }
      fetchDicts();
    } catch (error: any) {
      message.error('删除失败: ' + error.message);
    }
  };

  // --- Items Operations ---

  const fetchItems = async (dictId: string) => {
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('sys_dictionary_items')
        .select('*')
        .eq('dict_id', dictId)
        .order('sort_order', { ascending: true });
        
      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      message.error('获取字典项失败: ' + error.message);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleItemSubmit = async (values: any) => {
    if (!selectedDict) return;
    try {
      const payload = { ...values, dict_id: selectedDict.id };
      
      if (editingItem) {
        const { error } = await supabase
          .from('sys_dictionary_items')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
        message.success('更新成功');
      } else {
        const { error } = await supabase
          .from('sys_dictionary_items')
          .insert([payload]);
        if (error) throw error;
        message.success('创建成功');
      }
      setIsItemModalOpen(false);
      fetchItems(selectedDict.id);
    } catch (error: any) {
      message.error('操作失败: ' + error.message);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const { error } = await supabase.from('sys_dictionary_items').delete().eq('id', id);
      if (error) throw error;
      message.success('删除成功');
      if (selectedDict) fetchItems(selectedDict.id);
    } catch (error: any) {
      message.error('删除失败: ' + error.message);
    }
  };

  const handleToggleStatus = async (item: DictionaryItem, checked: boolean) => {
    try {
      const { error } = await supabase
        .from('sys_dictionary_items')
        .update({ status: checked })
        .eq('id', item.id);
      if (error) throw error;
      message.success('状态更新成功');
      if (selectedDict) fetchItems(selectedDict.id);
    } catch (error: any) {
      message.error('更新失败: ' + error.message);
    }
  };

  // --- UI Components ---

  const dictColumns = [
    {
      title: '字典名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Dictionary) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-gray-400 text-xs">{record.code}</div>
        </div>
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: Dictionary) => (
        <Space onClick={e => e.stopPropagation()}>
          <Button 
            type="text" 
            size="small" 
            icon={<EditOutlined />} 
            onClick={() => {
              setEditingDict(record);
              dictForm.setFieldsValue(record);
              setIsDictModalOpen(true);
            }}
          />
          <Popconfirm title="确定删除?" onConfirm={() => handleDeleteDict(record.id)}>
            <Button type="text" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const itemColumns = [
    { title: '标签', dataIndex: 'label', key: 'label' },
    { title: '键值', dataIndex: 'value', key: 'value', render: (text: string) => <Tag>{text}</Tag> },
    { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 80 },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      width: 100,
      render: (status: boolean, record: DictionaryItem) => (
        <Switch 
          checked={status} 
          size="small" 
          onChange={(checked) => handleToggleStatus(record, checked)} 
        />
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: DictionaryItem) => (
        <Space>
          <Button 
            type="link" 
            size="small" 
            onClick={() => {
              setEditingItem(record);
              itemForm.setFieldsValue(record);
              setIsItemModalOpen(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm title="确定删除?" onConfirm={() => handleDeleteItem(record.id)}>
            <Button type="link" danger size="small">删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="h-full flex gap-4">
      {/* Left Panel: Dictionaries */}
      <div className="w-1/3 min-w-[300px] flex flex-col bg-white rounded-lg shadow-sm">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-lg"><BookOutlined className="mr-2" />字典列表</span>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              size="small"
              onClick={() => {
                setEditingDict(null);
                dictForm.resetFields();
                setIsDictModalOpen(true);
              }}
            >
              新增
            </Button>
          </div>
          <Input.Search 
            placeholder="搜索名称或编码" 
            onSearch={val => fetchDicts(val)}
            allowClear
          />
        </div>
        <div className="flex-1 overflow-auto">
          <Table
            columns={dictColumns}
            dataSource={dicts}
            rowKey="id"
            loading={loadingDicts}
            pagination={false}
            rowClassName={(record) => 
              `cursor-pointer ${selectedDict?.id === record.id ? 'bg-blue-50' : ''}`
            }
            onRow={(record) => ({
              onClick: () => setSelectedDict(record),
            })}
            size="small"
            showHeader={false}
          />
        </div>
      </div>

      {/* Right Panel: Items */}
      <div className="flex-1 bg-white rounded-lg shadow-sm flex flex-col">
        {selectedDict ? (
          <>
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
              <div>
                <span className="font-bold text-lg mr-2">{selectedDict.name}</span>
                <Tag color="blue">{selectedDict.code}</Tag>
                <span className="text-gray-400 text-sm ml-2">{selectedDict.description}</span>
              </div>
              <Space>
                <Button icon={<ReloadOutlined />} onClick={() => fetchItems(selectedDict.id)}>刷新</Button>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={() => {
                    setEditingItem(null);
                    itemForm.resetFields();
                    itemForm.setFieldsValue({ sort_order: 10, status: true });
                    setIsItemModalOpen(true);
                  }}
                >
                  新增字典项
                </Button>
              </Space>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              <Table
                columns={itemColumns}
                dataSource={items}
                rowKey="id"
                loading={loadingItems}
                pagination={false}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <UnorderedListOutlined style={{ fontSize: 48, marginBottom: 16 }} />
              <div>请选择左侧字典进行管理</div>
            </div>
          </div>
        )}
      </div>

      {/* Dictionary Modal */}
      <Modal
        title={editingDict ? "编辑字典" : "新增字典"}
        open={isDictModalOpen}
        onCancel={() => setIsDictModalOpen(false)}
        onOk={() => dictForm.submit()}
      >
        <Form form={dictForm} layout="vertical" onFinish={handleDictSubmit}>
          <Form.Item name="name" label="字典名称" rules={[{ required: true }]}>
            <Input placeholder="如：资产状态" />
          </Form.Item>
          <Form.Item name="code" label="字典编码" rules={[{ required: true }]}>
            <Input placeholder="如：asset_status" disabled={!!editingDict} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>

      {/* Item Modal */}
      <Modal
        title={editingItem ? "编辑字典项" : "新增字典项"}
        open={isItemModalOpen}
        onCancel={() => setIsItemModalOpen(false)}
        onOk={() => itemForm.submit()}
      >
        <Form form={itemForm} layout="vertical" onFinish={handleItemSubmit}>
          <Form.Item name="label" label="显示标签" rules={[{ required: true }]}>
            <Input placeholder="如：在库" />
          </Form.Item>
          <Form.Item name="value" label="字典键值" rules={[{ required: true }]}>
            <Input placeholder="如：in_stock" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sort_order" label="排序值">
                <InputNumber className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="状态" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="描述">
            <Input.TextArea />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DictionaryManagementPage;
