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
  Pagination
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ImportOutlined, 
  ExportOutlined,
  SearchOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

// Mock Data based on OCR
const MOCK_DATA = [
  { id: 1, account: 'admin', name: 'admin', nickname: 'admin', dept: '一汽大众汽车有限公司', phone: '', status: true },
  { id: 2, account: 'jwuser', name: 'jwuser', nickname: 'jwuser', dept: '', phone: '', status: true },
  { id: 91, account: 'fusheng zheng', name: '郑福胜', nickname: 'fusheng zheng', dept: '国际运输与海关商检科', phone: '', status: false },
  { id: 93, account: 'xiaodong li.LO', name: '刘晓东', nickname: 'xiaodong li.LO', dept: '物料管理科', phone: '', status: false },
  { id: 109, account: 'Miao.Liang', name: '梁茂', nickname: 'Miao.Liang', dept: '区域售后服务部（V）', phone: '', status: false },
  { id: 118, account: 'hong li', name: '李红', nickname: 'hong li', dept: '零售营销部（A）', phone: '', status: false },
  { id: 124, account: 'huafeng.zhang', name: '张华风', nickname: 'huafeng.zhang', dept: '国际服务中心', phone: '', status: false },
  { id: 220, account: 'wei fang', name: '房伟', nickname: 'wei fang', dept: '焊装一车间-Q5L维修区域-维修工段甲-维修2班', phone: '', status: false },
  { id: 252, account: 'Shaojie Pan', name: '潘少杰', nickname: 'Shaojie Pan', dept: '热管理及充电系统开发科', phone: '', status: false },
  { id: 256, account: 'hongjun.wang.cp', name: '王洪军', nickname: 'hongjun.wang.cp', dept: '焊装三车间-AGL生产一区域', phone: '', status: false },
];

const UserManagementPage: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState(MOCK_DATA);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const columns = [
    {
      title: '序号',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '用户账号',
      dataIndex: 'account',
      key: 'account',
    },
    {
      title: '用户姓名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '用户昵称',
      dataIndex: 'nickname',
      key: 'nickname',
    },
    {
      title: '部门',
      dataIndex: 'dept',
      key: 'dept',
    },
    {
      title: '手机号码',
      dataIndex: 'phone',
      key: 'phone',
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
      // In real app, call API here. For now just mock loading.
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
          <Row gutter={[16, 16]} className="w-full">
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="dept" label="部门名称" className="w-full mb-0">
                <Select placeholder="请选择部门" allowClear>
                  <Option value="dept1">技术部</Option>
                  <Option value="dept2">人事部</Option>
                  <Option value="dept3">财务部</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="userType" label="用户类型" className="w-full mb-0">
                <Select placeholder="请选择" allowClear>
                  <Option value="admin">管理员</Option>
                  <Option value="user">普通用户</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="name" label="用户名称" className="w-full mb-0">
                <Input placeholder="请输入用户名称" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="phone" label="手机号码" className="w-full mb-0">
                <Input placeholder="请输入手机号码" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="status" label="状态" className="w-full mb-0">
                <Select placeholder="用户状态" allowClear>
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
            <Col xs={24} sm={12} md={8} lg={12} xl={12} className="text-right">
              <Space>
                <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查询</Button>
                <Button onClick={() => form.resetFields()}>重置</Button>
              </Space>
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
          <Button icon={<ImportOutlined />}>导入</Button>
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
            total: 14970, // Mock total from image
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            defaultPageSize: 10
          }}
          scroll={{ y: 'calc(100vh - 350px)' }}
        />
      </div>
    </div>
  );
};

export default UserManagementPage;
