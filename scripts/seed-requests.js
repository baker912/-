
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://trdyesnfxlbysybepgyh.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZHllc25meGxieXN5YmVwZ3loIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA3Njc1MSwiZXhwIjoyMDg0NjUyNzUxfQ.2C1ec29Baxke9y6Y0l0gH2UyZ_A6nXJAfTLifUffbNQ';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedRequests() {
  console.log('开始生成 100 条需求管理数据...');

  // Get a valid user ID for creator
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  const userId = users && users.length > 0 ? users[0].id : null;

  if (!userId) {
    console.error('未找到用户，无法设置创建人');
    return;
  }

  const requests = [];
  const requestTypes = ['固定资产', '非标备件'];
  const assetNames = ['高性能笔记本', '人体工学椅', '工业机械臂', '精密传感器', '服务器机柜', '高清显示器', '数控机床刀具', '3D打印机'];
  const depts = ['研发部', '生产部', 'IT部', '行政部', '采购部'];

  for (let i = 0; i < 100; i++) {
    const type = requestTypes[Math.floor(Math.random() * requestTypes.length)];
    const name = `${depts[Math.floor(Math.random() * depts.length)]}申请${type} - ${assetNames[Math.floor(Math.random() * assetNames.length)]}`;
    
    requests.push({
      request_name: name,
      request_type: type,
      description: `这是第 ${i + 1} 条自动生成的测试需求，用于验证系统功能。`,
      created_by: userId,
      created_at: new Date(Date.now() - Math.floor(Math.random() * 10000000000)).toISOString()
    });
  }

  const { error } = await supabase
    .from('asset_requests')
    .insert(requests);

  if (error) {
    console.error('插入需求数据失败:', error);
  } else {
    console.log('✅ 成功插入 100 条需求数据！');
  }
}

seedRequests();
