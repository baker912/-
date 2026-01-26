import React, { useState } from 'react';
import { 
  Table, 
  Button, 
  Input, 
  Select, 
  DatePicker, 
  Switch, 
  Space, 
  Row, 
  Col, 
  Form,
  message,
  Pagination,
  Tooltip
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ExportOutlined,
  SearchOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

// Mock Data based on OCR
const MOCK_DATA = [
  { id: 3, roleName: '库房管理员', roleKey: 'manage', sortOrder: 0, status: true, createdAt: '2025-03-31' },
  { id: 1, roleName: '超级管理员', roleKey: 'admin', sortOrder: 1, status: true, createdAt: '2025-03-31' },
  { id: 2, roleName: '普通角色', roleKey: 'common', sortOrder: 2, status: true, createdAt: '2025-03-31' },
];

const RoleManagementPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState(MOCK_DATA);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const columns = [
    {
      title: '角色编号',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: '角色名称',
      dataIndex: 'roleName',
      key: 'roleName',
    },
    {
      title: '权限字符',
      dataIndex: 'roleKey',
      key: 'roleKey',
    },
    {
      title: '显示顺序',
      dataIndex: 'sortOrder',
      key: 'sortOrder',
      width: 100,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (checked: boolean, record: any) => (
        <Switch 
          checked={checked} 
          size="small"
          onChange={(val) => handleStatusChange(record.id, val)}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button type="link" icon={<EditOutlined />} size="small" />
          </Tooltip>
          <Tooltip title="删除">
            <Button type="link" danger icon={<DeleteOutlined />} size="small" />
          </Tooltip>
          <Tooltip title="数据权限">
            <Button type="link" icon={<CheckCircleOutlined />} size="small" />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const handleStatusChange = (id: number, checked: boolean) => {
    const newData = dataSource.map(item => 
      item.id === id ? { ...item, status: checked } : item
    );
    setDataSource(newData);
    message.success(`状态已${checked ? '开启' : '关闭'}`);
  };

  const handleSearch = (values: any) => {
    setLoading(true);
    // Simulate API search
    setTimeout(() => {
      console.log('Search values:', values);
      setLoading(false);
    }, 500);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <div className="h-full flex flex-col">
      {/* Filter Area */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
        <Form
          form={form}
          layout="inline"
          onFinish={handleSearch}
          className="w-full"
        >
          <Row gutter={[16, 16]} className="w-full items-center">
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="roleName" label="角色名称" className="w-full mb-0">
                <Input placeholder="请输入角色名称" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="roleKey" label="权限字符" className="w-full mb-0">
                <Input placeholder="请输入权限字符" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4} xl={4}>
              <Form.Item name="status" label="状态" className="w-full mb-0">
                <Select placeholder="角色状态" allowClear>
                  <Option value="1">启用</Option>
                  <Option value="0">禁用</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="dateRange" label="创建时间" className="w-full mb-0">
                <RangePicker className="w-full" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={2} xl={2} className="text-right">
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>搜索</Button>
            </Col>
          </Row>
        </Form>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-lg shadow-sm flex-1 flex flex-col">
        <div className="mb-4 space-x-2">
          <Button type="primary" icon={<PlusOutlined />}>新增</Button>
          <Button icon={<EditOutlined />} disabled={selectedRowKeys.length !== 1}>修改</Button>
          <Button icon={<DeleteOutlined />} danger disabled={selectedRowKeys.length === 0}>删除</Button>
          <Button icon={<ExportOutlined />}>导出</Button>
        </div>

        {/* Table */}
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={loading}
          pagination={{
            total: 3,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            defaultPageSize: 10
          }}
        />
      </div>
    </div>
  );
};

export default RoleManagementPage;
