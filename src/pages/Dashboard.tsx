import React, { useEffect, useState, useMemo } from 'react';
import { 
  Row, Col, Statistic, Button, Spin, Select, Table, Tag, 
  message, Space, Divider, Tooltip, Empty, Progress, Avatar, Radio, DatePicker,
  InputNumber, Modal
} from 'antd';
import { 
  ShoppingOutlined, 
  DollarOutlined, 
  SyncOutlined,
  DownloadOutlined,
  PieChartOutlined,
  BarChartOutlined,
  FileTextOutlined,
  AlertOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  UserOutlined,
  ArrowRightOutlined,
  RiseOutlined,
  FallOutlined,
  HistoryOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { supabase } from '../lib/supabase';
import { Asset, Category } from '../types';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import StagnantInventory from '../components/StagnantInventory';

const { RangePicker } = DatePicker;

// --- Types ---
interface AssetFlowRecord {
  id: string;
  asset_id: string;
  operation_type: string;
  operator: string;
  operation_time: string;
  description: string;
  related_form_no?: string;
  target_employee_name?: string;
  target_department_name?: string;
  target_location?: string;
  asset?: {
    asset_code: string;
    name: string;
    purchase_price?: number;
  };
}

// --- Components ---

const GlassCard = ({ children, className = '', title, extra, icon }: any) => (
  <div className={`bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 ${className}`}>
    {(title || extra) && (
      <div className="px-6 py-4 border-b border-gray-100/50 flex justify-between items-center bg-gradient-to-r from-white/50 to-transparent">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shadow-sm">
              {icon}
            </div>
          )}
          <h3 className="text-lg font-bold text-gray-800 m-0 tracking-tight">{title}</h3>
        </div>
        <div>{extra}</div>
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

const StatCard = ({ title, value, prefix, suffix, color = "blue", subtext, trend }: any) => {
  const colorStyles: any = {
    blue: "from-blue-500 to-indigo-600 shadow-blue-200",
    green: "from-emerald-400 to-teal-500 shadow-emerald-200",
    purple: "from-violet-500 to-fuchsia-500 shadow-purple-200",
    orange: "from-amber-400 to-orange-500 shadow-orange-200",
  };

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/50 hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${colorStyles[color]} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-all group-hover:scale-110`} />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="text-gray-500 font-medium text-sm uppercase tracking-wider">{title}</div>
          <div className={`p-2 rounded-lg bg-gradient-to-br ${colorStyles[color]} text-white shadow-md`}>
            {prefix}
          </div>
        </div>
        
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-gray-800 tracking-tight">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
          {suffix && <span className="text-sm text-gray-500 font-medium">{suffix}</span>}
        </div>

        {subtext && (
          <div className="mt-3 flex items-center text-sm text-gray-500">
             {trend === 'up' && <RiseOutlined className="text-emerald-500 mr-1" />}
             {trend === 'down' && <FallOutlined className="text-rose-500 mr-1" />}
             {subtext}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main Page ---

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [flows, setFlows] = useState<AssetFlowRecord[]>([]);
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [flowTimeRange, setFlowTimeRange] = useState<string>('week'); // week, month, all, custom
  const [customDateRange, setCustomDateRange] = useState<any>(null);

  // Stagnant Inventory State
  const [stagnantDays, setStagnantDays] = useState<number>(90);
  const [isStagnantModalOpen, setIsStagnantModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [flowTimeRange, customDateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Assets first (Lightweight query)
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select('id, status, purchase_price, purchase_date, purchase_order, project_name, name, asset_code, employee_name, updated_at, category:categories(name)');
      
      if (assetsError) throw assetsError;
      
      setAssets((assetsData || []).filter((a: any) => a.status !== 'cleared') as unknown as Asset[]);
      setLoading(false); // Stop loading spinner ASAP to show stats

      // 2. Fetch Categories and Flows in background
      Promise.all([
        supabase.from('categories').select('*'),
        supabase.from('asset_flow_records').select('*, asset:assets(asset_code, name, purchase_price)').order('operation_time', { ascending: false }).limit(50)
      ]).then(([categoriesResult, flowsResult]) => {
        const categoriesData = categoriesResult.data || [];
        const flowsData = flowsResult.data || [];

        setCategories(categoriesData);
        setFlows(flowsData);

        if (categoriesData.length > 0 && !selectedCategory) setSelectedCategory(categoriesData[0].name);
        
        const uniqueOrders = Array.from(new Set((assetsData || []).map((a: any) => a.purchase_order).filter(Boolean)));
        if (uniqueOrders.length > 0 && !selectedOrder) setSelectedOrder(uniqueOrders[0] as string);
      });

    } catch (error: any) {
      console.error(error);
      message.error('数据加载异常');
      setLoading(false);
    }
  };

  // --- Calculations ---

  const getOperationLabel = (type: string) => {
    switch(type) {
      case 'requisition': return '领用';
      case 'borrow': return '借用';
      case 'return': return '归还';
      case 'transfer': return '转移';
      case 'scrap': return '报废';
      case 'dispose': return '清运';
      case 'inbound': return '入库';
      default: return type;
    }
  };

  const overviewStats = useMemo(() => {
    const totalCount = assets.length;
    const totalValue = assets.reduce((sum, a) => sum + (a.purchase_price || 0), 0);
    const inUseCount = assets.filter(a => a.status === 'in_use').length;
    const inStockCount = assets.filter(a => a.status === 'in_stock').length;
    
    // Group by Category for Pie Chart
    const categoryData = assets.reduce((acc, asset) => {
      const catName = asset.category?.name || '其他';
      if (!acc[catName]) acc[catName] = 0;
      acc[catName] += 1;
      return acc;
    }, {} as Record<string, number>);

    return { totalCount, totalValue, inUseCount, inStockCount, categoryData };
  }, [assets]);

  const categoryStats = useMemo(() => {
    if (!selectedCategory) return null;
    const filtered = assets.filter(a => a.category?.name === selectedCategory);
    const totalCount = filtered.length;
    const totalValue = filtered.reduce((sum, a) => sum + (a.purchase_price || 0), 0);
    
    const now = dayjs();
    const ages = filtered.map(a => a.purchase_date ? now.diff(dayjs(a.purchase_date), 'year', true) : 0);
    const avgAge = ages.length ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;
    
    const statusDist = {
      in_stock: filtered.filter(a => a.status === 'in_stock').length,
      in_use: filtered.filter(a => a.status === 'in_use').length,
    };

    return { filtered, totalCount, totalValue, avgAge, statusDist };
  }, [assets, selectedCategory]);

  const orderStats = useMemo(() => {
    if (!selectedOrder) return null;
    const filtered = assets.filter(a => a.purchase_order === selectedOrder);
    const totalCount = filtered.length;
    const totalAmount = filtered.reduce((sum, a) => sum + (a.purchase_price || 0), 0);
    const inStock = filtered.filter(a => a.status === 'in_stock').length;
    const issued = filtered.filter(a => a.status === 'in_use').length;
    return { filtered, totalCount, totalAmount, inStock, issued };
  }, [assets, selectedOrder]);

  const lifespanStats = useMemo(() => {
    const now = dayjs();
    const buckets = { '0-2年': 0, '2-4年': 0, '4年以上': 0 };
    const warningAssets: Asset[] = [];

    assets.forEach(asset => {
      if (asset.purchase_date) {
        const age = now.diff(dayjs(asset.purchase_date), 'year', true);
        if (age < 2) buckets['0-2年']++;
        else if (age < 4) buckets['2-4年']++;
        else {
          buckets['4年以上']++;
          warningAssets.push(asset);
        }
      }
    });

    return { buckets, warningAssets };
  }, [assets]);

  const scrapStats = useMemo(() => {
    const now = dayjs();
    const candidates = assets.filter(a => {
      if (a.status === 'scrapped') return true;
      if (a.purchase_date) {
        return now.diff(dayjs(a.purchase_date), 'year') >= 4;
      }
      return false;
    });
    const totalValue = candidates.reduce((sum, a) => sum + (a.purchase_price || 0), 0);
    return { candidates, totalCount: candidates.length, totalValue };
  }, [assets]);

  const stagnantStats = useMemo(() => {
    const now = dayjs();
    const thresholdDate = now.subtract(stagnantDays, 'day');
    
    const candidates = assets.filter(a => {
      // Only consider in-stock assets
      if (a.status !== 'in_stock') return false;
      
      // Check updated_at (assuming it reflects last activity)
      // If updated_at is null (legacy data), maybe check created_at or assume stagnant
      const lastActive = a.updated_at ? dayjs(a.updated_at) : (a.created_at ? dayjs(a.created_at) : now);
      
      return lastActive.isBefore(thresholdDate);
    });

    const totalValue = candidates.reduce((sum, a) => sum + (a.purchase_price || 0), 0);
    return { candidates, totalCount: candidates.length, totalValue };
  }, [assets, stagnantDays]);

  // --- Export ---
  const handleExport = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      message.warning('暂无数据可导出');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${filename}_${dayjs().format('YYYYMMDD')}.xlsx`);
  };

  // --- ECharts Options ---
  const colors = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

  const pieOption = useMemo(() => ({
    color: colors,
    tooltip: { trigger: 'item', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: 12, textStyle: { color: '#333' } },
    legend: { bottom: '0%', left: 'center', icon: 'circle' },
    series: [{
      name: '资产分类',
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, position: 'outside', formatter: '{b}: {c} ({d}%)' },
      emphasis: { label: { show: true, fontSize: 18, fontWeight: 'bold', color: '#333' } },
      labelLine: { show: true },
      data: Object.entries(overviewStats.categoryData).map(([name, value]) => ({ name, value }))
    }]
  }), [overviewStats]);

  const barOption = useMemo(() => ({
    color: ['#6366f1'],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: [{ type: 'category', data: Object.keys(lifespanStats.buckets), axisLine: { show: false }, axisTick: { show: false } }],
    yAxis: [{ type: 'value', splitLine: { lineStyle: { type: 'dashed', color: '#eee' } } }],
    series: [{ 
      name: '设备数量', 
      type: 'bar', 
      barWidth: '40%', 
      data: Object.values(lifespanStats.buckets),
      itemStyle: { borderRadius: [6, 6, 0, 0] },
      showBackground: true,
      backgroundStyle: { color: 'rgba(180, 180, 180, 0.1)' }
    }]
  }), [lifespanStats]);

  const orderOptions = useMemo(() => {
    const orders = Array.from(new Set(assets.map(a => a.purchase_order).filter(Boolean)));
    return orders.map(order => {
      const asset = assets.find(a => a.purchase_order === order);
      const projectName = asset?.project_name;
      return {
        value: order,
        label: (
          <div className="flex items-center justify-between w-full min-w-[200px]">
            <span className="font-medium text-gray-700">{order}</span>
            {projectName && (
              <span className="text-gray-400 text-xs ml-4 truncate max-w-[140px]" title={projectName}>
                {projectName}
              </span>
            )}
          </div>
        )
      };
    });
  }, [assets]);

  const getStatusBadge = (status: string) => {
    const isStock = status === 'in_stock';
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${
        isStock ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
      }`}>
        {isStock ? '在库' : '在用'}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 m-0 tracking-tight">
            资产数据仪表盘
          </h1>
          <p className="text-gray-500 mt-1 text-sm">实时监控 · 智能分析 · 决策支持</p>
        </div>
        <Space size="middle">
          <Button type="default" icon={<SyncOutlined spin={loading} />} onClick={fetchData} className="rounded-full px-6 border-indigo-100 text-indigo-600 hover:text-indigo-700 hover:border-indigo-300">
            刷新
          </Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={() => handleExport(assets, '全量资产数据')} className="rounded-full px-6 bg-gradient-to-r from-blue-600 to-indigo-600 border-none shadow-lg shadow-indigo-200 hover:shadow-indigo-300">
            导出全量报表
          </Button>
        </Space>
      </div>

      <Spin spinning={loading} size="large" tip="正在加载数据...">
        {/* Row 1: KPI Cards */}
        <Row gutter={[24, 24]} className="mb-8">
          <Col xs={24} sm={12} lg={6}>
            <StatCard 
              title="资产总数" 
              value={overviewStats.totalCount} 
              suffix="件" 
              color="blue" 
              prefix={<ShoppingOutlined className="text-xl" />}
              trend="up"
              subtext="较上月增长 12%"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard 
              title="资产总值" 
              value={overviewStats.totalValue} 
              prefix={<DollarOutlined className="text-xl" />} 
              color="purple" 
              trend="up"
              subtext="累计投入成本"
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard 
              title="在用资产" 
              value={overviewStats.inUseCount} 
              suffix="件" 
              color="green" 
              prefix={<SafetyCertificateOutlined className="text-xl" />}
              subtext={`利用率 ${((overviewStats.inUseCount / (overviewStats.totalCount || 1)) * 100).toFixed(1)}%`}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard 
              title="待报废/超期" 
              value={scrapStats.candidates.length} 
              suffix="件" 
              color="orange" 
              prefix={<AlertOutlined className="text-xl" />}
              subtext="建议尽快处置"
              trend="down"
            />
          </Col>
        </Row>

        {/* Row 2: Charts Area */}
        <Row gutter={[24, 24]} className="mb-8">
          <Col xs={24} lg={14}>
             <GlassCard title="资产分布概览" icon={<PieChartOutlined />} className="h-full">
               <div className="flex items-center justify-center h-full min-h-[280px]">
                 <ReactECharts option={pieOption} style={{ height: '300px', width: '100%' }} />
               </div>
             </GlassCard>
          </Col>
          <Col xs={24} lg={10}>
             <GlassCard title="设备寿命健康度" icon={<BarChartOutlined />} className="h-full">
               <ReactECharts option={barOption} style={{ height: '220px' }} />
               <div className="mt-4 bg-orange-50 rounded-xl p-4 border border-orange-100 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-orange-100 text-orange-600 rounded-full">
                     <AlertOutlined />
                   </div>
                   <div>
                     <div className="text-orange-900 font-bold">健康预警</div>
                     <div className="text-orange-700/70 text-xs">发现 {lifespanStats.warningAssets.length} 台设备已超期</div>
                   </div>
                 </div>
                 <Button size="small" type="primary" ghost danger onClick={() => handleExport(lifespanStats.warningAssets, '超期设备明细')}>
                   查看详情
                 </Button>
               </div>
             </GlassCard>
          </Col>
        </Row>

        {/* Row 3: Detail Analysis */}
        <Row gutter={[24, 24]} className="mb-8">
          <Col xs={24} lg={12}>
            <GlassCard 
              title="特定品类深度分析" 
              icon={<DashboardOutlined />} 
              extra={
                <Select 
                  value={selectedCategory} 
                  onChange={setSelectedCategory} 
                  bordered={false}
                  className="bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors min-w-[140px]"
                  options={categories.map(c => ({ label: c.name, value: c.name }))}
                />
              }
            >
              {categoryStats && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                      <div className="text-indigo-600/70 text-xs font-bold uppercase mb-1">该品类资产总额</div>
                      <div className="text-2xl font-extrabold text-indigo-900">¥ {categoryStats.totalValue.toLocaleString()}</div>
                    </div>
                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                      <div className="text-emerald-600/70 text-xs font-bold uppercase mb-1">设备总数量</div>
                      <div className="text-2xl font-extrabold text-emerald-900">{categoryStats.totalCount} <span className="text-sm font-normal text-emerald-600">台</span></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-gray-700">资产明细列表</h4>
                      <Button type="link" size="small" onClick={() => handleExport(categoryStats.filtered, `${selectedCategory}_清单`)}>导出列表</Button>
                    </div>
                    <Table 
                      dataSource={categoryStats.filtered.slice(0, 5)} 
                      rowKey="id"
                      pagination={false}
                      size="small"
                      className="no-border-table"
                      columns={[
                        { title: '资产编号', dataIndex: 'asset_code', render: t => <span className="font-mono text-gray-500 text-xs">{t}</span> },
                        { title: '名称', dataIndex: 'name', render: t => <span className="font-medium text-gray-800 text-sm">{t}</span> },
                        { title: '状态', dataIndex: 'status', align: 'right', render: (t) => getStatusBadge(t) },
                      ]}
                    />
                  </div>
                </div>
              )}
            </GlassCard>
          </Col>

          <Col xs={24} lg={12}>
            <GlassCard 
              title="订单资产追踪" 
              icon={<FileTextOutlined />} 
              className="h-full"
              extra={
                <Select 
                  value={selectedOrder} 
                  onChange={setSelectedOrder} 
                  bordered={false}
                  className="bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors min-w-[160px]"
                  placeholder="选择订单"
                  dropdownMatchSelectWidth={false}
                  optionLabelProp="value"
                  options={orderOptions}
                />
              }
            >
               {orderStats ? (
                 <div className="space-y-6">
                   <div className="bg-gray-50 p-5 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-4 divide-x divide-gray-200/60">
                      <div className="text-center px-2">
                        <div className="text-xs text-gray-500 mb-1">订单总金额</div>
                        <div className="text-lg font-bold text-indigo-600">¥ {orderStats.totalAmount.toLocaleString()}</div>
                      </div>
                      <div className="text-center px-2">
                        <div className="text-xs text-gray-500 mb-1">设备总数量</div>
                        <div className="text-lg font-bold text-gray-800">{orderStats.totalCount}</div>
                      </div>
                      <div className="text-center px-2">
                        <div className="text-xs text-gray-500 mb-1">已发放</div>
                        <div className="text-lg font-bold text-emerald-600">{orderStats.issued}</div>
                      </div>
                      <div className="text-center px-2">
                        <div className="text-xs text-gray-500 mb-1">未发放</div>
                        <div className="text-lg font-bold text-amber-600">{orderStats.inStock}</div>
                      </div>
                   </div>

                   <Table 
                      dataSource={orderStats.filtered} 
                      rowKey="id"
                      pagination={{ pageSize: 5, size: 'small', hideOnSinglePage: true }}
                      size="small"
                      columns={[
                        { title: '资产名称', dataIndex: 'name', render: t => <span className="font-medium text-gray-800 text-sm">{t}</span> },
                        { title: '资产状态', dataIndex: 'status', render: (t) => getStatusBadge(t) },
                        { title: '使用人', dataIndex: 'employee_name', render: t => t ? <span className="text-gray-500 text-sm"><UserOutlined className="mr-1"/>{t}</span> : <span className="text-gray-300">-</span> },
                      ]}
                    />
                 </div>
               ) : <Empty description="请选择订单查看详情" className="my-10" />}
            </GlassCard>
          </Col>
        </Row>

        {/* Row 4: Operations */}
        <Row gutter={[24, 24]}>
          <Col span={24}>
            <GlassCard 
              title="最近资产流转动态" 
              icon={<ThunderboltOutlined />}
              extra={
                <Space size="small">
                  <Button 
                    icon={<DownloadOutlined />} 
                    onClick={() => handleExport(flows, '资产流转记录')}
                    className="flex items-center rounded-full px-4 text-indigo-600 bg-white border border-indigo-100 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 shadow-sm transition-all duration-300"
                  >
                    导出
                  </Button>
                  <Radio.Group value={flowTimeRange} onChange={e => setFlowTimeRange(e.target.value)} buttonStyle="solid">
                    <Radio.Button value="week">近一周</Radio.Button>
                    <Radio.Button value="month">近一月</Radio.Button>
                    <Radio.Button value="all">全部</Radio.Button>
                    <Radio.Button value="custom">自定义</Radio.Button>
                  </Radio.Group>
                  {flowTimeRange === 'custom' && (
                    <RangePicker 
                      onChange={(dates) => setCustomDateRange(dates)} 
                      style={{ width: 240 }}
                    />
                  )}
                </Space>
              }
            >
              <Table 
                dataSource={flows}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                className="custom-table"
                columns={[
                  { 
                    title: '时间', 
                    dataIndex: 'operation_time', 
                    width: 180,
                    render: t => <span className="text-gray-500">{dayjs(t).format('YYYY-MM-DD HH:mm')}</span> 
                  },
                  { 
                    title: '资产信息', 
                    dataIndex: ['asset', 'name'],
                    render: (t, r) => (
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-800">{t}</span>
                        <span className="text-xs text-gray-400 font-mono">{r.asset?.asset_code}</span>
                      </div>
                    )
                  },
                  { 
                    title: '操作类型', 
                    dataIndex: 'operation_type',
                    render: (t) => {
                        const colors: any = {
                            requisition: 'green',
                            borrow: 'blue',
                            return: 'cyan',
                            transfer: 'orange',
                            scrap: 'red',
                            dispose: 'purple',
                            inbound: 'gold'
                        };
                        return <Tag color={colors[t]}>{getOperationLabel(t)}</Tag>;
                    }
                  },
                  { 
                    title: '接收人', 
                    dataIndex: 'target_employee_name',
                    render: (t) => (
                      <div className="flex items-center gap-2">
                        <UserOutlined className="text-gray-400" />
                        <span className="font-medium text-gray-700">{t || '-'}</span>
                      </div>
                    )
                  },
                  { 
                    title: '流转详情', 
                    key: 'flow',
                    render: (_, r) => (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{r.operator || '系统'}</span>
                        <ArrowRightOutlined className="text-gray-300" />
                        <span>{r.target_employee_name || '库房'}</span>
                      </div>
                    )
                  },
                ]}
              />
            </GlassCard>
          </Col>
        </Row>

        {/* Row 5: Stagnant Inventory */}
        <Row gutter={[24, 24]} className="mb-8">
          <Col span={24}>
            <StagnantInventory />
          </Col>
        </Row>

      </Spin>
      
      {/* Global Styles for Table Overrides */}
      <style>{`
        .ant-table-wrapper .ant-table-thead > tr > th {
          background: transparent !important;
          color: #6b7280;
          font-weight: 600;
          border-bottom: 1px solid #f3f4f6;
        }
        .ant-table-wrapper .ant-table-tbody > tr > td {
          border-bottom: 1px solid #f9fafb;
        }
        .ant-table-wrapper .ant-table-tbody > tr:hover > td {
          background: #f8fafc !important;
        }
        .no-border-table .ant-table-thead > tr > th,
        .no-border-table .ant-table-tbody > tr > td {
          border-bottom: none !important;
        }
      `}</style>

      {/* Stagnant Inventory Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <HistoryOutlined className="text-orange-500" />
            <span>呆滞库存清单 (超 {stagnantDays} 天无异动)</span>
          </div>
        }
        open={isStagnantModalOpen}
        onCancel={() => setIsStagnantModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsStagnantModalOpen(false)}>关闭</Button>,
          <Button 
            key="export" 
            type="primary" 
            icon={<DownloadOutlined />} 
            onClick={() => handleExport(stagnantStats.candidates, `呆滞库存_${stagnantDays}天以上`)}
          >
            导出清单
          </Button>
        ]}
        width={800}
      >
        <div className="mb-4 bg-orange-50 p-3 rounded border border-orange-100 text-orange-800 text-sm">
           共有 <b>{stagnantStats.totalCount}</b> 台设备在过去 {stagnantDays} 天内没有发生过任何业务流转或信息更新，总价值 <b>¥{stagnantStats.totalValue.toLocaleString()}</b>。
        </div>
        <Table
          dataSource={stagnantStats.candidates}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
          columns={[
            { title: '资产编号', dataIndex: 'asset_code', width: 120 },
            { title: '名称', dataIndex: 'name', width: 150 },
            { title: '品牌/型号', render: (_, r) => <span className="text-gray-500">{r.brand} {r.model}</span> },
            { title: '当前状态', dataIndex: 'status', width: 80, render: t => <Tag color="blue">在库</Tag> },
            { 
              title: '最后更新时间', 
              dataIndex: 'updated_at', 
              width: 150,
              render: t => t ? dayjs(t).format('YYYY-MM-DD') : '-' 
            }
          ]}
        />
      </Modal>
    </div>
  );
};

export default Dashboard;
