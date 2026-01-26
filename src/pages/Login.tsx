import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Divider } from 'antd';
import { UserOutlined, LockOutlined, SafetyCertificateOutlined, GlobalOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();

  // Mock SSO Login
  const handleSSO = () => {
    messageApi.loading({ content: '正在跳转统一身份认证...', key: 'sso' });
    setTimeout(() => {
      messageApi.success({ content: '一键登录成功', key: 'sso' });
      navigate('/dashboard');
    }, 1500);
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      let email = values.username;
      // Automatically append domain if it looks like an employee ID (no @ symbol)
      if (!email.includes('@')) {
        email = `${email}@faw-vw.com`;
      }

      const { error } = await signIn(email, values.password);
      
      if (error) {
        messageApi.error('登录失败: ' + error.message);
      } else {
        messageApi.success('登录成功');
        navigate('/dashboard');
      }
    } catch (error: any) {
      messageApi.error('发生错误: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-[#f0f5ff] flex items-center justify-center font-sans">
      {contextHolder}

      {/* Background Decorative Mesh (CSS Simulation) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-gradient-to-br from-[#E6F0FF] to-[#F5F9FF]">
        {/* Abstract Tech Mesh - Left Bottom */}
        <div className="absolute -bottom-20 -left-20 w-[800px] h-[600px] opacity-40" 
             style={{
               background: `radial-gradient(circle, rgba(59,130,246,0.1) 1px, transparent 1px)`,
               backgroundSize: '30px 30px',
               maskImage: 'linear-gradient(to top right, black, transparent 70%)',
               WebkitMaskImage: 'linear-gradient(to top right, black, transparent 70%)'
             }}>
        </div>
        
        {/* Dynamic Wave Lines (SVG) */}
        <svg className="absolute bottom-0 left-0 w-full h-[50vh] text-blue-500/10" viewBox="0 0 1440 320" preserveAspectRatio="none">
           <defs>
             <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
               <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
               <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.1" />
               <stop offset="100%" stopColor="#93C5FD" stopOpacity="0" />
             </linearGradient>
           </defs>
           <path fill="url(#wave-gradient)" d="M0,160L48,170.7C96,181,192,203,288,197.3C384,192,480,160,576,149.3C672,139,768,149,864,170.7C960,192,1056,224,1152,218.7C1248,213,1344,171,1392,149.3L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
           <path fill="url(#wave-gradient)" fillOpacity="0.5" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,218.7C672,235,768,245,864,229.3C960,213,1056,171,1152,160C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      <div className="container mx-auto px-6 md:px-12 flex flex-col lg:flex-row items-center justify-between h-full relative z-10 w-full max-w-7xl">

        {/* Top Left Logo (Fixed Position) */}
         {/* <div className="absolute top-6 left-6 md:top-8 md:left-8 z-50">
            <img 
              src="https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=FAW-Volkswagen%20logo%20combo%2C%20FAW%20emblem%20left%2C%20VW%20emblem%20right%2C%20Chinese%20text%20below%20%E4%B8%80%E6%B1%BD-%E5%A4%A7%E4%BC%97%2C%20English%20text%20below%20FAW-VOLKSWAGEN%2C%20navy%20blue%20lines%2C%20pure%20white%20background%2C%20minimalist%20flat%20vector&image_size=square" 
              alt="FAW-VW Logo"
              className="w-32 md:w-40 h-auto object-contain"
            />
         </div> */}
        
        {/* Left Side: Brand & Title */}
        <div className="lg:w-1/2 flex flex-col items-center lg:items-start mb-12 lg:mb-0 transform lg:-translate-y-8">
            {/* Integrated Logo Area */}
             {/* <div className="flex flex-col items-start mb-6">
                <img 
                  src="https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=FAW-Volkswagen%20logo%20combo%2C%20FAW%20emblem%20left%2C%20VW%20emblem%20right%2C%20Chinese%20text%20below%20%E4%B8%80%E6%B1%BD-%E5%A4%A7%E4%BC%97%2C%20English%20text%20below%20FAW-VOLKSWAGEN%2C%20navy%20blue%20lines%2C%20pure%20white%20background%2C%20minimalist%20flat%20vector&image_size=square" 
                  alt="FAW-VW Logo"
                  className="w-32 md:w-40 h-auto object-contain mix-blend-multiply opacity-90 filter contrast-125 mb-4"
                />
             </div> */}

            {/* Main Heading with 3D Effect */}
            <h1 className="text-6xl lg:text-[5rem] font-black text-[#2B7DE8] tracking-tight leading-tight drop-shadow-sm select-none"
                style={{ 
                  textShadow: '0 4px 10px rgba(43, 125, 232, 0.2), 2px 2px 0px rgba(255,255,255,0.8)'
                }}>
              资产管理系统
            </h1>
            <div className="h-1.5 w-24 bg-gradient-to-r from-blue-500 to-transparent mt-6 mb-4 rounded-full"></div>
            <p className="text-blue-900/50 text-lg lg:text-xl font-medium tracking-wide font-sans">
              Intelligent Asset Management System
            </p>
        </div>

        {/* Right Side: Login Card */}
        <div className="w-full max-w-[440px] transform transition-all hover:scale-[1.01] duration-500">
          <Card 
            className="shadow-2xl border-0 rounded-2xl overflow-hidden backdrop-blur-xl bg-white/90 relative"
            bodyStyle={{ padding: '48px 40px' }}
          >
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500"></div>

            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-gray-800 mb-2">欢迎登录</h2>
              <p className="text-gray-400 text-sm">一汽-奥迪销售资产管理系统</p>
            </div>

            {/* Login Method 1: SSO */}
            <div className="mb-8 group">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-blue-600 flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-2 animate-pulse"></div>
                  登录方式一：一键登录
                </span>
                <span className="h-[1px] flex-1 bg-gradient-to-r from-blue-100 to-transparent ml-3"></span>
              </div>
              <Button 
                block 
                size="large" 
                onClick={handleSSO}
                className="h-14 bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 hover:text-blue-600 text-gray-700 font-bold transition-all duration-300 rounded-xl flex items-center justify-center gap-3 group-hover:-translate-y-0.5"
              >
                <div className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center text-blue-600">
                  <GlobalOutlined />
                </div>
                使用统一身份认证登录
              </Button>
            </div>

            {/* Login Method 2: Form */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <span className="text-sm font-medium text-gray-400">登录方式二：账号密码</span>
                <span className="h-[1px] flex-1 bg-gray-100 ml-3"></span>
              </div>

              <Form
                name="login"
                onFinish={onFinish}
                layout="vertical"
                size="large"
                requiredMark={false}
              >
                <Form.Item
                  name="username"
                  rules={[{ required: true, message: '请输入域账号' }]}
                  className="mb-5"
                >
                  <Input 
                    prefix={<UserOutlined className="text-gray-400 px-2 text-lg" />} 
                    placeholder="请输入域账号 / 工号" 
                    className="rounded-xl py-3 bg-gray-50/50 border-gray-200 focus:bg-white hover:bg-white transition-colors"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  rules={[{ required: true, message: '请输入密码' }]}
                  className="mb-5"
                >
                  <Input.Password
                    prefix={<LockOutlined className="text-gray-400 px-2 text-lg" />}
                    placeholder="请输入密码"
                    className="rounded-xl py-3 bg-gray-50/50 border-gray-200 focus:bg-white hover:bg-white transition-colors"
                  />
                </Form.Item>

                <div className="flex gap-3 mb-8">
                   <Form.Item
                      name="captcha"
                      rules={[{ required: true, message: '请输入验证码' }]}
                      className="flex-1 mb-0"
                   >
                     <Input 
                        prefix={<SafetyCertificateOutlined className="text-gray-400 px-2 text-lg" />}
                        placeholder="图形验证码"
                        className="rounded-xl bg-gray-50/50 border-gray-200 focus:bg-white hover:bg-white transition-colors"
                     />
                   </Form.Item>
                   <div className="w-32 h-[50px] bg-white rounded-xl border border-gray-200 flex items-center justify-center cursor-pointer hover:shadow-sm transition-shadow relative overflow-hidden group" title="点击刷新">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                      {/* Noise Background */}
                      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '5px 5px' }}></div>
                      <span className="text-2xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600 italic tracking-widest transform -rotate-3" style={{ filter: 'blur(0.3px)' }}>
                         tsm3c
                      </span>
                   </div>
                </div>

                <Form.Item className="mb-0">
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    block 
                    loading={loading}
                    className="h-14 text-lg font-bold rounded-xl bg-gradient-to-r from-[#0066B3] to-[#0085E8] hover:from-[#005596] hover:to-[#0070C9] border-none shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all transform active:scale-[0.98]"
                  >
                    登 录
                  </Button>
                </Form.Item>
              </Form>
            </div>

          </Card>
          
          <div className="text-center mt-8 text-gray-400 text-xs font-medium tracking-wider opacity-80">
            © 2026 一汽-大众 FAW-VOLKSWAGEN | 技术支持
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
