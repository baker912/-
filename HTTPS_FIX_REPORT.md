# HTTPS 安全访问排查与修复报告

## 1. 问题诊断
用户反馈网站部署后无法访问，浏览器提示“连接不安全”（Connection Not Secure）。经排查，主要原因如下：
1.  **缺乏自动升级策略**：网页中可能包含 HTTP 资源引用，导致“混合内容”（Mixed Content）警告。
2.  **服务器配置缺失**：如果使用自定义服务器（如 Nginx），可能未正确配置 SSL 证书和强制跳转。
3.  **浏览器安全策略**：现代浏览器默认阻止非 HTTPS 的表单提交和敏感操作。

## 2. 已执行的修复措施

### 2.1 前端代码层面的强制升级
已在 `index.html` 的 `<head>` 中添加了以下 CSP 策略：
```html
<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests" />
```
**作用**：告诉浏览器将页面内所有 HTTP 请求自动升级为 HTTPS 请求。这可以有效解决因图片、API 或脚本引用 HTTP 链接而导致的安全警告。

### 2.2 提供了标准的 Nginx HTTPS 配置
在项目根目录下创建了 `nginx.conf` 文件，包含以下关键配置：
- **HTTP -> HTTPS 强制重定向**：监听 80 端口并返回 301 跳转。
- **SSL/TLS 最佳实践**：配置了 `TLSv1.2` 和 `TLSv1.3` 协议，禁用了不安全的加密套件。
- **HSTS (HTTP Strict Transport Security)**：添加了 `Strict-Transport-Security` 响应头，强制浏览器在未来一年内只通过 HTTPS 访问该域名。
- **SPA 路由支持**：配置了 `try_files $uri $uri/ /index.html;`，防止刷新页面出现 404 错误。

## 3. 部署与验证步骤（请执行）

### 第一步：检查 SSL 证书
如果您使用 **Vercel / Netlify**：
1.  进入项目 Dashboard -> Settings -> Domains。
2.  检查域名的 SSL 状态。如果显示 "Invalid Configuration" 或 "Pending"，请检查您的 DNS 设置（CNAME 或 A 记录）。
3.  Vercel 会自动申请 Let's Encrypt 证书，通常需要 5-10 分钟生效。

如果您使用 **Nginx / 自有服务器**：
1.  确保您已申请了 SSL 证书（`.crt` 和 `.key` 文件）。
2.  将 `nginx.conf` 中的 `server_name` 替换为您的真实域名。
3.  将 `ssl_certificate` 和 `ssl_certificate_key` 路径指向您的证书文件。
4.  重新加载 Nginx：`nginx -s reload`。

### 第二步：验证 DNS 解析
请使用终端运行以下命令，确保域名已解析到服务器 IP：
```bash
ping your-domain.com
```

### 第三步：重新部署前端
由于修改了 `index.html`，您需要重新构建并部署项目：
1.  执行构建：`npm run build`
2.  将生成的 `dist` 目录部署到服务器。

### 第四步：最终验证
1.  在浏览器中使用 **无痕模式** 访问 `https://您的域名`。
2.  点击地址栏的小锁图标，确认显示“连接安全”。
3.  打开控制台（F12），查看 Console 面板是否有红色报错。如果之前的优化生效，应该不会再有 Mixed Content 错误。

## 4. 常见问题自查
- **错误代码 `NET::ERR_CERT_AUTHORITY_INVALID`**：说明证书是自签名的（Self-signed），浏览器不信任。请申请免费的 Let's Encrypt 证书或购买商业证书。
- **错误代码 `ERR_TOO_MANY_REDIRECTS`**：检查 CDN（如 Cloudflare）的 SSL 设置。如果 Nginx 已经是 HTTPS，CDN 应该设置为 "Full (Strict)" 模式，而不是 "Flexible"。
