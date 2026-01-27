import React, { useState, useEffect } from 'react';
import { Card, DatePicker, Button, Table, Tag, Space, InputNumber, message, Empty, Radio } from 'antd';
import { DownloadOutlined, HistoryOutlined, CalendarOutlined } from '@ant-design/icons';
import { supabase } from '../lib/supabase';
import { Asset } from '../types';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

const { RangePicker } = DatePicker;

type TimeRangeType = 'days' | 'custom';

interface StagnantInventoryProps {
  className?: string;
}

const StagnantInventory: React.FC<StagnantInventoryProps> = ({ className = '' }) => {
  const [timeRangeType, setTimeRangeType] = useState<TimeRangeType>('days');
  const [stagnantDays, setStagnantDays] = useState<number>(90);
  const [stagnantAssets, setStagnantAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [customDateRange, setCustomDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [tableParams, setTableParams] = useState({
    pagination: {
      current: 1,
      pageSize: 10,
      total: 0,
    },
  });

  // 获取呆滞库存数据
  const fetchStagnantAssets = async () => {
    setLoading(true);
    try {
      let startDate: dayjs.Dayjs;
      let endDate: dayjs.Dayjs;

      if (timeRangeType === 'custom' && customDateRange) {
        startDate = customDateRange[0];
        endDate = customDateRange[1];
      } else {
        endDate = dayjs();
        startDate = endDate.subtract(stagnantDays, 'day');
      }

      // 1. 获取在库状态的资产
      const { data: inStockAssets, error: assetsError } = await supabase
        .from('assets')
        .select(`
          *,
          category:categories(name),
          flows:asset_flow_records(
            id,
            operation_type,
            operation_time,
            operator
          )
        `)
        .eq('status', 'in_stock');

      if (assetsError) throw assetsError;

      // 2. 筛选呆滞库存（在指定时间段内没有任何资产流动记录）
      const stagnantAssets = (inStockAssets || []).filter((asset: any) => {
        // 如果没有任何流动记录，则认为是呆滞的
        if (!asset.flows || asset.flows.length === 0) {
          return true;
        }

        // 检查在指定时间段内是否有流动记录
        const hasRecentFlow = asset.flows.some((flow: any) => {
          const flowDate = dayjs(flow.operation_time);
          return flowDate.isAfter(startDate) && flowDate.isBefore(endDate);
        });

        // 如果没有近期流动记录，则认为是呆滞的
        return !hasRecentFlow;
      });

      setStagnantAssets(stagnantAssets);
      setTableParams({
        ...tableParams,
        pagination: {
          ...tableParams.pagination,
          total: stagnantAssets.length,
        },
      });
    } catch (error) {
      console.error('获取呆滞库存数据失败:', error);
      message.error('获取呆滞库存数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 导出功能
  const handleExport = () => {
    if (!stagnantAssets.length) {
      message.warning('暂无呆滞库存数据可导出');
      return;
    }

    const exportData = stagnantAssets.map(asset => ({
      '资产编号': asset.asset_code,
      '资产名称': asset.name,
      '品类': asset.category?.name || '-',
      '采购价格': asset.purchase_price || 0,
      '采购日期': asset.purchase_date ? dayjs(asset.purchase_date).format('YYYY-MM-DD') : '-',
      '采购订单': asset.purchase_order || '-',
      '项目': asset.project_name || '-',
      '最后更新时间': asset.updated_at ? dayjs(asset.updated_at).format('YYYY-MM-DD HH:mm') : '-',
      '状态': asset.status === 'in_stock' ? '在库' : '其他',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '呆滞库存清单');
    
    const fileName = timeRangeType === 'custom' && customDateRange 
      ? `呆滞库存_${customDateRange[0].format('YYYYMMDD')}_${customDateRange[1].format('YYYYMMDD')}`
      : `呆滞库存_${stagnantDays}天`;
    
    XLSX.writeFile(wb, `${fileName}_${dayjs().format('YYYYMMDD')}.xlsx`);
    message.success('导出成功');
  };

  // 表格列定义
  const columns = [
    {
      title: '项目',
      dataIndex: 'project_name',
      key: 'project_name',
      ellipsis: true,
      width: '15%',
      render: (text: string) => <span className="font-bold text-gray-800">{text || '-'}</span>,
    },
    {
      title: '资产编号',
      dataIndex: 'asset_code',
      key: 'asset_code',
      width: '15%',
      render: (text: string) => <span className="font-mono text-gray-600 text-sm">{text}</span>,
    },
    {
      title: '资产名称',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      width: '20%',
      render: (text: string) => <span className="font-medium text-gray-800">{text}</span>,
    },
    {
      title: '品类',
      dataIndex: ['category', 'name'],
      key: 'category',
      width: '10%',
      render: (text: string) => <Tag color="blue">{text || '-'}</Tag>,
    },
    {
      title: '采购价格',
      dataIndex: 'purchase_price',
      key: 'purchase_price',
      width: '10%',
      align: 'right' as const,
      render: (value: number) => (
        <span className="font-medium text-gray-700">
          ¥{(value || 0).toLocaleString()}
        </span>
      ),
    },
    {
      title: '呆滞天数',
      key: 'stagnant_days',
      width: '10%',
      render: (_: any, record: Asset) => {
        // Calculate stagnant days: now - (last flow time OR purchase date)
        const lastActivityTime = record.last_record 
          ? dayjs(record.last_record) 
          : (record.purchase_date ? dayjs(record.purchase_date) : dayjs(record.created_at));
        
        const days = dayjs().diff(lastActivityTime, 'day');
        return (
          <Tag color="orange">
            {Math.max(0, days)} 天
          </Tag>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: '10%',
      align: 'center' as const,
      render: (status: string) => (
        <Tag color={status === 'in_stock' ? 'green' : 'default'}>
          {status === 'in_stock' ? '在库' : '其他'}
        </Tag>
      ),
    },
  ];

  useEffect(() => {
    fetchStagnantAssets();
  }, [stagnantDays, customDateRange, timeRangeType]);

  return (
    <Card
      title={
        <div className="flex items-center gap-3">
          <HistoryOutlined className="text-orange-500" />
          <span className="text-lg font-bold text-gray-800">呆滞库存分析</span>
          <Tag color="orange">{stagnantAssets.length} 台设备</Tag>
        </div>
      }
      className={`shadow-lg rounded-2xl ${className}`}
      extra={
        <Space size="middle">
          <Radio.Group 
            value={timeRangeType} 
            onChange={(e) => setTimeRangeType(e.target.value)}
            buttonStyle="solid"
            size="small"
          >
            <Radio.Button value="days">按天数</Radio.Button>
            <Radio.Button value="custom">自定义日期</Radio.Button>
          </Radio.Group>
          
          {timeRangeType === 'days' ? (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">呆滞天数:</span>
              <InputNumber
                min={1}
                max={3650}
                value={stagnantDays}
                onChange={(value) => setStagnantDays(value || 90)}
                style={{ width: 80 }}
                placeholder="天数"
                size="small"
              />
              <span className="text-gray-500 text-sm">天</span>
            </div>
          ) : (
            <RangePicker
              value={customDateRange}
              onChange={(dates) => setCustomDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
              placeholder={['开始日期', '结束日期']}
              style={{ width: 240 }}
              size="small"
            />
          )}
          
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            loading={loading}
            className="flex items-center"
            size="small"
          >
            导出
          </Button>
        </Space>
      }
    >
      <Table
        columns={columns}
        dataSource={stagnantAssets}
        rowKey="id"
        loading={loading}
        pagination={tableParams.pagination}
        onChange={(pagination) => {
          setTableParams({
            ...tableParams,
            pagination: {
              current: pagination.current || 1,
              pageSize: pagination.pageSize || 10,
              total: pagination.total || 0,
            },
          });
        }}
        scroll={{ x: 800 }}
        locale={{
          emptyText: (
            <Empty
              description="暂无呆滞库存数据"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
        className="custom-table"
        size="small"
      />
    </Card>
  );
};

export default StagnantInventory;