
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://trdyesnfxlbysybepgyh.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZHllc25meGxieXN5YmVwZ3loIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA3Njc1MSwiZXhwIjoyMDg0NjUyNzUxfQ.2C1ec29Baxke9y6Y0l0gH2UyZ_A6nXJAfTLifUffbNQ';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedDictionary() {
  console.log('开始生成 100 条资产类目数据...');

  // Get a valid user ID for creator
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  const userId = users && users.length > 0 ? users[0].id : null;

  if (!userId) {
    console.error('未找到用户，无法设置创建人');
    return;
  }

  const items = [];
  const brands = ['Dell', 'HP', 'Lenovo', 'Apple', 'Herman Miller', 'Siemens', 'Bosch', 'Kuka'];
  const equipment = ['笔记本电脑', '台式机', '服务器', '人体工学椅', '会议桌', '机械臂', '控制器', '传感器'];
  const units = ['台', '把', '张', '套', '个'];
  const suppliers = ['京东企业购', '联想官方', '西门子中国', '本地办公家具供应商', '博世工业'];

  for (let i = 0; i < 100; i++) {
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const eqName = equipment[Math.floor(Math.random() * equipment.length)];
    
    items.push({
      project_name: `2024年${['春季', '夏季', '秋季', '冬季'][Math.floor(Math.random()*4)]}采购项目`,
      bm_number: `BM${20240000 + i}`,
      procurement_order: `PO${20240000 + i}`,
      equipment_name: eqName,
      brand: brand,
      model: `${brand}-${Math.floor(Math.random() * 1000)}X`,
      unit: units[Math.floor(Math.random() * units.length)],
      price: Math.floor(Math.random() * 50000) + 100,
      supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
      specification: `规格参数：${Math.floor(Math.random() * 100)}cm x ${Math.floor(Math.random() * 100)}cm`,
      quantity: Math.floor(Math.random() * 100) + 1,
      description: `这是第 ${i + 1} 条自动生成的资产类目测试数据。`,
      created_by: userId,
      created_at: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString()
    });
  }

  const { error } = await supabase
    .from('asset_dictionary')
    .insert(items);

  if (error) {
    console.error('插入资产类目数据失败:', error);
  } else {
    console.log('✅ 成功插入 100 条资产类目数据！');
  }
}

seedDictionary();
