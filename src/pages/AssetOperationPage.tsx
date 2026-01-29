import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Input, Modal, Form, Select, DatePicker, message, Row, Col, Typography, Dropdown, Checkbox, List, Card, Divider, Tooltip, Upload, Tag } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, ExportOutlined, DownOutlined, DeleteOutlined, AppstoreOutlined, UploadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Asset } from '../types';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// Mock data for dropdowns (replace with API data if available)
const MOCK_FLOORS = ['3F', '4F', '5F', '6F', '7F', '8F'];
const MOCK_ROOM_TYPES = ['开放办公区', '独立办公室', '会议室', '研发实验室', '服务器机房', '仓库', '库房'];
const MOCK_LOCATIONS = ['工位-001', '工位-002', '工位-003', '会议室A', '实验室B', 'B707'];
// Mock user list for "requisition" user selection
const MOCK_USERS = [
  { name: '张三', code: 'EMP1001', dept: '技术部' },
  { name: '李四', code: 'EMP1002', dept: '人事部' },
  { name: '王五', code: 'EMP1003', dept: '财务部' },
];

interface AssetOperationPageProps {
  type: 'requisition' | 'return' | 'borrow' | 'transfer' | 'scrap' | 'dispose';
  title: string;
}

const AssetOperationPage: React.FC<AssetOperationPageProps> = ({ type, title }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  
  // Asset Selector States
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  const [isAssetSelectModalOpen, setIsAssetSelectModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [assetSearchKeyword, setAssetSearchKeyword] = useState('');
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);

  useEffect(() => {
    fetchRecords();
  }, [type]);

  const fetchRecords = async (values: any = {}) => {
    setLoading(true);
    try {
      let query = supabase
        .from('asset_flow_records')
        .select(`
          *,
          asset:assets!inner(name, asset_code, serial_number)
        `)
        .eq('operation_type', type)
        .order('operation_time', { ascending: false });

      if (values.operator && type !== 'requisition' && type !== 'borrow' && type !== 'return' && type !== 'scrap' && type !== 'dispose') query = query.ilike('operator', `%${values.operator}%`);
      if (values.related_form_no && (type === 'requisition' || type === 'borrow' || type === 'transfer')) query = query.ilike('related_form_no', `%${values.related_form_no}%`);
      if (values.target_employee_name && (type === 'requisition' || type === 'borrow' || type === 'return' || type === 'transfer')) query = query.ilike('target_employee_name', `%${values.target_employee_name}%`);
      if (values.return_type && type === 'return') query = query.eq('return_type', values.return_type);
      
      // Filter by joined asset table
      if (values.asset_name) query = query.ilike('asset.name', `%${values.asset_name}%`);
      if (values.asset_code) query = query.ilike('asset.asset_code', `%${values.asset_code}%`);
      
      const { data, error } = await query;
      if (error) throw error;

      // Aggregation Logic for Requisition Type
      if (type === 'requisition' && data) {
        const groupedMap = new Map();
        
        data.forEach((record: any) => {
          // If related_form_no exists, use it as group key, otherwise use unique ID
          const groupKey = record.related_form_no || record.id;
          
          if (!groupedMap.has(groupKey)) {
            // Initialize group
            groupedMap.set(groupKey, {
              ...record,
              isGroup: !!record.related_form_no,
              assets: [record.asset] // Collect assets
            });
          } else {
            // Add asset to existing group
            const group = groupedMap.get(groupKey);
            group.assets.push(record.asset);
          }
        });

        // Convert map values to array
        setRecords(Array.from(groupedMap.values()));
      } else {
        setRecords(data || []);
      }
    } catch (error: any) {
      message.error('获取记录失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableAssets = async () => {
    let statusFilter: string[] = [];
    let excludeFaulty = false;

    switch (type) {
      case 'requisition': // 领用
      case 'borrow':      // 借用
        statusFilter = ['in_stock'];
        excludeFaulty = true;
        break;
      case 'return':      // 归还
        statusFilter = ['in_use']; 
        break;
      case 'transfer':    // 转移
        statusFilter = ['in_use']; 
        break;
      case 'scrap':       // 报废
        statusFilter = ['in_stock', 'in_use', 'maintenance']; 
        break;
      case 'dispose':     // 清运
        statusFilter = ['scrapped', 'disposed'];
        break;
    }

    let query = supabase
      .from('assets')
      .select('*')
      .in('status', statusFilter);
    
    if (excludeFaulty) {
      query = query.eq('is_faulty', false);
    }

    const { data, error } = await query;
    if (error) {
      message.error('获取资产列表失败: ' + error.message);
      return;
    }
    
    setAvailableAssets(data || []);
    setFilteredAssets(data || []);
  };

  useEffect(() => {
    // Logic for Return type: Auto-fill returner based on selected asset's user
    if (type === 'return') {
      if (selectedAssets.length > 0) {
        // Get all unique users from selected assets
        const users = Array.from(new Set(selectedAssets.map(a => a.employee_name).filter(Boolean)));
        
        if (users.length === 1) {
           form.setFieldsValue({ target_employee_name: users[0] });
        } else if (users.length > 1) {
           // Multiple different users
           form.setFieldsValue({ target_employee_name: undefined });
           message.warning('选中资产属于不同的使用人，请确认归还人');
        } else {
           // No user info
           form.setFieldsValue({ target_employee_name: undefined });
        }
      } else {
        form.setFieldsValue({ target_employee_name: undefined });
      }
    }
  }, [selectedAssets, type, form]);

  const handleAdd = () => {
    fetchAvailableAssets();
    form.resetFields();
    setSelectedAssets([]);
    // No default values for operation_time/operator as they are hidden and auto-filled
    setIsModalOpen(true);
  };

  const handleUserChange = (value: string) => {
    const user = MOCK_USERS.find(u => u.name === value);
    if (user) {
      form.setFieldsValue({
        target_employee_code: user.code,
        target_department_name: user.dept
      });
    }
  };

  const handleSubmit = async (values: any) => {
    if (selectedAssets.length === 0) {
      message.error('请至少选择一项资产');
      return;
    }

    try {
      // Auto-fill system fields
      const currentUser = '当前用户'; 
      const currentTime = dayjs().format();

      // Construct target_location from parts if requisition or borrow or transfer
      let finalTargetLocation = values.target_location;
      if ((type === 'requisition' || type === 'borrow' || type === 'transfer') && values.target_floor) {
        finalTargetLocation = `${values.target_floor} ${values.target_room_type} ${values.target_specific_location}`;
      }

      // Loop through all selected assets and perform operations
      for (const asset of selectedAssets) {
        // 1. Insert flow record
        const recordPayload = {
          asset_id: asset.id,
          operation_type: type,
          operator: currentUser,
          operation_time: currentTime,
          description: values.description,
          related_form_no: values.related_form_no,
          target_employee_name: values.target_employee_name,
          target_employee_code: values.target_employee_code,
          target_department_name: values.target_department_name,
          target_floor: values.target_floor,
          target_room_type: values.target_room_type,
          target_specific_location: values.target_specific_location,
          target_location: finalTargetLocation,
          borrow_start_time: values.borrow_start_time ? values.borrow_start_time.format() : null,
          borrow_end_time: values.borrow_end_time ? values.borrow_end_time.format() : null,
          return_type: type === 'return' ? (values.return_type || 'normal') : null
        };

        const { error: insertError } = await supabase
          .from('asset_flow_records')
          .insert([recordPayload]);
        
        if (insertError) throw insertError;

        // 2. Update asset status
        let assetUpdate: any = {};
        switch (type) {
          case 'requisition':
            assetUpdate = { 
              status: 'in_use', 
              employee_name: values.target_employee_name,
              employee_code: values.target_employee_code,
              department_name: values.target_department_name,
              location: finalTargetLocation,
              floor: values.target_floor,
              room_type: values.target_room_type,
              specific_location: values.target_specific_location
            };
            break;
          case 'borrow':
            assetUpdate = { 
              status: 'in_use',
              employee_name: values.target_employee_name,
              employee_code: values.target_employee_code,
              department_name: values.target_department_name,
              location: finalTargetLocation,
              floor: values.target_floor,
              room_type: values.target_room_type,
              specific_location: values.target_specific_location
            };
            break;
          case 'return':
            assetUpdate = { 
              status: 'in_stock',
              employee_name: null,
              employee_code: null,
              department_name: null,
              location: null, floor: null, room_type: null, specific_location: null 
            };
            break;
          case 'transfer':
            assetUpdate = { 
              employee_name: values.target_employee_name,
              employee_code: values.target_employee_code,
              department_name: values.target_department_name,
              location: finalTargetLocation,
              floor: values.target_floor,
              room_type: values.target_room_type,
              specific_location: values.target_specific_location
            };
            break;
          case 'scrap':
            assetUpdate = { status: 'scrapped' };
            break;
          case 'dispose':
            assetUpdate = { status: 'cleared' };
            break;
        }

        const { error: updateError } = await supabase
          .from('assets')
          .update(assetUpdate)
          .eq('id', asset.id);

        if (updateError) throw updateError;
      }

      message.success(`成功操作 ${selectedAssets.length} 项资产`);
      setIsModalOpen(false);
      fetchRecords();
    } catch (error: any) {
      message.error('操作失败: ' + error.message);
    }
  };

  const handleExport = (exportType: 'all' | 'selected') => {
    const exportData = exportType === 'selected' ? selectedRows : records;
    if (exportData.length === 0) {
      message.warning('暂无数据可导出');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(exportData.map((item, index) => ({
      序号: index + 1,
      操作时间: dayjs(item.operation_time).format('YYYY-MM-DD HH:mm:ss'),
      资产名称: item.asset?.name,
      资产编号: item.asset?.asset_code,
      操作人: item.operator,
      ITSH单号: item.related_form_no || '-',
      相关人员: item.target_employee_name || '-',
      相关部门: item.target_department_name || '-',
      归还类型: type === 'return' ? (item.return_type === 'resignation' ? '离职归还' : '普通归还') : '-',
      位置: item.target_location || '-',
      备注: item.description || '-'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title);
    XLSX.writeFile(wb, `${title}_${dayjs().format('YYYYMMDDHHmmss')}.xlsx`);
  };

  const exportMenu = {
    items: [
      { key: 'selected', label: '导出选中数据', disabled: selectedRowKeys.length === 0, onClick: () => handleExport('selected') },
      { key: 'all', label: '导出全部数据', onClick: () => handleExport('all') },
    ],
  };

  const handleDelete = async (id: string) => {
    try {
      // Should we revert asset status? For now just delete record.
      // In a real system, deleting a flow record is dangerous/complex if it's the latest one.
      const { error } = await supabase.from('asset_flow_records').delete().eq('id', id);
      if (error) throw error;
      message.success('删除成功');
      fetchRecords();
    } catch (error: any) {
      message.error('删除失败: ' + error.message);
    }
  };

  const handleDetail = (record: any) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const columns = [
    { title: 'ITSH单号', dataIndex: 'related_form_no', key: 'related_form_no', render: (text: string) => text || '-', hidden: type !== 'requisition' && type !== 'borrow' && type !== 'transfer' },
    { 
      title: '资产名称', 
      key: 'asset_name',
      render: (_: any, record: any) => {
        if (record.assets && record.assets.length > 1) {
          return (
            <Tooltip title={record.assets.map((a: any) => a.name).join(', ')}>
              <span>{record.assets[0]?.name} 等 {record.assets.length} 件资产</span>
            </Tooltip>
          );
        }
        return record.asset?.name;
      }
    },
    { 
      title: '资产编号', 
      key: 'asset_code',
      render: (_: any, record: any) => {
        if (record.assets && record.assets.length > 1) {
           return (
             <Tooltip title={record.assets.map((a: any) => a.asset_code).join(', ')}>
               <span>{record.assets[0]?.asset_code} ...</span>
             </Tooltip>
           );
        }
        return record.asset?.asset_code;
      }
    },
    { title: '领用人', dataIndex: 'target_employee_name', key: 'target_employee_name', hidden: type !== 'requisition' },
    { title: '工号', dataIndex: 'target_employee_code', key: 'target_employee_code', hidden: type !== 'requisition' },
    { title: '部门', dataIndex: 'target_department_name', key: 'target_department_name', hidden: type !== 'requisition' },
    
    // Return Fields
    { 
      title: '归还类型', 
      dataIndex: 'return_type', 
      key: 'return_type', 
      hidden: type !== 'return',
      render: (text: string) => {
        if (!text) return '普通归还';
        return text === 'resignation' ? <Tag color="orange">离职归还</Tag> : <Tag color="blue">普通归还</Tag>;
      }
    },

    // Borrow Fields
    { title: '借用人', dataIndex: 'target_employee_name', key: 'borrower', hidden: type !== 'borrow' },
    { title: '开始时间', dataIndex: 'borrow_start_time', key: 'borrow_start_time', render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-', hidden: type !== 'borrow' },
    { title: '结束时间', dataIndex: 'borrow_end_time', key: 'borrow_end_time', render: (text: string) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-', hidden: type !== 'borrow' },
    
    { title: '操作人', dataIndex: 'operator', key: 'operator' },
    { title: '说明', dataIndex: 'description', key: 'description' },
    { title: '操作时间', dataIndex: 'operation_time', key: 'operation_time', render: (text: string) => dayjs(text).format('YYYY-MM-DD HH:mm:ss') },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button type="link" onClick={() => handleDetail(record)}>详情</Button>
          <Button type="link" danger onClick={() => {
            Modal.confirm({
              title: '确认删除',
              content: '确定要删除这条记录吗？注意：删除记录不会自动回滚资产状态。',
              onOk: () => handleDelete(record.id)
            });
          }}>删除</Button>
        </Space>
      ),
    },
  ].filter(col => !col.hidden);

  // Asset Selection Modal Logic
  const handleSearchAsset = (value: string) => {
    setAssetSearchKeyword(value);
    const lowerVal = value.toLowerCase();
    const filtered = availableAssets.filter(asset => 
      (asset.name?.toLowerCase() || '').includes(lowerVal) ||
      (asset.asset_code?.toLowerCase() || '').includes(lowerVal) ||
      (asset.brand?.toLowerCase() || '').includes(lowerVal) ||
      (asset.serial_number?.toLowerCase() || '').includes(lowerVal) ||
      (asset.employee_name?.toLowerCase() || '').includes(lowerVal) // Added user search
    );
    setFilteredAssets(filtered);
  };

  const toggleAssetSelection = (asset: Asset) => {
    const exists = selectedAssets.find(a => a.id === asset.id);
    if (exists) {
      setSelectedAssets(selectedAssets.filter(a => a.id !== asset.id));
    } else {
      setSelectedAssets([...selectedAssets, asset]);
    }
  };

  const assetColumns = [
    { title: '资产编号', dataIndex: 'asset_code', key: 'asset_code' },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '品牌', dataIndex: 'brand', key: 'brand' },
    { title: '型号', dataIndex: 'model', key: 'model' },
    { title: '使用人', dataIndex: 'employee_name', key: 'employee_name' }, // Added User Column
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      render: (text: string) => {
        const statusMap: any = {
          'in_stock': '在库',
          'in_use': '在用',
          'maintenance': '维修中',
          'scrapped': '已报废',
          'disposed': '已清运',
          'cleared': '已清运'
        };
        const colorMap: any = {
          'in_stock': 'green',
          'in_use': 'blue',
          'maintenance': 'orange',
          'scrapped': 'red',
          'disposed': 'default',
          'cleared': 'default'
        };
        return <Tag color={colorMap[text]}>{statusMap[text] || text}</Tag>;
      }
    },
  ];

  return (
    <div>
      <Title level={2} className="mb-4">{title}</Title>
      
      <div className="bg-white p-4 mb-4 rounded-lg shadow-sm">
        <Form form={searchForm} layout="inline" className="w-full">
          <Row gutter={[16, 16]} className="w-full">
            {(type === 'requisition' || type === 'borrow' || type === 'transfer') && (
              <Col xs={24} sm={12} md={8} lg={6} xl={6}>
                <Form.Item name="related_form_no" label="ITSH单号" className="w-full mb-0">
                  <Input placeholder="请输入" />
                </Form.Item>
              </Col>
            )}
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="asset_name" label="资产名称" className="w-full mb-0">
                <Input placeholder="请输入" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="asset_code" label="资产编号" className="w-full mb-0">
                <Input placeholder="请输入" />
              </Form.Item>
            </Col>
            {type === 'requisition' && (
              <Col xs={24} sm={12} md={8} lg={6} xl={6}>
                <Form.Item name="target_employee_name" label="领用人" className="w-full mb-0">
                  <Input placeholder="请输入" />
                </Form.Item>
              </Col>
            )}
            {type === 'borrow' && (
              <Col xs={24} sm={12} md={8} lg={6} xl={6}>
                <Form.Item name="target_employee_name" label="借用人" className="w-full mb-0">
                  <Input placeholder="请输入" />
                </Form.Item>
              </Col>
            )}
            {type === 'return' && (
              <Col xs={24} sm={12} md={8} lg={6} xl={6}>
                <Form.Item name="return_type" label="归还类型" className="w-full mb-0">
                  <Select placeholder="请选择" allowClear>
                    <Option value="normal">普通归还</Option>
                    <Option value="resignation">离职归还</Option>
                  </Select>
                </Form.Item>
              </Col>
            )}
            {type === 'return' && (
              <Col xs={24} sm={12} md={8} lg={6} xl={6}>
                <Form.Item name="target_employee_name" label="归还人" className="w-full mb-0">
                  <Input placeholder="请输入" />
                </Form.Item>
              </Col>
            )}
            {type === 'transfer' && (
              <Col xs={24} sm={12} md={8} lg={6} xl={6}>
                <Form.Item name="target_employee_name" label="新使用人" className="w-full mb-0">
                  <Input placeholder="请输入" />
                </Form.Item>
              </Col>
            )}
            {type !== 'requisition' && type !== 'borrow' && type !== 'return' && type !== 'transfer' && type !== 'scrap' && type !== 'dispose' && (
              <Col xs={24} sm={12} md={8} lg={6} xl={6}>
                <Form.Item name="operator" label="操作人" className="w-full mb-0">
                  <Input placeholder="请输入" />
                </Form.Item>
              </Col>
            )}
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="operation_time_range" label="操作时间" className="w-full mb-0">
                <RangePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6} className={type === 'requisition' ? "text-right" : ""}>
              <Space>
                <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchRecords(searchForm.getFieldsValue())}>查询</Button>
                <Button icon={<ReloadOutlined />} onClick={() => { searchForm.resetFields(); fetchRecords(); }}>重置</Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="mb-4 space-x-2">
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>{title}</Button>
          <Dropdown menu={exportMenu}>
            <Button icon={<ExportOutlined />}>导出 <DownOutlined /></Button>
          </Dropdown>
        </div>
        
        <Table 
          rowSelection={{
            selectedRowKeys,
            onChange: (keys, rows) => { setSelectedRowKeys(keys); setSelectedRows(rows); },
          }}
          columns={columns} 
          dataSource={records} 
          rowKey="id" 
          loading={loading}
        />
      </div>

      <Modal
        title={`新增${title}`}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        width={type === 'requisition' ? 1000 : 600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          
          {/* Asset Selection Trigger */}
          <Form.Item label="选择资产" required>
            {(type === 'requisition' || type === 'borrow') && (
               <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded mb-3 text-sm flex items-start">
                 <InfoCircleOutlined className="mt-0.5 mr-2 flex-shrink-0" />
                 <span>仅<b>在库</b>资产可进行领用与借用，在用、报废、故障资产无法进行此操作。</span>
               </div>
            )}
            <div 
              className="border rounded px-3 py-2 cursor-pointer hover:border-blue-400 bg-white"
              onClick={() => setIsAssetSelectModalOpen(true)}
            >
              {selectedAssets.length === 0 ? (
                <span className="text-gray-400">点击选择资产</span>
              ) : (
                <div className="flex items-center">
                  {selectedAssets.length > 1 && (
                    <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded mr-2 flex-shrink-0 font-medium">
                      <AppstoreOutlined className="mr-1" />
                      多选 {selectedAssets.length}项
                    </span>
                  )}
                  <Tooltip 
                    title={
                      <div className="max-h-60 overflow-y-auto">
                        {selectedAssets.map(a => (
                          <div key={a.id} className="mb-1">
                            {a.name} ({a.asset_code})
                          </div>
                        ))}
                      </div>
                    }
                    placement="bottomLeft"
                  >
                    <span className="truncate text-gray-700 block" style={{ maxWidth: '400px' }}>
                      {selectedAssets.slice(0, 3).map(a => `${a.name}(${a.asset_code})`).join('、')}
                      {selectedAssets.length > 3 && ` ...等${selectedAssets.length}个设备`}
                    </span>
                  </Tooltip>
                </div>
              )}
            </div>

            {selectedAssets.length > 0 && (
               <div className="mt-2 flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                 {selectedAssets.map(asset => (
                   <Tooltip key={asset.id} title={`${asset.name} (${asset.asset_code})`}>
                     <span className="bg-gray-50 border text-gray-600 px-2 py-1 rounded text-xs flex items-center max-w-[200px]">
                       <span className="truncate flex-1 mr-1">
                         {asset.name} ({asset.asset_code})
                       </span>
                       <DeleteOutlined className="cursor-pointer hover:text-red-500 flex-shrink-0" onClick={(e) => { e.stopPropagation(); toggleAssetSelection(asset); }} />
                     </span>
                   </Tooltip>
                 ))}
               </div>
            )}
          </Form.Item>

          {/* Auto-filled Asset Info */}
          {selectedAssets.length === 1 && (
            <Row gutter={24} className="bg-gray-50 p-3 rounded mb-4 border border-gray-100">
              <Col span={8}>
                <Form.Item label="单位" className="mb-0">
                  <Input value={selectedAssets[0].unit || '-'} disabled className="bg-white text-gray-700" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="使用年限" className="mb-0">
                  <Input value={selectedAssets[0].warranty_years ? `${selectedAssets[0].warranty_years}年` : '-'} disabled className="bg-white text-gray-700" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="已使用月数" className="mb-0">
                  <Input 
                    value={(() => {
                      const asset = selectedAssets[0];
                      // Use accounting_date (入账时间) or created_at (创建时间) or purchase_date (采购时间)
                      const startDate = asset.accounting_date || asset.created_at || asset.purchase_date;
                      if (!startDate) return '-';
                      
                      const start = dayjs(startDate);
                      const now = dayjs();
                      const months = now.diff(start, 'month');
                      return `${Math.max(0, months)}个月`;
                    })()} 
                    disabled 
                    className="bg-white text-gray-700" 
                  />
                </Form.Item>
              </Col>
            </Row>
          )}

          {/* Custom form for Requisition */}
          {type === 'requisition' && (
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item name="related_form_no" label="ITSH关联单号" rules={[{ required: true, message: '请输入' }]}>
                  <Input placeholder="请输入" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="target_employee_name" label="使用人姓名" rules={[{ required: true, message: '请选择' }]}>
                  <Select placeholder="请选择" onChange={handleUserChange}>
                    {MOCK_USERS.map(u => <Option key={u.name} value={u.name}>{u.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="target_employee_code" label="使用人工号" rules={[{ required: true }]}>
                  <Input disabled className="bg-gray-100" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="target_department_name" label="使用人部门" rules={[{ required: true }]}>
                  <Input disabled className="bg-gray-100" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="target_floor" label="使用人楼层" rules={[{ required: true, message: '请选择' }]}>
                  <Select placeholder="请选择">
                    {MOCK_FLOORS.map(f => <Option key={f} value={f}>{f}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="target_room_type" label="使用位置属性" rules={[{ required: true, message: '请选择' }]}>
                  <Select placeholder="请选择">
                    {MOCK_ROOM_TYPES.map(r => <Option key={r} value={r}>{r}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="target_specific_location" label="使用具体位置" rules={[{ required: true, message: '请选择' }]}>
                  <Select placeholder="请选择">
                    {MOCK_LOCATIONS.map(l => <Option key={l} value={l}>{l}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="description" label="备注说明">
                  <Input.TextArea rows={2} />
                </Form.Item>
              </Col>
            </Row>
          )}
          
          {/* Custom form for Borrow */}
          {type === 'borrow' && (
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item name="related_form_no" label="ITSH单号" rules={[{ required: true, message: '请输入' }]}>
                  <Input placeholder="请输入" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="target_employee_name" label="借用人姓名" rules={[{ required: true, message: '请选择' }]}>
                  <Select placeholder="请选择" onChange={handleUserChange}>
                    {MOCK_USERS.map(u => <Option key={u.name} value={u.name}>{u.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="target_employee_code" label="借用人工号">
                  <Input disabled className="bg-gray-100" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="target_department_name" label="借用人部门" rules={[{ required: true }]}>
                  <Input disabled className="bg-gray-100" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="borrow_start_time" label="借用开始时间" rules={[{ required: true }]}>
                  <DatePicker showTime className="w-full" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="borrow_end_time" label="借用结束时间" rules={[{ required: true }]}>
                  <DatePicker showTime className="w-full" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="target_floor" label="使用人楼层" rules={[{ required: true, message: '请选择' }]}>
                  <Select placeholder="请选择">
                    {MOCK_FLOORS.map(f => <Option key={f} value={f}>{f}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="target_room_type" label="使用位置属性" rules={[{ required: true, message: '请选择' }]}>
                  <Select placeholder="请选择">
                    {MOCK_ROOM_TYPES.map(r => <Option key={r} value={r}>{r}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="target_specific_location" label="使用具体位置" rules={[{ required: true, message: '请选择' }]}>
                  <Select placeholder="请选择">
                    {MOCK_LOCATIONS.map(l => <Option key={l} value={l}>{l}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="description" label="备注说明">
                  <Input.TextArea rows={2} />
                </Form.Item>
              </Col>
            </Row>
          )}

          {/* Custom form for Return */}
          {type === 'return' && (
            <Row gutter={24}>
              <Col span={24}>
                <Form.Item name="return_type" label="归还类型" initialValue="normal" rules={[{ required: true, message: '请选择' }]}>
                  <Select placeholder="请选择">
                    <Option value="normal">普通归还</Option>
                    <Option value="resignation">离职归还</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="target_employee_name" label="归还人姓名" rules={[{ required: true, message: '请选择' }]}>
                   <Input placeholder="自动带出" readOnly className="bg-gray-100 text-gray-700" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="target_floor" label="归还位置楼层" initialValue="7F">
                  <Select placeholder="请选择">
                    {MOCK_FLOORS.map(f => <Option key={f} value={f}>{f}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="target_room_type" label="归还位置属性" initialValue="库房">
                  <Select placeholder="请选择">
                    {MOCK_ROOM_TYPES.map(r => <Option key={r} value={r}>{r}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="target_specific_location" label="归还具体位置" initialValue="B707">
                  <Select placeholder="请选择">
                    {MOCK_LOCATIONS.map(l => <Option key={l} value={l}>{l}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="description" label="备注说明">
                  <Input.TextArea rows={3} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label="图片说明" name="attachments">
                  <Upload listType="picture" maxCount={3} beforeUpload={() => false}>
                    <Button icon={<UploadOutlined />}>上传图片</Button>
                  </Upload>
                </Form.Item>
              </Col>
            </Row>
          )}

          {/* Custom form for Transfer */}
          {type === 'transfer' && (
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item name="related_form_no" label="ITSH单号" rules={[{ required: true, message: '请输入' }]}>
                  <Input placeholder="请输入" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="target_employee_name" label="新使用人姓名" rules={[{ required: true, message: '请选择' }]}>
                  <Select placeholder="请选择" onChange={handleUserChange}>
                    {MOCK_USERS.map(u => <Option key={u.name} value={u.name}>{u.name}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="target_employee_code" label="新使用人工号">
                  <Input disabled className="bg-gray-100" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="target_department_name" label="新使用人部门" rules={[{ required: true }]}>
                  <Input disabled className="bg-gray-100" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="target_floor" label="新使用人楼层" rules={[{ required: true, message: '请选择' }]}>
                  <Select placeholder="请选择">
                    {MOCK_FLOORS.map(f => <Option key={f} value={f}>{f}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="target_room_type" label="新使用位置属性" rules={[{ required: true, message: '请选择' }]}>
                  <Select placeholder="请选择">
                    {MOCK_ROOM_TYPES.map(r => <Option key={r} value={r}>{r}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="target_specific_location" label="新使用具体位置" rules={[{ required: true, message: '请选择' }]}>
                  <Select placeholder="请选择">
                    {MOCK_LOCATIONS.map(l => <Option key={l} value={l}>{l}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="description" label="备注说明">
                  <Input.TextArea rows={2} />
                </Form.Item>
              </Col>
            </Row>
          )}

          {/* Generic form for others */}
          {type !== 'requisition' && type !== 'borrow' && type !== 'return' && type !== 'transfer' && (
             <>
               <Form.Item name="description" label="备注说明">
                 <Input.TextArea rows={3} />
               </Form.Item>
             </>
          )}
        </Form>
      </Modal>

      <Modal
        title={`${title}详情`}
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>关闭</Button>
        ]}
        width={700}
      >
        {selectedRecord && (
          <div className="space-y-4">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text type="secondary">操作时间：</Text>
                <div>{dayjs(selectedRecord.operation_time).format('YYYY-MM-DD HH:mm:ss')}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary">操作人：</Text>
                <div>{selectedRecord.operator}</div>
              </Col>
              {type === 'return' && (
                <Col span={12}>
                  <Text type="secondary">归还类型：</Text>
                  <div>{selectedRecord.return_type === 'resignation' ? <Tag color="orange">离职归还</Tag> : <Tag color="blue">普通归还</Tag>}</div>
                </Col>
              )}
              {type === 'requisition' && (
                <Col span={12}>
                  <Text type="secondary">ITSH关联单号：</Text>
                  <div>{selectedRecord.related_form_no || '-'}</div>
                </Col>
              )}
              <Col span={12}>
                <Text type="secondary">资产名称：</Text>
                <div>
                  {selectedRecord.assets && selectedRecord.assets.length > 1 
                    ? `${selectedRecord.assets[0]?.name} 等 ${selectedRecord.assets.length} 件资产`
                    : selectedRecord.asset?.name}
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">资产编号：</Text>
                <div>
                   {selectedRecord.assets && selectedRecord.assets.length > 1
                    ? '（详见下方列表）'
                    : selectedRecord.asset?.asset_code}
                </div>
              </Col>
              
              {selectedRecord.assets && selectedRecord.assets.length > 1 && (
                <Col span={24}>
                  <Divider orientation="left" className="my-2">资产明细列表</Divider>
                  <Table 
                    size="small"
                    pagination={false}
                    scroll={{ y: 200 }}
                    dataSource={selectedRecord.assets}
                    rowKey="id"
                    columns={[
                      { title: '资产名称', dataIndex: 'name', key: 'name' },
                      { title: '资产编号', dataIndex: 'asset_code', key: 'asset_code' },
                      { title: '序列号', dataIndex: 'serial_number', key: 'serial_number' },
                    ]}
                  />
                </Col>
              )}

              {!selectedRecord.assets || selectedRecord.assets.length <= 1 && (
                 <Col span={12}>
                   <Text type="secondary">设备序列号：</Text>
                   <div>{selectedRecord.asset?.serial_number}</div>
                 </Col>
              )}
              
              <Divider className="my-2" />
              
              <Col span={12}>
                <Text type="secondary">涉及人员：</Text>
                <div>{selectedRecord.target_employee_name || '-'}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary">工号：</Text>
                <div>{selectedRecord.target_employee_code || '-'}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary">部门：</Text>
                <div>{selectedRecord.target_department_name || '-'}</div>
              </Col>
              
              {type === 'borrow' && (
                <>
                  <Col span={12}>
                    <Text type="secondary">借用开始时间：</Text>
                    <div>{selectedRecord.borrow_start_time ? dayjs(selectedRecord.borrow_start_time).format('YYYY-MM-DD HH:mm:ss') : '-'}</div>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">借用结束时间：</Text>
                    <div>{selectedRecord.borrow_end_time ? dayjs(selectedRecord.borrow_end_time).format('YYYY-MM-DD HH:mm:ss') : '-'}</div>
                  </Col>
                </>
              )}

              <Col span={24}>
                <Text type="secondary">位置信息：</Text>
                <div>
                  {selectedRecord.target_location || '-'}
                  {selectedRecord.target_floor && ` (${selectedRecord.target_floor} / ${selectedRecord.target_room_type})`}
                </div>
              </Col>
              
              <Col span={24}>
                <Text type="secondary">备注说明：</Text>
                <div className="bg-gray-50 p-2 rounded mt-1">{selectedRecord.description || '无'}</div>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* Asset Selection Modal */}
      <Modal
        title="选择资产"
        open={isAssetSelectModalOpen}
        onCancel={() => setIsAssetSelectModalOpen(false)}
        onOk={() => setIsAssetSelectModalOpen(false)}
        width={1100}
        centered
      >
        <Row gutter={24} style={{ height: '600px' }}>
          {/* Left Side: Asset List */}
          <Col span={16} className="h-full flex flex-col border-r pr-6">
            <Input 
              prefix={<SearchOutlined />} 
              placeholder="搜索品牌、编号、名称、序列号、使用人" 
              className="mb-4"
              onChange={e => handleSearchAsset(e.target.value)}
            />
            <Table 
              size="small"
              columns={assetColumns}
              dataSource={filteredAssets}
              rowKey="id"
              scroll={{ y: 460 }}
              pagination={{ 
                defaultPageSize: 10, 
                showSizeChanger: true, 
                showTotal: (total) => `共 ${total} 条`
              }}
              rowSelection={{
                selectedRowKeys: selectedAssets.map(a => a.id),
                onSelect: (record, selected) => toggleAssetSelection(record),
                onSelectAll: (selected, selectedRows, changeRows) => {
                   if (selected) {
                     // Add all filtered assets to selection (avoid duplicates)
                     const newSelection = [...selectedAssets];
                     changeRows.forEach(row => {
                       if (!newSelection.find(a => a.id === row.id)) newSelection.push(row);
                     });
                     setSelectedAssets(newSelection);
                   } else {
                     // Remove all changeRows from selection
                     const idsToRemove = changeRows.map(r => r.id);
                     setSelectedAssets(selectedAssets.filter(a => !idsToRemove.includes(a.id)));
                   }
                }
              }}
            />
          </Col>
          
          {/* Right Side: Selected List */}
          <Col span={8} className="h-full flex flex-col pl-4">
            <div className="flex justify-between items-center mb-2">
              <Text strong>已选资产 ({selectedAssets.length})</Text>
              <Button type="link" size="small" onClick={() => setSelectedAssets([])}>清空</Button>
            </div>
            <div className="flex-1 overflow-y-auto border rounded p-2 bg-gray-50">
               {selectedAssets.length === 0 ? (
                 <div className="text-gray-400 text-center mt-10">暂无选择</div>
               ) : (
                 <List
                   size="small"
                   dataSource={selectedAssets}
                   renderItem={item => (
                     <List.Item actions={[<Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => toggleAssetSelection(item)} />]}>
                       <List.Item.Meta
                         title={item.name}
                         description={<span className="text-xs">{item.asset_code} | {item.brand}</span>}
                       />
                     </List.Item>
                   )}
                 />
               )}
            </div>
          </Col>
        </Row>
      </Modal>
    </div>
  );
};

export default AssetOperationPage;