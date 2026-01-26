
import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Select, DatePicker, InputNumber, Card, message, Spin, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Category, Department } from '../types';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const AssetForm: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    fetchMetadata();
    if (isEditMode) {
      fetchAssetDetails();
    }
  }, [id]);

  const fetchMetadata = async () => {
    try {
      const [catRes, deptRes] = await Promise.all([
        supabase.from('categories').select('*'),
        supabase.from('departments').select('*'),
      ]);

      if (catRes.error) throw catRes.error;
      if (deptRes.error) throw deptRes.error;

      setCategories(catRes.data || []);
      setDepartments(deptRes.data || []);
    } catch (error: any) {
      message.error('Failed to load metadata');
    }
  };

  const fetchAssetDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      form.setFieldsValue({
        ...data,
        purchase_date: data.purchase_date ? dayjs(data.purchase_date) : null,
      });
    } catch (error: any) {
      message.error('Failed to load asset details');
      navigate('/assets/list');
    } finally {
      setLoading(false);
    }
  };

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      const assetData = {
        ...values,
        purchase_date: values.purchase_date ? values.purchase_date.format('YYYY-MM-DD') : null,
      };

      if (isEditMode) {
        const { error } = await supabase
          .from('assets')
          .update(assetData)
          .eq('id', id);
        if (error) throw error;
        message.success('Asset updated successfully');
      } else {
        const { data, error } = await supabase
          .from('assets')
          .insert([assetData])
          .select()
          .single();
        
        if (error) throw error;

        // Create 'inbound' flow record for new assets
        if (data) {
           await supabase.from('asset_flow_records').insert([{
             asset_id: data.id,
             operation_type: 'inbound',
             operator: 'System', // In real app, use current user
             operation_time: new Date().toISOString(),
             description: 'Asset created and inbound to stock',
             target_location: values.location || 'Warehouse',
             target_employee_name: 'Warehouse Keeper'
           }]);
        }

        message.success('Asset created successfully');
      }
      navigate('/assets/list');
    } catch (error: any) {
      message.error('Failed to save asset: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Spin size="large" /></div>;
  }

  return (
    <div>
      <div className="flex items-center mb-6">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/assets/list')} className="mr-4" />
        <h2 className="text-2xl font-bold m-0">{isEditMode ? '编辑资产' : '资产入库'}</h2>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ status: 'in_stock' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              name="asset_code"
              label="资产编号"
              rules={[{ required: true, message: '请输入资产编号' }]}
            >
              <Input placeholder="例如：AST-001" disabled={isEditMode} />
            </Form.Item>

            <Form.Item
              name="name"
              label="资产名称"
              rules={[{ required: true, message: '请输入资产名称' }]}
            >
              <Input placeholder="例如：MacBook Pro" />
            </Form.Item>

            <Form.Item
              name="category_id"
              label="资产分类"
              rules={[{ required: true, message: '请选择分类' }]}
            >
              <Select placeholder="选择分类">
                {categories.map(cat => (
                  <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="department_id"
              label="所属部门"
            >
              <Select placeholder="选择部门">
                {departments.map(dept => (
                  <Option key={dept.id} value={dept.id}>{dept.name}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="status"
              label="状态"
              rules={[{ required: true, message: '请选择状态' }]}
            >
              <Select>
                <Option value="in_stock">在库</Option>
                <Option value="in_use">在用</Option>
                <Option value="maintenance">维修中</Option>
                <Option value="scrapped">报废</Option>
                <Option value="cleared">已清运</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="purchase_price"
              label="采购价格"
            >
              <InputNumber
                style={{ width: '100%' }}
                formatter={value => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value?.replace(/\¥\s?|(,*)/g, '') as unknown as number}
              />
            </Form.Item>

            <Form.Item
              name="purchase_date"
              label="采购日期"
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="location"
              label="存放位置"
            >
              <Input placeholder="例如：A栋101室" />
            </Form.Item>
          </div>

          <Form.Item
            name="description"
            label="备注"
          >
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item className="mb-0 text-right">
            <Space>
              <Button onClick={() => navigate('/assets/list')}>取消</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {isEditMode ? '更新资产' : '确认入库'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default AssetForm;
