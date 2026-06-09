import React, { useEffect, useMemo, useState } from 'react';
import { Table, Button, Dropdown, Input, Switch, Space, Row, Col, Form, message, Modal, Popconfirm, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, DownOutlined, UploadOutlined, ReloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabase';
import { downloadImportTemplate } from '../lib/importTemplates';
import ExcelImportModal from '../components/ExcelImportModal';
import { buildErrorReportXlsx, errorReportFileName, formatImportSummary, importSysDictionary } from '../lib/importers';

const DICT_CODE = 'user_role';

type RoleRow = {
  id: string;
  dict_id: string;
  label: string;
  value: string;
  sort_order: number;
  status: boolean;
  description?: string | null;
  created_at?: string;
};

const RoleManagementPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dictId, setDictId] = useState<string>('');
  const [dataSource, setDataSource] = useState<RoleRow[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const [searchForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const selectedRow = useMemo(() => {
    const id = selectedRowKeys.length === 1 ? String(selectedRowKeys[0]) : '';
    return id ? dataSource.find((x) => x.id === id) || null : null;
  }, [dataSource, selectedRowKeys]);

  const ensureDict = async () => {
    const { data: existed, error } = await supabase.from('sys_dictionaries').select('id,code').eq('code', DICT_CODE).limit(1).single();
    if (error && !String(error?.message || '').includes('No rows')) throw error;
    if (existed?.id) {
      setDictId(existed.id);
      return existed.id as string;
    }
    const { data: created, error: createErr } = await supabase
      .from('sys_dictionaries')
      .insert({ code: DICT_CODE, name: '用户角色', description: '用户角色（用于页面展示与配置）' })
      .select('id,code')
      .single();
    if (createErr) throw createErr;
    setDictId(created.id);

    const seed = [
      { dict_id: created.id, label: '管理员', value: 'admin', sort_order: 1, status: true, description: '' },
      { dict_id: created.id, label: '主管', value: 'manager', sort_order: 2, status: true, description: '' },
      { dict_id: created.id, label: '普通用户', value: 'user', sort_order: 3, status: true, description: '' }
    ];
    await supabase.from('sys_dictionary_items').insert(seed);
    return created.id as string;
  };

  const fetchRoles = async (values: any = {}) => {
    setLoading(true);
    try {
      const keyword = String(values.keyword || '').trim();
      const id = dictId || (await ensureDict());
      let q: any = supabase.from('sys_dictionary_items').select('*').eq('dict_id', id).order('sort_order', { ascending: true });
      if (keyword) q = q.or(`label.ilike.%${keyword}%,value.ilike.%${keyword}%`);
      const { data, error } = await q;
      if (error) throw error;
      setDataSource((data || []) as any);
    } catch (e: any) {
      message.error(`获取角色列表失败：${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRoles();
  }, []);

  const openCreate = async () => {
    const id = dictId || (await ensureDict());
    setEditing(null);
    editForm.resetFields();
    editForm.setFieldsValue({ dict_id: id, sort_order: 0, status: true });
    setIsEditOpen(true);
  };

  const openEdit = (row: RoleRow) => {
    setEditing(row);
    editForm.setFieldsValue({
      label: row.label,
      value: row.value,
      sort_order: row.sort_order,
      status: row.status,
      description: row.description || ''
    });
    setIsEditOpen(true);
  };

  const handleDelete = async (ids: string[]) => {
    if (!ids.length) return;
    setLoading(true);
    try {
      for (const id of ids) {
        const { error } = await supabase.from('sys_dictionary_items').delete().eq('id', id);
        if (error) throw error;
      }
      message.success('删除成功');
      setSelectedRowKeys([]);
      await fetchRoles(searchForm.getFieldsValue());
    } catch (e: any) {
      message.error(`删除失败：${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const importMenu = {
    items: [
      { key: 'template', label: '下载导入模板', onClick: () => downloadImportTemplate('roles') },
      { key: 'import', label: '导入数据', onClick: () => setIsImportOpen(true) }
    ]
  };

  const columns: any[] = [
    { title: '角色名称', dataIndex: 'label', key: 'label' },
    { title: '权限字符', dataIndex: 'value', key: 'value' },
    { title: '显示顺序', dataIndex: 'sort_order', key: 'sort_order', width: 120 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (checked: boolean, row: RoleRow) => (
        <Switch
          checked={checked}
          size="small"
          onChange={async (v) => {
            const { error } = await supabase.from('sys_dictionary_items').update({ status: v }).eq('id', row.id);
            if (error) message.error(`更新失败：${error.message}`);
            else {
              message.success('状态更新成功');
              await fetchRoles(searchForm.getFieldsValue());
            }
          }}
        />
      )
    },
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
      render: (_: any, row: RoleRow) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>
            编辑
          </Button>
          <Popconfirm title="确定删除该角色？" onConfirm={() => handleDelete([row.id])}>
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="h-full flex flex-col">
      <ExcelImportModal
        open={isImportOpen}
        title="导入角色"
        sheetNames={['模板']}
        onClose={() => setIsImportOpen(false)}
        onImport={async (dataBySheet) => {
          const rows = (dataBySheet['模板'] || []).map((r: any) => ({
            dict_code: DICT_CODE,
            label: String(r.role_name || '').trim(),
            value: String(r.role_key || '').trim(),
            sort_order: Number(r.sort_order || 0),
            status: r.status === undefined || r.status === null ? true : Boolean(r.status),
            description: String(r.description || '').trim() || null
          }));
          const dictRows = [{ code: DICT_CODE, name: '用户角色', description: '用户角色（用于页面展示与配置）' }];
          const res = await importSysDictionary(dictRows, rows);
          if (res.failed) {
            const wb = buildErrorReportXlsx(res.errors);
            XLSX.writeFile(wb, errorReportFileName('角色'));
            message.warning(`${formatImportSummary(res)}，已生成错误报告`);
          } else {
            message.success(formatImportSummary(res));
          }
          await fetchRoles(searchForm.getFieldsValue());
        }}
      />

      <div className="bg-white p-4 rounded-lg shadow-sm mb-4">
        <Form form={searchForm} layout="inline" onFinish={(v) => void fetchRoles(v)} className="w-full">
          <Row gutter={[16, 16]} className="w-full items-center">
            <Col xs={24} sm={12} md={10} lg={8} xl={8}>
              <Form.Item name="keyword" label="关键字" className="w-full mb-0">
                <Input placeholder="角色名称/权限字符" allowClear />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} md={14} lg={16} xl={16} className="text-right">
              <Space>
                <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                  查询
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    searchForm.resetFields();
                    void fetchRoles();
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
          <Button type="primary" icon={<PlusOutlined />} onClick={() => void openCreate()}>
            新增
          </Button>
          <Button icon={<EditOutlined />} disabled={!selectedRow} onClick={() => selectedRow && openEdit(selectedRow)}>
            修改
          </Button>
          <Popconfirm title="确定删除选中角色？" onConfirm={() => handleDelete(selectedRowKeys.map((k) => String(k)))}>
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
        title={editing ? '编辑角色' : '新增角色'}
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
          const id = dictId || (await ensureDict());
          const payload = {
            dict_id: id,
            label: String(values.label || '').trim(),
            value: String(values.value || '').trim(),
            sort_order: Number(values.sort_order || 0),
            status: Boolean(values.status),
            description: String(values.description || '').trim() || null
          };

          if (editing) {
            const { error } = await supabase.from('sys_dictionary_items').update(payload).eq('id', editing.id);
            if (error) {
              message.error(`保存失败：${error.message}`);
              return;
            }
          } else {
            const { error } = await supabase.from('sys_dictionary_items').insert(payload);
            if (error) {
              message.error(`保存失败：${error.message}`);
              return;
            }
          }

          message.success('保存成功');
          setIsEditOpen(false);
          setEditing(null);
          editForm.resetFields();
          await fetchRoles(searchForm.getFieldsValue());
        }}
      >
        <Form form={editForm} layout="vertical" initialValues={{ sort_order: 0, status: true }}>
          <Form.Item name="label" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
            <Input placeholder="例如：库房管理员" />
          </Form.Item>
          <Form.Item name="value" label="权限字符" rules={[{ required: true, message: '请输入权限字符' }]}>
            <Input placeholder="例如：warehouse" />
          </Form.Item>
          <Form.Item name="sort_order" label="显示顺序">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="status" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="description" label="备注">
            <Input.TextArea rows={3} placeholder="可选" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoleManagementPage;
