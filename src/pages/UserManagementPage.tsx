import React, { useEffect, useMemo, useState } from 'react';
import { Table, Button, Dropdown, Input, Select, Space, Row, Col, Form, message, Modal, Popconfirm, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, DownOutlined, UploadOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { downloadImportTemplate } from '../lib/importTemplates';
import ExcelImportModal from '../components/ExcelImportModal';
import { buildErrorReportXlsx, errorReportFileName, formatImportSummary, importUsers } from '../lib/importers';

const { Option } = Select;

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user';
  job_title?: string | null;
  created_at?: string;
};

const UserManagementPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<UserRow[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const [searchForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const selectedRow = useMemo(() => {
    const id = selectedRowKeys.length === 1 ? String(selectedRowKeys[0]) : '';
    return id ? dataSource.find((x) => x.id === id) || null : null;
  }, [dataSource, selectedRowKeys]);

  const fetchUsers = async (values: any = {}) => {
    setLoading(true);
    try {
      const keyword = String(values.keyword || '').trim();
      const role = String(values.role || '').trim();

      let q: any = supabase.from('users').select('*').order('created_at', { ascending: false });
      if (keyword) q = q.or(`name.ilike.%${keyword}%,email.ilike.%${keyword}%`);
      if (role) q = q.eq('role', role);

      const { data, error } = await q;
      if (error) throw error;
      setDataSource((data || []) as any);
    } catch (e: any) {
      message.error(`获取用户列表失败：${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const openCreate = () => {
    setEditing(null);
    editForm.resetFields();
    setIsEditOpen(true);
  };

  const openEdit = (row: UserRow) => {
    setEditing(row);
    editForm.setFieldsValue({
      email: row.email,
      name: row.name,
      role: row.role,
      job_title: row.job_title || '',
      password: ''
    });
    setIsEditOpen(true);
  };

  const handleDelete = async (ids: string[]) => {
    if (!ids.length) return;
    setLoading(true);
    try {
      for (const id of ids) {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
      }
      message.success('删除成功');
      setSelectedRowKeys([]);
      await fetchUsers(searchForm.getFieldsValue());
    } catch (e: any) {
      message.error(`删除失败：${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const columns: any[] = [
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (v: string) => {
        const color = v === 'admin' ? 'red' : v === 'manager' ? 'blue' : 'default';
        const label = v === 'admin' ? '管理员' : v === 'manager' ? '主管' : '普通用户';
        return <Tag color={color}>{label}</Tag>;
      }
    },
    { title: '职位', dataIndex: 'job_title', key: 'job_title', render: (v: string) => v || '-' },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-')
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: any, row: UserRow) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>
            编辑
          </Button>
          <Popconfirm title="确定删除该用户？" onConfirm={() => handleDelete([row.id])}>
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  const importMenu = {
    items: [
      { key: 'template', label: '下载导入模板', onClick: () => downloadImportTemplate('users') },
      { key: 'import', label: '导入数据', onClick: () => setIsImportOpen(true) }
    ]
  };

  return (
    <div className="h-full flex flex-col">
      <ExcelImportModal
        open={isImportOpen}
        title="导入人员"
        sheetNames={['模板']}
        onClose={() => setIsImportOpen(false)}
        onImport={async (dataBySheet) => {
          const res = await importUsers(dataBySheet['模板'] || []);
          if (res.failed) {
            const wb = buildErrorReportXlsx(res.errors);
            XLSX.writeFile(wb, errorReportFileName('人员'));
            message.warning(`${formatImportSummary(res)}，已生成错误报告`);
          } else {
            message.success(formatImportSummary(res));
          }
          await fetchUsers(searchForm.getFieldsValue());
        }}
      />

      <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
        <Form
          form={searchForm}
          layout="inline"
          onFinish={(v) => void fetchUsers(v)}
          className="w-full"
        >
          <Row gutter={[16, 16]} className="w-full items-center">
            <Col xs={24} sm={12} md={10} lg={8} xl={8}>
              <Form.Item name="keyword" label="关键字" className="w-full mb-0">
                <Input placeholder="姓名/邮箱" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6} xl={6}>
              <Form.Item name="role" label="角色" className="w-full mb-0">
                <Select placeholder="全部" allowClear>
                  <Option value="admin">管理员</Option>
                  <Option value="manager">主管</Option>
                  <Option value="user">普通用户</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} md={6} lg={10} xl={10} className="text-right">
              <Space>
                <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                  查询
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    searchForm.resetFields();
                    void fetchUsers();
                  }}
                >
                  重置
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm flex-1 flex flex-col">
        <div className="mb-4 flex gap-2">
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增
          </Button>
          <Button icon={<EditOutlined />} disabled={!selectedRow} onClick={() => selectedRow && openEdit(selectedRow)}>
            修改
          </Button>
          <Popconfirm title="确定删除选中用户？" onConfirm={() => handleDelete(selectedRowKeys.map((k) => String(k)))}>
            <Button icon={<DeleteOutlined />} danger disabled={selectedRowKeys.length === 0}>
              删除
            </Button>
          </Popconfirm>
          <Dropdown menu={importMenu}>
            <Button icon={<UploadOutlined />}>
              导入 <DownOutlined />
            </Button>
          </Dropdown>
        </div>

        <Table
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys)
          }}
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
          scroll={{ y: 'calc(100vh - 350px)' }}
        />
      </div>

      <Modal
        title={editing ? '编辑用户' : '新增用户'}
        open={isEditOpen}
        okText="保存"
        cancelText="取消"
        onCancel={() => {
          setIsEditOpen(false);
          setEditing(null);
          editForm.resetFields();
        }}
        onOk={async () => {
          const values = await editForm.validateFields();
          const payload = {
            email: String(values.email || '').trim(),
            name: String(values.name || '').trim(),
            role: String(values.role || 'user').trim(),
            job_title: String(values.job_title || '').trim() || null,
            password: String(values.password || '')
          };
          const res = await importUsers([payload]);
          if (res.failed) {
            message.error(res.errors?.[0]?.message || '保存失败');
            return;
          }
          message.success(formatImportSummary(res));
          setIsEditOpen(false);
          setEditing(null);
          editForm.resetFields();
          await fetchUsers(searchForm.getFieldsValue());
        }}
      >
        <Form form={editForm} layout="vertical" initialValues={{ role: 'user' }}>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ required: true, message: '请输入邮箱' }]}
          >
            <Input placeholder="user@xxx.com" disabled={!!editing} />
          </Form.Item>
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select>
              <Option value="admin">管理员</Option>
              <Option value="manager">主管</Option>
              <Option value="user">普通用户</Option>
            </Select>
          </Form.Item>
          <Form.Item name="job_title" label="职位">
            <Input placeholder="可选" />
          </Form.Item>
          <Form.Item
            name="password"
            label={editing ? '重置密码' : '初始密码'}
            rules={editing ? [] : [{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder={editing ? '留空则不修改' : '请输入'} autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagementPage;
