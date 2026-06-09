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
  HistoryOutlined,
  FullscreenOutlined,
  ReloadOutlined,
  ExportOutlined,
  TableOutlined,
  ProjectOutlined
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
  type: 'category' | 'brand' | 'model' | 'equipment_type';
  count: number;
  totalValue: number;
  inUseCount: number;
  inStockCount: number;
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
  const [drillDownType, setDrillDownType] = useState<'brand' | 'model' | 'equipment_type'>('brand');
  const [expandedTreeKeys, setExpandedTreeKeys] = useState<string[]>([]);
  
  // Detail Modal State
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedSlice, setSelectedSlice] = useState<{ name: string, type: 'brand' | 'model' | 'equipment_type' } | null>(null);
  const [detailFilters, setDetailFilters] = useState({
    keyword: '',
    status: [] as string[],
    dateRange: null as any
  });

  // Usage Status Analysis State
  const [usageDimension, setUsageDimension] = useState<'status' | 'department' | 'category' | 'age'>('status');
  const [selectedUsageSlice, setSelectedUsageSlice] = useState<string | null>(null);

  // --- Usage Duration Stats ---
  const [durationDimension, setDurationDimension] = useState<'category' | 'brand' | 'model' | 'equipment_type'>('category');

  // --- Order Assets Full View & Filter ---
  const [viewAllModalVisible, setViewAllModalVisible] = useState(false);
  const [orderAssetFilters, setOrderAssetFilters] = useState({
    keyword: '',
    status: [] as string[],
    type: [] as string[],
    dateRange: null as any
  });

  useEffect(() => {
    fetchData();
  }, [flowTimeRange, customDateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Assets first (Lightweight query)
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select('id, status, purchase_price, purchase_date, purchase_order, project_name, name, asset_code, employee_name, updated_at, brand, model, serial_number, department_name, arrival_date, location, specific_location, category:categories!assets_category_id_fkey(name)');
      
      if (assetsError) throw assetsError;
      
      setAssets((assetsData || []).filter((a: any) => a.status !== 'cleared') as unknown as Asset[]);
      setLoading(false); // Stop loading spinner ASAP to show stats

      // 2. Fetch Categories and Flows in background
      const now = dayjs();
      let start: dayjs.Dayjs | null = null;
      let end: dayjs.Dayjs | null = null;

      if (flowTimeRange === 'week') {
        start = now.subtract(7, 'day');
        end = now;
      } else if (flowTimeRange === 'month') {
        start = now.subtract(1, 'month');
        end = now;
      } else if (flowTimeRange === 'custom' && customDateRange && customDateRange.length === 2) {
        start = customDateRange[0];
        end = customDateRange[1];
      }

      let flowQuery = supabase
        .from('asset_flow_records')
        .select('*, asset:assets!asset_flow_records_asset_id_fkey(asset_code, name, purchase_price)')
        .order('operation_time', { ascending: false })
        .limit(50);
      if (start) flowQuery = flowQuery.gte('operation_time', start.toISOString());
      if (end) flowQuery = flowQuery.lte('operation_time', end.toISOString());

      Promise.all([
        supabase.from('categories').select('*'),
        flowQuery
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
      message.error('数据加载异常: ' + (error.message || '服务连接失败'));
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

    // Group by Equipment Type
    const equipmentTypeData = filtered.reduce((acc, asset: any) => {
      const typeName = asset.equipment_type || '其他';
      if (!acc[typeName]) acc[typeName] = 0;
      acc[typeName] += 1;
      return acc;
    }, {} as Record<string, number>);

    return { brandData, modelData, equipmentTypeData, totalCount: filtered.length };
  }, [assets, drillDownCategory]);

  // Hierarchical Data for Tree Table
  const distributionTreeData = useMemo(() => {
    const tree: DistributionNode[] = [];
    const categoryMap = new Map<string, DistributionNode>();

    assets.forEach(asset => {
      const catName = asset.category?.name || '其他';
      const brandName = asset.brand || '未知品牌';
      const modelName = asset.model || '未知型号';
      const equipmentTypeName = asset.equipment_type || '其他';
      const price = asset.purchase_price || 0;
      const isInUse = asset.status === 'in_use';
      const isInStock = asset.status === 'in_stock';

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
          inStockCount: 0,
          children: []
        };
        categoryMap.set(catName, catNode);
        tree.push(catNode);
      }
      catNode.count++;
      catNode.totalValue += price;
      if (isInUse) catNode.inUseCount++;
      if (isInStock) catNode.inStockCount++;

      // 2. Second Level (Brand, Model, or Equipment Type based on drillDownType)
      let secondLevelName = '';
      let secondLevelType: 'brand' | 'model' | 'equipment_type' = 'brand';
      
      if (drillDownType === 'brand') {
        secondLevelName = brandName;
        secondLevelType = 'brand';
      } else if (drillDownType === 'model') {
        secondLevelName = modelName;
        secondLevelType = 'model';
      } else {
        secondLevelName = equipmentTypeName;
        secondLevelType = 'equipment_type';
      }
      
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
          inStockCount: 0,
          children: []
        };
        catNode.children?.push(secondNode);
      }
      secondNode.count++;
      secondNode.totalValue += price;
      if (isInUse) secondNode.inUseCount++;
      if (isInStock) secondNode.inStockCount++;

      // 3. Third Level (The other one)
      let thirdLevelName = '';
      let thirdLevelType: 'brand' | 'model' | 'equipment_type' = 'model';

      if (drillDownType === 'brand') {
        thirdLevelName = modelName;
        thirdLevelType = 'model';
      } else if (drillDownType === 'model') {
        thirdLevelName = brandName;
        thirdLevelType = 'brand';
      } else {
        // If equipment_type is selected, use Brand as next level
        thirdLevelName = brandName;
        thirdLevelType = 'brand';
      }

      const thirdLevelKey = `${thirdLevelType}_${catName}_${secondLevelName}_${thirdLevelName}`;

      let thirdNode = secondNode.children?.find(c => c.name === thirdLevelName);
      if (!thirdNode) {
        thirdNode = {
          key: thirdLevelKey,
          name: thirdLevelName,
          type: thirdLevelType,
          count: 0,
          totalValue: 0,
          inUseCount: 0,
          inStockCount: 0
        };
        secondNode.children?.push(thirdNode);
      }
      thirdNode.count++;
      thirdNode.totalValue += price;
      if (isInUse) thirdNode.inUseCount++;
      if (isInStock) thirdNode.inStockCount++;
    });

    return tree;
  }, [assets, drillDownType]);

  const usageStatusStats = useMemo(() => {
    const data: Record<string, { count: number, assets: Asset[] }> = {};
    const now = dayjs();

    assets.forEach(asset => {
      let key = '其他';
      
      switch(usageDimension) {
        case 'status':
          if (asset.status === 'in_stock') key = '在库';
          else if (asset.status === 'in_use') key = '在用';
          else if (asset.status === 'maintenance') key = '维修中';
          else if (asset.status === 'scrapped') key = '已报废';
          else if (asset.status === 'disposed') key = '已处置';
          else key = asset.status || '未知';
          break;
        case 'department':
          key = asset.department_name || '未分配部门';
          break;
        case 'category':
          key = asset.category?.name || '其他';
          break;
        case 'age':
          if (!asset.purchase_date) key = '未知';
          else {
            const age = now.diff(dayjs(asset.purchase_date), 'year', true);
            if (age < 1) key = '1年以内';
            else if (age < 3) key = '1-3年';
            else if (age < 5) key = '3-5年';
            else key = '5年以上';
          }
          break;
      }

      if (!data[key]) data[key] = { count: 0, assets: [] };
      data[key].count++;
      data[key].assets.push(asset);
    });

    return data;
  }, [assets, usageDimension]);

  const usagePieOption = useMemo(() => {
    const data = Object.entries(usageStatusStats).map(([name, { count }]) => ({ name, value: count }));
    
    return {
      color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'],
      tooltip: { trigger: 'item' },
      legend: { type: 'scroll', bottom: 0 },
      series: [{
        name: '设备分布',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '45%'],
        itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 },
        label: { show: true, formatter: '{b}: {c}' },
        data
      }]
    };
  }, [usageStatusStats]);

  const filteredUsageList = useMemo(() => {
    if (!selectedUsageSlice) return [];
    return usageStatusStats[selectedUsageSlice]?.assets || [];
  }, [usageStatusStats, selectedUsageSlice]);

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

  const orderStats = useMemo(() => {
    if (!selectedOrder) return null;
    // Sort by updated_at desc by default
    const filtered = assets
      .filter(a => a.purchase_order === selectedOrder)
      .sort((a, b) => dayjs(b.updated_at).unix() - dayjs(a.updated_at).unix());
      
    if (filtered.length === 0) return null;

    const totalAmount = filtered.reduce((sum, a) => sum + (a.purchase_price || 0), 0);
    const issued = filtered.filter(a => a.status === 'in_use').length;
    const inStock = filtered.filter(a => a.status === 'in_stock').length;
    const projectName = filtered[0]?.project_name || '未知项目';

    return { totalCount: filtered.length, totalAmount, issued, inStock, filtered, projectName };
  }, [assets, selectedOrder]);

  const filteredOrderAssets = useMemo(() => {
    if (!orderStats?.filtered) return [];
    
    return orderStats.filtered.filter(asset => {
      // 1. Keyword
      if (orderAssetFilters.keyword) {
        const lower = orderAssetFilters.keyword.toLowerCase();
        const match = (asset.asset_code?.toLowerCase().includes(lower)) || 
                      (asset.name?.toLowerCase().includes(lower)) ||
                      (asset.employee_name?.toLowerCase().includes(lower)) ||
                      (asset.department_name?.toLowerCase().includes(lower));
        if (!match) return false;
      }

      // 2. Status
      if (orderAssetFilters.status.length > 0) {
        if (!orderAssetFilters.status.includes(asset.status || '')) return false;
      }

      // 3. Type (Category)
      if (orderAssetFilters.type.length > 0) {
        if (!orderAssetFilters.type.includes(asset.category?.name || '其他')) return false;
      }

      // 4. Date Range (Arrival Date)
      if (orderAssetFilters.dateRange && orderAssetFilters.dateRange.length === 2) {
        const start = orderAssetFilters.dateRange[0];
        const end = orderAssetFilters.dateRange[1];
        const date = dayjs(asset.arrival_date || asset.created_at);
        if (date.isBefore(start) || date.isAfter(end)) return false;
      }

      return true;
    });
  }, [orderStats, orderAssetFilters]);

  const resetOrderAssetFilters = () => {
    setOrderAssetFilters({
      keyword: '',
      status: [],
      type: [],
      dateRange: null
    });
  };

  // Sync duration dimension with drill down
  useEffect(() => {
    if (!drillDownCategory) {
      setDurationDimension('category');
    } else if (drillDownType === 'brand') {
      setDurationDimension('brand');
    } else if (drillDownType === 'model') {
      setDurationDimension('model');
    } else {
      setDurationDimension('equipment_type');
    }
  }, [drillDownCategory, drillDownType]);

  const durationStats = useMemo(() => {
    // 1. Filter assets based on drill-down context
    let targetAssets = assets;
    if (drillDownCategory) {
      targetAssets = targetAssets.filter(a => (a.category?.name || '其他') === drillDownCategory);
    }

    const now = dayjs();
    const statsMap: Record<string, { count: number, totalMonths: number, ranges: Record<string, number> }> = {};

    targetAssets.forEach(asset => {
      // Determine grouping key
      let key = '其他';
      if (durationDimension === 'category') key = asset.category?.name || '其他';
      else if (durationDimension === 'brand') key = asset.brand || '未知品牌';
      else if (durationDimension === 'model') key = asset.model || '未知型号';
      else if (durationDimension === 'equipment_type') key = asset.equipment_type || '其他';

      // Calculate usage months
      // Priority: use_months field -> diff(now, purchase_date) -> 0
      let months = 0;
      if (asset.purchase_date) {
        months = now.diff(dayjs(asset.purchase_date), 'month');
      }
      if (months < 0) months = 0;

      // Initialize group stats
      if (!statsMap[key]) {
        statsMap[key] = { 
          count: 0, 
          totalMonths: 0, 
          ranges: { '0-1年': 0, '1-3年': 0, '3-5年': 0, '5年以上': 0 } 
        };
      }

      // Update stats
      statsMap[key].count++;
      statsMap[key].totalMonths += months;

      const years = months / 12;
      if (years < 1) statsMap[key].ranges['0-1年']++;
      else if (years < 3) statsMap[key].ranges['1-3年']++;
      else if (years < 5) statsMap[key].ranges['3-5年']++;
      else statsMap[key].ranges['5年以上']++;
    });

    // Transform to array and sort by count desc
    return Object.entries(statsMap)
      .map(([name, stat]) => ({
        name,
        avgYears: stat.count > 0 ? (stat.totalMonths / stat.count / 12).toFixed(1) : '0.0',
        count: stat.count,
        ranges: stat.ranges
      }))
      .sort((a, b) => b.count - a.count);
  }, [assets, durationDimension, drillDownCategory, drillDownType]);

  const durationBarOption = useMemo(() => {
    // Top 10 items to avoid clutter
    const displayData = durationStats.slice(0, 10);
    const categories = displayData.map(d => d.name);
    
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        data: ['0-1年', '1-3年', '3-5年', '5年以上'],
        bottom: 0
      },
      grid: {
        left: '0%',
        right: '4%',
        bottom: '10%',
        top: '2%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: '数量'
      },
      yAxis: {
        type: 'category',
        data: categories,
        inverse: true // Top items at top
      },
      series: [
        {
          name: '0-1年',
          type: 'bar',
          stack: 'total',
          emphasis: { focus: 'series' },
          data: displayData.map(d => d.ranges['0-1年']),
          itemStyle: { color: '#3b82f6' }
        },
        {
          name: '1-3年',
          type: 'bar',
          stack: 'total',
          emphasis: { focus: 'series' },
          data: displayData.map(d => d.ranges['1-3年']),
          itemStyle: { color: '#10b981' }
        },
        {
          name: '3-5年',
          type: 'bar',
          stack: 'total',
          emphasis: { focus: 'series' },
          data: displayData.map(d => d.ranges['3-5年']),
          itemStyle: { color: '#f59e0b' }
        },
        {
          name: '5年以上',
          type: 'bar',
          stack: 'total',
          emphasis: { focus: 'series' },
          data: displayData.map(d => d.ranges['5年以上']),
          itemStyle: { color: '#ef4444' }
        }
      ]
    };
  }, [durationStats]);

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
    // If drilling down, show brand or model or equipment_type distribution based on selection
    if (drillDownCategory && drillDownStats) {
      let dataMap: Record<string, number> = {};
      let typeLabel = '';

      if (drillDownType === 'brand') {
        dataMap = drillDownStats.brandData;
        typeLabel = '品牌';
      } else if (drillDownType === 'model') {
        dataMap = drillDownStats.modelData;
        typeLabel = '型号';
      } else {
        dataMap = drillDownStats.equipmentTypeData;
        typeLabel = '设备分类';
      }

      return {
        color: colors,
        tooltip: { trigger: 'item', backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 8, padding: 12, textStyle: { color: '#333' } },
        legend: { bottom: '0%', left: 'center', icon: 'circle' },
        series: [{
          name: `${drillDownCategory} - ${typeLabel}分布`,
          type: 'pie',
          radius: ['50%', '80%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
          label: { 
            show: true, 
            position: 'outside', 
            formatter: '{b}: {c} ({d}%)',
            minMargin: 5,
            edgeDistance: 10,
            lineHeight: 15,
          },
          emphasis: { 
            scale: true,
            scaleSize: 10,
            label: { show: true, fontSize: 18, fontWeight: 'bold', color: '#333' } 
          },
          labelLine: { show: true, length: 15, length2: 0, maxSurfaceAngle: 80 },
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
        radius: ['50%', '80%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
        label: { 
          show: true, 
          position: 'outside', 
          formatter: '{b}: {c} ({d}%)',
          minMargin: 5,
          edgeDistance: 10,
          lineHeight: 15
        },
        emphasis: { 
          scale: true,
          scaleSize: 10,
          label: { show: true, fontSize: 18, fontWeight: 'bold', color: '#333' } 
        },
        labelLine: { show: true, length: 15, length2: 0, maxSurfaceAngle: 80 },
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
      setDetailFilters({
        keyword: '',
        status: [],
        dateRange: null
      });
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

      // 3. Keyword Search
      if (detailFilters.keyword) {
        const lower = detailFilters.keyword.toLowerCase();
        const matchesCode = asset.asset_code?.toLowerCase().includes(lower);
        const matchesSerial = asset.serial_number?.toLowerCase().includes(lower);
        const matchesName = asset.name?.toLowerCase().includes(lower);
        const matchesEmp = asset.employee_name?.toLowerCase().includes(lower);
        if (!matchesCode && !matchesSerial && !matchesName && !matchesEmp) return false;
      }

      // 4. Status Filter
      if (detailFilters.status.length > 0) {
        if (!detailFilters.status.includes(asset.status || '')) return false;
      }

      // 5. Date Range
      if (detailFilters.dateRange && detailFilters.dateRange.length === 2) {
        const start = detailFilters.dateRange[0];
        const end = detailFilters.dateRange[1];
        const date = dayjs(asset.arrival_date || asset.created_at);
        if (date.isBefore(start) || date.isAfter(end)) return false;
      }

      return true;
    });
  };

  const resetDetailFilters = () => {
    setDetailFilters({
      keyword: '',
      status: [],
      dateRange: null
    });
  };

  const filteredTreeData = useMemo(() => {
    if (!drillDownCategory) {
      // Return shallow copies of top-level nodes without children to prevent expansion
      return distributionTreeData.map(node => ({
        ...node,
        children: undefined
      }));
    }
    
    // Find the node corresponding to the selected category
    const catNode = distributionTreeData.find(node => node.name === drillDownCategory);
    if (!catNode) return [];

    // Return the category node (it will be expanded by expandedRowKeys)
    return [catNode];
  }, [distributionTreeData, drillDownCategory]);

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
               title="资产分布概览 & 深度统计"
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
                 <Col xs={24} lg={14}>
                   <div className="h-full border-r border-gray-100 pr-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                           <PieChartOutlined className="text-indigo-500" />
                           <span className="font-bold text-gray-700">
                             {drillDownCategory ? `${drillDownCategory} 分布详情` : "资产品类分布"}
                           </span>
                           <span className="ml-3 px-3 py-1 bg-indigo-50 text-indigo-600 text-xs rounded-full border border-indigo-100 font-medium shadow-sm flex items-center gap-1">
                              <span className="animate-bounce">👇</span>
                              {drillDownCategory 
                                ? '点击扇区查看清单' 
                                : '点击扇区可下钻查看详情'}
                           </span>
                        </div>
                        {drillDownCategory && (
                          <Radio.Group 
                            value={drillDownType} 
                            onChange={e => setDrillDownType(e.target.value)}
                            size="small"
                            buttonStyle="solid"
                          >
                            <Radio.Button value="brand">按品牌</Radio.Button>
                            <Radio.Button value="model">按型号</Radio.Button>
                            <Radio.Button value="equipment_type">按设备分类</Radio.Button>
                          </Radio.Group>
                        )}
                      </div>

                      <div className="w-full relative">
                        <ReactECharts 
                            option={pieOption} 
                            style={{ height: '370px', width: '100%', cursor: 'pointer' }} 
                            onEvents={{
                              'click': onPieClick
                            }}
                        />
                      </div>
                   </div>
                 </Col>

                 <Col xs={24} lg={10}>
                    <div className="h-full pl-2">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                           <HistoryOutlined className="text-indigo-500" />
                           <span className="font-bold text-gray-700">资产使用年限分布</span>
                        </div>
                        <Radio.Group 
                          value={durationDimension} 
                          onChange={e => setDurationDimension(e.target.value)}
                          size="small"
                          buttonStyle="solid"
                          disabled={!!drillDownCategory}
                        >
                          <Radio.Button value="category">品类</Radio.Button>
                          <Radio.Button value="brand">品牌</Radio.Button>
                          <Radio.Button value="model">型号</Radio.Button>
                          <Radio.Button value="equipment_type">设备分类</Radio.Button>
                        </Radio.Group>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-2 mb-1 flex justify-between items-center text-xs text-gray-500">
                         <span>当前统计范围：<span className="font-bold text-gray-700">{drillDownCategory || '全部分类'}</span></span>
                         <span>平均年限：<span className="font-bold text-indigo-600">
                           {(durationStats.reduce((sum, item) => sum + (parseFloat(item.avgYears) * item.count), 0) / (durationStats.reduce((sum, item) => sum + item.count, 0) || 1)).toFixed(1)} 年
                         </span></span>
                      </div>

                      <ReactECharts 
                        option={durationBarOption}
                        style={{ height: '320px', width: '100%' }}
                      />
                    </div>
                 </Col>
                 
                 <Col span={24}>
                   <div className="border-t border-gray-100 pt-6 mt-2">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                           <TableOutlined className="text-indigo-500" />
                           <span className="font-bold text-gray-700">多维资产统计报表</span>
                        </div>
                         <span className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                            当前路径：品类 &gt; {drillDownType === 'brand' ? '品牌' : '型号'} &gt; {drillDownType === 'brand' ? '型号' : '品牌'}
                         </span>
                       </div>
                      <Table
                        columns={[
                          { 
                            title: '名称', 
                            dataIndex: 'name', 
                            key: 'name',
                            width: '20%',
                            render: (text, record) => (
                              <span className={`
                                ${record.type === 'category' ? 'font-bold text-gray-800 text-base' : ''}
                                ${record.type === 'brand' ? 'font-medium text-gray-700 text-base' : ''}
                                ${record.type === 'model' ? 'text-gray-600 text-sm' : ''}
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
                            width: '14%',
                            sorter: (a, b) => a.count - b.count,
                            render: (v) => <span className="font-bold text-gray-800 text-base">{v}</span>
                          },
                          { 
                            title: '在库', 
                            dataIndex: 'inStockCount', 
                            key: 'inStockCount', 
                            align: 'right',
                            width: '14%',
                            sorter: (a, b) => a.inStockCount - b.inStockCount,
                            render: (v) => <span className="text-blue-600 font-medium text-base">{v}</span>
                          },
                          { 
                            title: '在用', 
                            dataIndex: 'inUseCount', 
                            key: 'inUseCount', 
                            align: 'right',
                            width: '14%',
                            sorter: (a, b) => a.inUseCount - b.inUseCount,
                            render: (v) => <span className="text-green-600 font-medium text-base">{v}</span>
                          },
                          { 
                            title: '总价值', 
                            dataIndex: 'totalValue', 
                            key: 'totalValue', 
                            align: 'right',
                            width: '18%',
                            sorter: (a, b) => a.totalValue - b.totalValue,
                            render: (v) => <span className="font-mono text-gray-700 text-base">¥ {v.toLocaleString()}</span>
                          },
                          { 
                            title: '利用率', 
                            key: 'utilization',
                            width: '20%',
                            render: (_, record) => {
                              const percent = record.count > 0 ? (record.inUseCount / record.count) * 100 : 0;
                              return (
                                <div className="w-full flex items-center gap-3">
                                  <Progress 
                                    percent={parseFloat(percent.toFixed(1))} 
                                    size="default" 
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
                        size="middle"
                        scroll={{ y: 500 }}
                        className="custom-tree-table"
                        expandable={{
                          expandedRowKeys: expandedTreeKeys,
                          onExpandedRowsChange: (keys) => setExpandedTreeKeys(keys as string[]),
                          expandRowByClick: true
                        }}
                      />
                   </div>
                 </Col>
               </Row>
             </GlassCard>
          </Col>
        </Row>
        
        {/* Row 3: Order Tracking */}
        <Row gutter={[24, 24]} className="mb-8">
          <Col span={24}>
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
                   <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 flex items-center gap-4">
                      <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600">
                        <ProjectOutlined />
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">所属项目</div>
                        <div className="font-bold text-gray-800 text-lg">{orderStats.projectName}</div>
                      </div>
                   </div>

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
                      dataSource={orderStats.filtered.slice(0, 10)} 
                      rowKey="id"
                      pagination={false}
                      size="small"
                      scroll={{ x: 600 }}
                      footer={() => (
                        <div className="flex justify-between items-center text-xs text-gray-400">
                          <span>当前显示：{Math.min(10, orderStats.filtered.length)} / 总记录数：{orderStats.totalCount}</span>
                          {orderStats.filtered.length > 10 && <span className="text-amber-500">仅展示前10条，更多请查看全部</span>}
                        </div>
                      )}
                      columns={[
                        { title: '资产编号', dataIndex: 'asset_code', width: 100, render: t => <span className="font-mono text-xs">{t}</span> },
                        { title: '资产名称', dataIndex: 'name', width: 120, render: t => <span className="font-medium text-gray-800 text-sm">{t}</span> },
                        { title: '资产状态', dataIndex: 'status', width: 80, render: (t) => getStatusBadge(t) },
                        { title: '使用人/部门', dataIndex: 'employee_name', width: 120, render: (t, r) => (
                           <span className="text-xs text-gray-500">
                             {t ? <><UserOutlined className="mr-1"/>{t}</> : r.department_name || '-'}
                           </span>
                        )},
                        { title: '最近更新', dataIndex: 'updated_at', width: 100, render: t => <span className="text-xs text-gray-400">{dayjs(t).format('MM-DD HH:mm')}</span> }
                      ]}
                    />
                    
                    <div className="text-center pt-2">
                      <Button 
                        type="dashed" 
                        block 
                        icon={<FullscreenOutlined />}
                        onClick={() => {
                          resetOrderAssetFilters();
                          setViewAllModalVisible(true);
                        }}
                      >
                        查看全部资产 ({orderStats.totalCount})
                      </Button>
                    </div>
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

      {/* Detail Modal (Pie Chart Drill Down) */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <span className="text-gray-500">{drillDownCategory}</span>
            <span className="text-gray-300">/</span>
            <span className="font-bold">{selectedSlice?.name}</span>
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 ml-2">
               {selectedSlice?.type === 'brand' ? '品牌' : (selectedSlice?.type === 'model' ? '型号' : '设备分类')}
            </span>
          </div>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width="80%"
        style={{ top: 20 }}
        footer={null}
        bodyStyle={{ height: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex-shrink-0 mb-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
           <Row gutter={[16, 16]}>
             <Col xs={24} sm={12} md={6}>
               <Input 
                 prefix={<SearchOutlined className="text-gray-400" />}
                 placeholder="搜索编号/名称/责任人" 
                 value={detailFilters.keyword}
                 onChange={e => setDetailFilters({...detailFilters, keyword: e.target.value})}
                 allowClear
               />
             </Col>
             <Col xs={24} sm={12} md={5}>
               <Select
                 mode="multiple"
                 placeholder="资产状态"
                 className="w-full"
                 value={detailFilters.status}
                 onChange={vals => setDetailFilters({...detailFilters, status: vals})}
                 maxTagCount="responsive"
                 options={[
                   { label: '在库', value: 'in_stock' },
                   { label: '在用', value: 'in_use' },
                   { label: '维修中', value: 'maintenance' },
                   { label: '已处置', value: 'disposed' },
                   { label: '已报废', value: 'scrapped' },
                 ]}
               />
             </Col>
             <Col xs={24} sm={12} md={7}>
               <RangePicker 
                 className="w-full"
                 placeholder={['入库开始', '入库结束']}
                 onChange={(dates) => setDetailFilters({...detailFilters, dateRange: dates})}
               />
             </Col>
             <Col xs={24} sm={12} md={6}>
               <div className="flex gap-2 justify-end">
                  <Button onClick={resetDetailFilters} icon={<ReloadOutlined />}>重置</Button>
                  <Button 
                    type="primary"
                    icon={<ExportOutlined />} 
                    onClick={() => handleExport(getFilteredDetailList(), `${drillDownCategory}_${selectedSlice?.name}_资产清单`)}
                  >
                    导出
                  </Button>
               </div>
             </Col>
           </Row>
        </div>

        <div className="flex-1 overflow-auto">
          <Table
            dataSource={getFilteredDetailList()}
            rowKey="id"
            size="middle"
            pagination={{ 
              pageSize: 20, 
              showSizeChanger: true, 
              showTotal: (total) => `共 ${total} 条记录`,
              position: ['bottomRight']
            }}
            sticky
            scroll={{ x: 1300, y: 'calc(70vh - 140px)' }}
            columns={[
               { 
                 title: '资产编号', 
                 dataIndex: 'asset_code', 
                 width: 120, 
                 fixed: 'left', 
                 render: t => <span className="font-mono font-bold">{t}</span> 
               },
               { 
                 title: '资产名称', 
                 dataIndex: 'name', 
                 width: 150, 
                 fixed: 'left', 
                 render: t => <span className="font-medium">{t}</span> 
               },
               { title: '序列号', dataIndex: 'serial_number', width: 120, render: t => t || '-' },
              { title: '型号', dataIndex: 'model', width: 120, render: t => t || '-' },
              { title: '状态', dataIndex: 'status', width: 100, render: t => getStatusBadge(t) },
              { title: '所属部门', dataIndex: 'department_name', width: 120, render: t => t || '-' },
              { title: '责任人', dataIndex: 'employee_name', width: 100, render: t => t || '-' },
              { 
                title: '入库时间', 
                dataIndex: 'arrival_date', 
                width: 120,
                sorter: (a, b) => dayjs(a.arrival_date || a.created_at).unix() - dayjs(b.arrival_date || b.created_at).unix(),
                render: (t, r) => t ? dayjs(t).format('YYYY-MM-DD') : (r.created_at ? dayjs(r.created_at).format('YYYY-MM-DD') : '-') 
              },
              { title: '资产价值', dataIndex: 'purchase_price', width: 120, align: 'right', sorter: (a, b) => (a.purchase_price || 0) - (b.purchase_price || 0), render: t => t ? `¥ ${Number(t).toLocaleString()}` : '-' },
              { title: '位置', key: 'location', width: 180, render: (_, r) => [r.location, r.specific_location].filter(Boolean).join(' - ') || '-' },
            ]}
          />
        </div>
      </Modal>

      {/* View All Order Assets Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <ProjectOutlined className="text-indigo-600" />
            <span className="font-bold text-gray-800">项目资产全量列表 - {orderStats?.projectName}</span>
          </div>
        }
        open={viewAllModalVisible}
        onCancel={() => setViewAllModalVisible(false)}
        width="80%"
        style={{ top: 20 }}
        footer={null}
        bodyStyle={{ height: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex-shrink-0 mb-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
           <Row gutter={[16, 16]}>
             <Col xs={24} sm={12} md={6}>
               <Input 
                 placeholder="搜索编号/名称/责任人" 
                 prefix={<SearchOutlined className="text-gray-400" />}
                 value={orderAssetFilters.keyword}
                 onChange={e => setOrderAssetFilters({...orderAssetFilters, keyword: e.target.value})}
                 allowClear
               />
             </Col>
             <Col xs={24} sm={12} md={4}>
               <Select
                 mode="multiple"
                 placeholder="资产状态"
                 className="w-full"
                 value={orderAssetFilters.status}
                 onChange={vals => setOrderAssetFilters({...orderAssetFilters, status: vals})}
                 maxTagCount="responsive"
                 options={[
                   { label: '在库', value: 'in_stock' },
                   { label: '在用', value: 'in_use' },
                   { label: '维修中', value: 'maintenance' },
                   { label: '已处置', value: 'disposed' },
                   { label: '已报废', value: 'scrapped' },
                 ]}
               />
             </Col>
             <Col xs={24} sm={12} md={4}>
               <Select
                 mode="multiple"
                 placeholder="资产类型"
                 className="w-full"
                 value={orderAssetFilters.type}
                 onChange={vals => setOrderAssetFilters({...orderAssetFilters, type: vals})}
                 maxTagCount="responsive"
                 options={categories.map(c => ({ label: c.name, value: c.name }))}
               />
             </Col>
             <Col xs={24} sm={12} md={6}>
               <RangePicker 
                 className="w-full"
                 placeholder={['入库开始', '入库结束']}
                 onChange={(dates) => setOrderAssetFilters({...orderAssetFilters, dateRange: dates})}
               />
             </Col>
             <Col xs={24} sm={12} md={4}>
               <div className="flex gap-2">
                  <Button onClick={resetOrderAssetFilters} icon={<ReloadOutlined />}>重置</Button>
                  <Button 
                    type="primary" 
                    icon={<ExportOutlined />} 
                    onClick={() => handleExport(filteredOrderAssets, `${orderStats?.projectName || '项目'}_资产清单`)}
                  >
                    导出
                  </Button>
               </div>
             </Col>
           </Row>
        </div>

        <div className="flex-1 overflow-auto">
           <Table
              dataSource={filteredOrderAssets}
              rowKey="id"
              size="middle"
              pagination={{ 
                pageSize: 20, 
                showSizeChanger: true, 
                showTotal: (total) => `共 ${total} 条记录`,
                position: ['bottomRight']
              }}
              sticky
              scroll={{ x: 1300, y: 'calc(70vh - 140px)' }}
              columns={[
                 { 
                   title: '资产编号', 
                   dataIndex: 'asset_code', 
                   width: 120, 
                   fixed: 'left', 
                   render: t => <span className="font-mono font-bold">{t}</span> 
                 },
                 { 
                   title: '资产名称', 
                   dataIndex: 'name', 
                   width: 150, 
                   fixed: 'left', 
                   render: t => <span className="font-medium">{t}</span> 
                 },
                 { title: '资产类型', dataIndex: ['category', 'name'], width: 100, render: t => <Tag>{t || '其他'}</Tag> },
                { title: '状态', dataIndex: 'status', width: 100, render: t => getStatusBadge(t) },
                { title: '责任人', dataIndex: 'employee_name', width: 100, render: t => t || '-' },
                { title: '所属部门', dataIndex: 'department_name', width: 120, render: t => t || '-' },
                { title: '入库时间', dataIndex: 'arrival_date', width: 120, sorter: (a, b) => dayjs(a.arrival_date).unix() - dayjs(b.arrival_date).unix(), render: t => t ? dayjs(t).format('YYYY-MM-DD') : '-' },
                { title: '更新时间', dataIndex: 'updated_at', width: 150, sorter: (a, b) => dayjs(a.updated_at).unix() - dayjs(b.updated_at).unix(), render: t => dayjs(t).format('YYYY-MM-DD HH:mm') },
                { title: '资产价值', dataIndex: 'purchase_price', width: 120, align: 'right', sorter: (a, b) => (a.purchase_price || 0) - (b.purchase_price || 0), render: t => t ? `¥ ${Number(t).toLocaleString()}` : '-' },
                { title: '位置', key: 'location', width: 180, render: (_, r) => [r.location, r.specific_location].filter(Boolean).join(' - ') || '-' },
              ]}
           />
        </div>
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
        /* Ensure fixed columns have background to prevent overlap transparency */
        .ant-table-wrapper .ant-table-thead > tr > th.ant-table-cell-fix-left,
        .ant-table-wrapper .ant-table-thead > tr > th.ant-table-cell-fix-right {
          background: #f8fafc !important; /* Match hover/header bg */
          z-index: 20; /* Ensure header fixed cols are above body fixed cols if needed */
        }
        .ant-table-wrapper .ant-table-tbody > tr > td.ant-table-cell-fix-left,
        .ant-table-wrapper .ant-table-tbody > tr > td.ant-table-cell-fix-right {
          background: #ffffff !important;
        }
        
        .ant-table-wrapper .ant-table-tbody > tr > td {
          border-bottom: 1px solid #f9fafb;
        }
        .ant-table-wrapper .ant-table-tbody > tr:hover > td {
          background: #f8fafc !important;
        }
        /* Ensure fixed columns also get hover color */
        .ant-table-wrapper .ant-table-tbody > tr:hover > td.ant-table-cell-fix-left,
        .ant-table-wrapper .ant-table-tbody > tr:hover > td.ant-table-cell-fix-right {
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
