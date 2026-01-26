# Vercel 自定义域名绑定指南

绑定自定义域名是解决 Vercel 项目在中国大陆无法访问（DNS 污染/阻断）的最佳方案。请按照以下步骤操作：

## 1. 准备工作
- 拥有一个已注册的域名（例如在阿里云、腾讯云、GoDaddy 等平台购买）。
- 拥有该域名的 DNS 解析管理权限。

## 2. 第一步：在 Vercel 添加域名
1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)。
2. 点击进入您的项目（`java`）。
3. 点击顶部的 **Settings** 选项卡。
4. 在左侧菜单选择 **Domains**。
5. 在输入框中输入您想绑定的域名（例如 `assets.your-company.com` 或 `your-company.com`）。
6. 点击 **Add**。
7. 此时 Vercel 会提示 "Invalid Configuration"（无效配置），并显示两个数值（Type, Name, Value），请保留此页面不动，进行下一步。

## 3. 第二步：配置 DNS 解析
登录您的域名购买平台（如阿里云/腾讯云），找到 **DNS 解析** 或 **域名解析** 设置，根据您绑定的域名类型选择一种配置：

### 情况 A：绑定子域名（推荐）
如果您使用的是 `app.example.com`、`www.example.com` 这样的子域名：

| 记录类型 | 主机记录 (Name) | 记录值 (Value) |
| :--- | :--- | :--- |
| **CNAME** | `app` (或者 `www`) | **`cname.vercel-dns.com`** |

### 情况 B：绑定根域名
如果您使用的是 `example.com`（不带 www）：

| 记录类型 | 主机记录 (Name) | 记录值 (Value) |
| :--- | :--- | :--- |
| **A** | `@` | **`76.76.21.21`** |

> **提示**：如果您同时绑定了根域名和 www 域名，建议将 www 设置为 CNAME，根域名设置为 A 记录。

## 4. 第三步：等待生效与验证
1. DNS 配置完成后，回到 Vercel 的 Domains 页面。
2. Vercel 会自动检测 DNS 记录。通常在 1-5 分钟内，状态会变为 ✅ **Valid**（蓝色或黑色）。
3. 同时，Vercel 会自动为您申请并部署 SSL 证书（状态显示为 Generating SSL）。
4. 当两个勾都亮起时，您就可以通过新域名（如 `https://app.example.com`）访问您的网站了。

## 5. 常见问题
- **阿里云/腾讯云提示“CNAME 冲突”**：如果根域名已配置了 MX 记录（企业邮箱），则根域名无法配置 CNAME。此时请务必使用 **A 记录 (`76.76.21.21`)** 绑定根域名。
- **一直显示 Pending**：DNS 全球生效可能需要时间（最长 24 小时，但通常几分钟）。您可以尝试刷新 Vercel 页面。
- **访问新域名还是慢？**：这是极小概率事件。如果发生，请在 DNS 解析中将线路设置为“境外”指向 Vercel，而“境内”指向您自己的国内服务器（如果有），或者考虑使用 Cloudflare 进行 CDN 加速。
