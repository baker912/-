# 标准化部署方案与运维文档

本文档详细记录了项目的标准化部署流程、自动化流水线配置、验证机制及回滚策略，旨在消除人工差异，确保部署的稳定性和可观测性。

## 1. 部署架构概览

- **代码仓库**: GitHub (Branch: `main`)
- **CI/CD 工具**: GitHub Actions
- **构建环境**: Node.js 20 (Ubuntu Latest)
- **目标服务器**: Nginx (CentOS/Ubuntu 兼容)
- **部署策略**: 覆盖式更新 + 多路径冗余 + 强制服务重启

## 2. 自动化流水线配置 (GitHub Actions)

配置文件路径: `.github/workflows/deploy.yml`

### 2.1 触发条件
- 仅当代码推送到 `main` 分支时触发。
- 建议每次发布前更新 `package.json` 中的 `version` 字段，以便进行版本追踪。

### 2.2 构建流程
1. **环境准备**: 使用 `actions/setup-node@v4` 配置 Node.js 20 环境，并启用 npm 缓存。
2. **依赖安装**: 使用 `npm ci` (Clean Install) 确保依赖版本严格一致。
3. **项目构建**: 执行 `npm run build` 生成生产环境产物 (`dist/`)。
4. **产物压缩**: 将 `dist/` 目录打包为 `dist.tar.gz`，减少传输时间（通常压缩比 10:1）。

### 2.3 部署流程 (服务器端执行)
脚本采用**防御性编程**风格，包含以下关键步骤：

1. **文件传输**: 使用 SCP 将压缩包传至服务器临时目录 `/tmp/dist.tar.gz`。
2. **多路径覆盖 (Shotgun Deployment)**:
   - 自动检测并部署到 `/usr/share/nginx/html` (CentOS 默认)
   - 自动检测并部署到 `/var/www/html` (Ubuntu 默认)
   - *目的*: 消除因操作系统差异导致的“文件已更新但 Nginx 读取旧目录”的问题。
3. **权限修复**:
   - 自动识别 `nginx` 或 `apache` 用户，并修正文件所有权 (`chown`)。
   - 统一设置目录权限为 `755`。
4. **SELinux 适配**:
   - 自动执行 `restorecon -R -v`，修复文件上下文，防止 SELinux 拦截 Nginx 读取。
5. **服务重启**:
   - 执行 `systemctl restart nginx` (非 reload)，强制清除内存缓存和文件句柄。

## 3. 部署验证机制

为杜绝“部署成功但页面未更新”的情况，引入以下验证环节：

### 3.1 版本号可视化验证
- **机制**: 前端 `AppLayout.tsx` 组件读取 `package.json` 版本号及构建时间。
- **验证**: 部署后访问页面底部，检查 "System Version: X.X.X" 是否与本次发布版本一致。

### 3.2 自动化脚本检查 (在 deploy.yml 中已实现)
- **错误中断**: 全局开启 `set -e`，任何步骤失败立即终止流水线。
- **路径检查**: 脚本必须找到至少一个合法的 Nginx 目录才算成功，否则抛出 Error。

## 4. 缓存清理策略

### 4.1 Nginx 侧
- 部署脚本最后执行 `systemctl restart nginx`，清除所有服务端缓存。

### 4.2 浏览器/CDN 侧
- 构建工具 (Vite) 已配置文件名哈希 (e.g., `index-A1b2C3d.js`)。
- **策略**: 
  - `index.html` 设置 `Cache-Control: no-cache` (需在 Nginx 配置中补充)。
  - 静态资源 (JS/CSS) 设置长缓存 (1年)，依赖文件名变更实现更新。

## 5. 回滚机制

当新版本出现严重 Bug 时，执行以下回滚流程：

1. **GitHub Revert**:
   - 在 GitHub 仓库找到上一个稳定版本的 Commit。
   - 点击 "Revert" 按钮，创建一个撤销变更的新 PR 并合并。
2. **自动触发部署**:
   - Revert 操作本质是新的代码提交，会自动触发 GitHub Actions，将旧版本代码重新构建并部署。
3. **版本号回退**:
   - 确保 `package.json` 版本号更新（即使是回滚），以触发前端页面刷新。

## 6. 环境变量与机密管理

所有敏感信息必须存储在 GitHub Secrets 中，严禁硬编码：

- `SERVER_HOST`: 服务器 IP 地址
- `SERVER_USER`: SSH 登录用户名 (建议非 root)
- `SERVER_SSH_KEY`: SSH 私钥

## 7. 监控与告警

- **部署状态**: 订阅 GitHub Actions 通知邮件，部署失败即时告警。
- **服务监控**: 建议配置 UptimeRobot 或类似服务，每 5 分钟检查一次网站 HTTP 200 状态及关键字匹配（如版本号）。

---

**文档维护记录**
- 2026-01-27: 建立初始文档，固化 v0.0.3 版本的成功部署经验。
