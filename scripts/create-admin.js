
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://trdyesnfxlbysybepgyh.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZHllc25meGxieXN5YmVwZ3loIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA3Njc1MSwiZXhwIjoyMDg0NjUyNzUxfQ.2C1ec29Baxke9y6Y0l0gH2UyZ_A6nXJAfTLifUffbNQ';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  const email = 'admin@faw-vw.com';
  const password = '222222';

  console.log(`正在创建管理员账号: ${email}...`);

  // 1. Check if user exists (hacky way by trying to sign in or just create and catch error)
  // Ideally use admin.listUsers but simpler to just try create.
  
  // Clean up if exists (optional, but good for idempotency)
  // But we can't easily find ID by email without listUsers permission which service_role has.
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('获取用户列表失败:', listError);
    return;
  }

  const existingUser = users.find(u => u.email === email);
  let userId = existingUser?.id;

  if (existingUser) {
    console.log('用户已存在，正在重置密码...');
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { password: password, email_confirm: true }
    );
    if (updateError) {
      console.error('更新密码失败:', updateError);
      return;
    }
  } else {
    console.log('用户不存在，正在创建...');
    const { data, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    
    if (createError) {
      console.error('创建用户失败:', createError);
      return;
    }
    userId = data.user.id;
  }

  if (!userId) {
    console.error('无法获取用户ID');
    return;
  }

  // 2. Update role in public.users
  // Wait a bit for the trigger to run if it was a new creation
  console.log('正在设置管理员权限...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  const { error: updateRoleError } = await supabase
    .from('users')
    .update({ role: 'admin', name: '系统管理员' })
    .eq('id', userId);

  if (updateRoleError) {
    console.error('更新权限失败:', updateRoleError);
    // Fallback: manual insert if trigger failed or race condition
    const { error: insertError } = await supabase
      .from('users')
      .upsert({ 
        id: userId, 
        email, 
        role: 'admin', 
        name: '系统管理员' 
      });
      
    if (insertError) {
       console.error('手动插入用户表失败:', insertError);
       return;
    }
  }

  console.log('\n=============================================');
  console.log('✅ 管理员账号创建/更新成功！');
  console.log(`账号: ${email}`);
  console.log(`密码: ${password}`);
  console.log('=============================================');
}

createAdmin();
