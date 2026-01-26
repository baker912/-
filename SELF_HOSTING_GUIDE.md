# 自有服务器 (IP) 部署指南

如果您拥有一台云服务器（阿里云、腾讯云、华为云等）并有公网 IP，这是**最稳定、速度最快**的访问方式。您可以完全绕过 Vercel 的网络限制。

## 1. 准备工作
- **服务器 IP**：假设为 `1.2.3.4`（请替换为您实际购买的 IP）。
- **服务器环境**：已安装 Nginx。
- **构建产物**：本地项目的 `dist` 文件夹（执行 `npm run build` 生成）。

## 2. 部署步骤

### 第一步：上传代码
将本地 `dist` 文件夹中的所有内容，上传到服务器的 `/usr/share/nginx/html` 目录（或者您自定义的目录）。

### 第二步：配置 Nginx (支持 IP 直接访问)
您可以直接使用 IP 访问，无需域名（适合测试）。请将服务器上的 `/etc/nginx/nginx.conf` 或 `/etc/nginx/conf.d/default.conf` 修改为以下内容：

```nginx
server {
    listen 80;
    server_name _;  # 允许通过 IP 直接访问

    # 指向您上传的 dist 目录
    root /usr/share/nginx/html;
    index index.html;

    # 开启 Gzip 压缩 (提升加载速度)
    gzip on;
    gzip_min_length 1k;
    gzip_types text/plain text/css text/javascript application/json;

    # 核心配置：解决 SPA 路由刷新 404 问题
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location /assets {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000";
    }
}
```

### 第三步：重启 Nginx
在服务器终端执行：
```bash
nginx -t   # 检查配置是否正确
nginx -s reload  # 重载配置
```
@
## 3. 访问验证
直接在浏览器输入您的 IP 地址：`http://您的IP地址`（例如 `http://1.2.3.4`）。
- **优势**：国内直连，速度极快，无任何网络阻断。
- **注意**：如果通过 IP 访问，通常只能使用 HTTP。如果您需要 HTTPS（小绿锁），则必须绑定域名并申请证书。

## 4. 常见问题
- **无法访问？** 请检查云服务器的**安全组/防火墙**设置，确保 **80 端口** 已对公网开放。
- **刷新页面 404？** 请确保 Nginx 配置中包含了 `try_files $uri $uri/ /index.html;` 这一行。
