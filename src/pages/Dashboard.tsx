import React, { useEffect, useState, useMemo } from 'react';
import { 
  Row, Col, Statistic, Button, Spin, Select, Table, Tag, 
  message, Space, Divider, Tooltip, Empty, Progress, Avatar, Radio, DatePicker,
  InputNumber, Modal, Input
} from 'antd';
import { 
  SearchOutlined,
  FilterOutlined,
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

interface DistributionNode {
  key: string;
  name: string;
  type: 'category' | 'brand' | 'model';
  count: number;
  totalValue: number;
  inUseCount: number;
  children?: DistributionNode[];
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

  // Drill Down State
  const [drillDownCategory, setDrillDownCategory] = useState<string | null>(null);
  const [drillDownType, setDrillDownType] = useState<'brand' | 'model'>('brand');
  const [expandedTreeKeys, setExpandedTreeKeys] = useState<string[]>([]);
  
  // Detail Modal State
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedSlice, setSelectedSlice] = useState<{ name: string, type: 'brand' | 'model' } | null>(null);
  const [detailSearchText, setDetailSearchText] = useState('');
  const [detailStatusFilter, setDetailStatusFilter] = useState<string | null>(null);

  // Stagnant Inventory State removed as it is now a separate component

  useEffect(() => {
    fetchData();
  }, [flowTimeRange, customDateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Assets first (Lightweight query)
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select('id, status, purchase_price, purchase_date, purchase_order, project_name, name, asset_code, employee_name, updated_at, brand, model, serial_number, department_name, arrival_date, category:categories(name)');
      
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

  // Drill Down Stats: Group by Brand or Model for selected category
  const drillDownStats = useMemo(() => {
    if (!drillDownCategory) return null;

    const filtered = assets.filter(a => (a.category?.name || '其他') === drillDownCategory);
    
    // Group by Brand
    const brandData = filtered.reduce((acc, asset: any) => {
      const brandName = asset.brand || '未知品牌';
      if (!acc[brandName]) acc[brandName] = 0;
      acc[brandName] += 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by Model
    const modelData = filtered.reduce((acc, asset: any) => {
      const modelName = asset.model || '未知型号';
      if (!acc[modelName]) acc[modelName] = 0;
      acc[modelName] += 1;
      return acc;
    }, {} as Record<string, number>);

    return { brandData, modelData, totalCount: filtered.length };
  }, [assets, drillDownCategory]);

  // Hierarchical Data for Tree Table
  const distributionTreeData = useMemo(() => {
    const tree: DistributionNode[] = [];
    const categoryMap = new Map<string, DistributionNode>();

    assets.forEach(asset => {
      const catName = asset.category?.name || '其他';
      const brandName = asset.brand || '未知品牌';
      const modelName = asset.model || '未知型号';
      const price = asset.purchase_price || 0;
      const isInUse = asset.status === 'in_use';

      // 1. Category Level
      let catNode = categoryMap.get(catName);
      if (!catNode) {
        catNode = {
          key: `cat_${catName}`,
          name: catName,
          type: 'category',
          count: 0,
          totalValue: 0,
          inUseCount: 0,
          children: []
        };
        categoryMap.set(catName, catNode);
        tree.push(catNode);
      }
      catNode.count++;
      catNode.totalValue += price;
      if (isInUse) catNode.inUseCount++;

      // 2. Second Level (Brand or Model based on drillDownType)
      // Note: We need to support dynamic switching. 
      // Instead of hardcoding Brand -> Model hierarchy, we construct the tree based on current `drillDownType`.
      // BUT `distributionTreeData` should probably be stable or re-compute when type changes.
      // Let's make the second level dynamic.
      
      const secondLevelName = drillDownType === 'brand' ? brandName : modelName;
      const secondLevelType = drillDownType === 'brand' ? 'brand' : 'model';
      const secondLevelKey = `${drillDownType}_${catName}_${secondLevelName}`;

      let secondNode = catNode.children?.find(c => c.name === secondLevelName);
      if (!secondNode) {
        secondNode = {
          key: secondLevelKey,
          name: secondLevelName,
          type: secondLevelType,
          count: 0,
          totalValue: 0,
          inUseCount: 0,
          children: []
        };
        catNode.children?.push(secondNode);
      }
      secondNode.count++;
      secondNode.totalValue += price;
      if (isInUse) secondNode.inUseCount++;

      // 3. Third Level (The other one)
      const thirdLevelName = drillDownType === 'brand' ? modelName : brandName;
      const thirdLevelType = drillDownType === 'brand' ? 'model' : 'brand';
      const thirdLevelKey = `${thirdLevelType}_${catName}_${secondLevelName}_${thirdLevelName}`;

      let thirdNode = secondNode.children?.find(c => c.name === thirdLevelName);
      if (!thirdNode) {
        thirdNode = {
          key: thirdLevelKey,
          name: thirdLevelName,
          type: thirdLevelType,
          count: 0,
          totalValue: 0,
          inUseCount: 0
        };
        secondNode.children?.push(thirdNode);
      }
      thirdNode.count++;
      thirdNode.totalValue += price;
      if (isInUse) thirdNode.inUseCount++;
    });

    return tree;
  }, [assets, drillDownType]); // Re-compute when drillDownType changes

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

  const pieOption = useMemo(() => {
    // If drilling down, show brand or model distribution based on selection
    if (drillDownCategory && drillDownStats) {
      const dataMap = drillDownType === 'brand' ? drillDownStats.brandData : drillDownStats.modelData;
      const typeLabel = drillDownType === 'brand' ? '品牌' : '型号';

      return {
        color: colors,
        tooltip: { trigger: 'item', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: 12, textStyle: { color: '#333' } },
        legend: { bottom: '0%', left: 'center', icon: 'circle' },
        series: [{
          name: `${drillDownCategory} - ${typeLabel}分布`,
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
          label: { show: true, position: 'outside', formatter: '{b}: {c} ({d}%)' },
          emphasis: { label: { show: true, fontSize: 18, fontWeight: 'bold', color: '#333' } },
          labelLine: { show: true },
          data: Object.entries(dataMap).map(([name, value]) => ({ name, value }))
        }]
      };
    }

    // Default: Category distribution
    return {
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
    };
  }, [overviewStats, drillDownCategory, drillDownStats]);

  const onPieClick = (e: any) => {
    // If currently at top level, drill down to Category -> Brand (default)
    if (!drillDownCategory) {
      setDrillDownCategory(e.name);
      setDrillDownType('brand'); // Default to brand
      setExpandedTreeKeys([`cat_${e.name}`]); // Auto expand the selected category
    } else {
      // If already drilled down, show detail modal for the selected slice
      setSelectedSlice({
        name: e.name,
        type: drillDownType
      });
      setDetailModalVisible(true);
      setDetailSearchText('');
      setDetailStatusFilter(null);
    }
  };

  const getFilteredDetailList = () => {
    if (!selectedSlice || !drillDownCategory) return [];

    return assets.filter(asset => {
      // 1. Filter by Category
      const assetCategory = asset.category?.name || '其他';
      if (assetCategory !== drillDownCategory) return false;

      // 2. Filter by Brand/Model (Slice)
      const assetSliceValue = selectedSlice.type === 'brand' 
        ? (asset.brand || '未知品牌') 
        : (asset.model || '未知型号');
      if (assetSliceValue !== selectedSlice.name) return false;

      // 3. Search Filter
      if (detailSearchText) {
        const searchLower = detailSearchText.toLowerCase();
        const matchesCode = asset.asset_code?.toLowerCase().includes(searchLower);
        const matchesSerial = asset.serial_number?.toLowerCase().includes(searchLower);
        if (!matchesCode && !matchesSerial) return false;
      }

      // 4. Status Filter
      if (detailStatusFilter) {
        if (asset.status !== detailStatusFilter) return false;
      }

      return true;
    });
  };

  const filteredTreeData = useMemo(() => {
    if (!drillDownCategory) return distributionTreeData;
    
    // Find the node corresponding to the selected category
    const catNode = distributionTreeData.find(node => node.name === drillDownCategory);
    if (!catNode) return [];

    // Return the category node (it will be expanded by expandedRowKeys)
    return [catNode];
  }, [distributionTreeData, drillDownCategory]);

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

        {/* Row 2: Charts Area (Full Width Distribution & Analysis) */}
        <Row gutter={[24, 24]} className="mb-8">
          <Col span={24}>
             <GlassCard 
               title={
                 <div className="flex items-center gap-4">
                    <span>{drillDownCategory ? `${drillDownCategory} 分布详情` : "资产分布概览 & 深度统计"}</span>
                    {drillDownCategory && (
                      <Radio.Group 
                        value={drillDownType} 
                        onChange={e => setDrillDownType(e.target.value)}
                        size="small"
                        buttonStyle="solid"
                      >
                        <Radio.Button value="brand">按品牌</Radio.Button>
                        <Radio.Button value="model">按型号</Radio.Button>
                      </Radio.Group>
                    )}
                 </div>
               }
               icon={<PieChartOutlined />} 
               className="h-full"
               extra={
                  drillDownCategory && (
                    <Button 
                      size="small" 
                      onClick={() => setDrillDownCategory(null)}
                      icon={<HistoryOutlined />}
                    >
                      返回全部分类
                    </Button>
                  )
               }
             >
               <Row gutter={[24, 24]}>
                 <Col xs={24} lg={10} xl={8}>
                   <div className="flex flex-col h-full min-h-[400px]">
                      <div className="flex-1 flex items-center justify-center relative">
                        {/* Center Text for Total if needed, or just Legend */}
                        <ReactECharts 
                            option={pieOption} 
                            style={{ height: '360px', width: '100%', cursor: 'pointer' }} 
                            onEvents={{
                              'click': onPieClick
                            }}
                        />
                      </div>
                      <div className="text-center mt-2">
                        <div className={`text-sm font-medium ${drillDownCategory ? 'text-indigo-600' : 'text-gray-500'}`}>
                           {drillDownCategory ? '👆 点击扇区查看资产清单' : '👆 点击扇区钻取至详细分类'}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">图表与右侧表格联动交互</div>
                      </div>
                   </div>
                 </Col>
                 <Col xs={24} lg={14} xl={16}>
                   <div className="h-full border-l border-gray-100 pl-6">
                      <div className="mb-4 flex justify-between items-center">
                         <h4 className="font-bold text-gray-700 m-0">多维资产统计报表</h4>
                         <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
                            分类 &gt; {drillDownType === 'brand' ? '品牌' : '型号'} &gt; {drillDownType === 'brand' ? '型号' : '品牌'}
                         </span>
                       </div>
                      <Table
                        columns={[
                          { 
                            title: '名称', 
                            dataIndex: 'name', 
                            key: 'name',
                            width: '30%',
                            render: (text, record) => (
                              <span className={`
                                ${record.type === 'category' ? 'font-bold text-gray-800' : ''}
                                ${record.type === 'brand' ? 'font-medium text-gray-600' : ''}
                                ${record.type === 'model' ? 'text-gray-500 text-sm' : ''}
                              `}>
                                {text}
                              </span>
                            )
                          },
                          { 
                            title: '数量', 
                            dataIndex: 'count', 
                            key: 'count', 
                            align: 'right',
                            width: '15%',
                            sorter: (a, b) => a.count - b.count,
                            render: (v) => <span className="font-medium">{v}</span>
                          },
                          { 
                            title: '总价值', 
                            dataIndex: 'totalValue', 
                            key: 'totalValue', 
                            align: 'right',
                            width: '25%',
                            sorter: (a, b) => a.totalValue - b.totalValue,
                            render: (v) => <span className="font-mono">¥ {v.toLocaleString()}</span>
                          },
                          { 
                            title: '利用率', 
                            key: 'utilization',
                            width: '30%',
                            render: (_, record) => {
                              const percent = record.count > 0 ? (record.inUseCount / record.count) * 100 : 0;
                              return (
                                <div className="w-full flex items-center gap-2">
                                  <Progress 
                                    percent={parseFloat(percent.toFixed(1))} 
                                    size="small" 
                                    strokeColor={percent > 80 ? '#10b981' : percent > 50 ? '#3b82f6' : '#f59e0b'}
                                    trailColor="#f3f4f6"
                                  />
                                </div>
                              );
                            }
                          },
                        ]}
                        dataSource={filteredTreeData}
                        pagination={false}
                        size="small"
                        scroll={{ y: 400 }}
                        className="custom-tree-table"
                        expandable={{
                          expandedRowKeys: expandedTreeKeys,
                          onExpandedRowsChange: (keys) => setExpandedTreeKeys(keys as string[])
                        }}
                      />
                   </div>
                 </Col>
               </Row>
             </GlassCard>
          </Col>
        </Row>
        
        {/* Row 3: Lifespan & Detail Analysis */}
        <Row gutter={[24, 24]} className="mb-8">
          <Col xs={24} lg={12}>
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
                  popupMatchSelectWidth={false}
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

      </Spin>

      {/* Row 5: Stagnant Inventory */}
      <Row gutter={[24, 24]} className="mt-12 mb-12">
        <Col span={24}>
          <StagnantInventory />
        </Col>
      </Row>

      {/* Detail Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <span className="text-gray-500">{drillDownCategory}</span>
            <span className="text-gray-300">/</span>
            <span className="font-bold">{selectedSlice?.name}</span>
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 ml-2">
               {selectedSlice?.type === 'brand' ? '品牌' : '型号'}
            </span>
          </div>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={1000}
        footer={null}
      >
        <div className="mb-4 flex justify-between items-center flex-wrap gap-4">
          <Space>
            <Input 
              prefix={<SearchOutlined className="text-gray-400" />}
              placeholder="搜索资产编号/序列号" 
              value={detailSearchText}
              onChange={e => setDetailSearchText(e.target.value)}
              style={{ width: 240 }}
              allowClear
            />
            <Select
              placeholder="资产状态"
              allowClear
              style={{ width: 140 }}
              value={detailStatusFilter}
              onChange={setDetailStatusFilter}
              options={[
                { label: '在库', value: 'in_stock' },
                { label: '在用', value: 'in_use' },
                { label: '维修中', value: 'maintenance' },
                { label: '已处置', value: 'disposed' },
                { label: '已报废', value: 'scrapped' },
              ]}
            />
          </Space>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={() => handleExport(getFilteredDetailList(), `${drillDownCategory}_${selectedSlice?.name}_资产清单`)}
          >
            导出列表
          </Button>
        </div>

        <Table
          dataSource={getFilteredDetailList()}
          rowKey="id"
          size="middle"
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
          columns={[
            { title: '资产编号', dataIndex: 'asset_code', width: 120, render: t => <span className="font-mono">{t}</span> },
            { title: '序列号', dataIndex: 'serial_number', width: 120, render: t => t || '-' },
            { title: '设备名称', dataIndex: 'name', width: 150 },
            { title: '型号', dataIndex: 'model', width: 120, render: t => t || '-' },
            { title: '状态', dataIndex: 'status', width: 100, render: t => getStatusBadge(t) },
            { title: '所属部门', dataIndex: 'department_name', width: 140, render: t => t || '-' },
            { 
              title: '入库时间', 
              dataIndex: 'arrival_date', // Or created_at if arrival_date is often null
              width: 120,
              sorter: (a, b) => dayjs(a.arrival_date || a.created_at).unix() - dayjs(b.arrival_date || b.created_at).unix(),
              render: (t, r) => t ? dayjs(t).format('YYYY-MM-DD') : (r.created_at ? dayjs(r.created_at).format('YYYY-MM-DD') : '-') 
            },
          ]}
        />
      </Modal>

      {/* Row 4: Operations */}
      <Spin spinning={loading} tip="加载流转记录...">
        <Row gutter={[24, 24]} className="mb-8">
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
    </div>
  );
};

export default Dashboard;
