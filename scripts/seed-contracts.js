
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://trdyesnfxlbysybepgyh.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZHllc25meGxieXN5YmVwZ3loIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA3Njc1MSwiZXhwIjoyMDg0NjUyNzUxfQ.2C1ec29Baxke9y6Y0l0gH2UyZ_A6nXJAfTLifUffbNQ';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedData() {
  console.log('开始生成 100 条采购订单合同数据...');

  const contracts = [];
  const projectPrefixes = ['2024年春季', '2024年夏季', '2024年秋季', '2025年第一季度', '2025年产线改造'];
  const projectSuffixes = ['非标备件采购', '固定资产购置', 'IT设备更新', '办公家具补充', '生产耗材补给'];
  
  for (let i = 0; i < 100; i++) {
    const randomProject = `${projectPrefixes[Math.floor(Math.random() * projectPrefixes.length)]}${projectSuffixes[Math.floor(Math.random() * projectSuffixes.length)]}`;
    const bmNumber = `BM${20240000 + i}`;
    const orderNumber = `PO${20240000 + i}`;
    
    contracts.push({
      project_name: `${randomProject} - 批次${i + 1}`,
      bm_number: bmNumber,
      procurement_order: orderNumber,
      description: `这是第 ${i + 1} 条自动生成的测试数据，用于系统压力测试和分页功能验证。`,
      created_at: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString() // Random date in past ~4 months
    });
  }

  const { error } = await supabase
    .from('procurement_contracts')
    .insert(contracts);

  if (error) {
    console.error('插入数据失败:', error);
  } else {
    console.log('✅ 成功插入 100 条数据！');
  }
}

seedData();
