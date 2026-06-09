# 在腾讯云自建 Supabase 完整指南

这篇指南将指导您如何在腾讯云服务器上使用 Docker 部署开源版的 Supabase，并将您的前端项目连接到自建的后端，彻底解决网络连通性和高昂费用的问题。

## 零、服务器环境准备

**建议配置**：至少 **2核 4GB内存**，带宽建议 **3Mbps** 以上（方便图片和文件上传）。

1. **开放防火墙端口**：
   - 进入腾讯云服务器控制台 -> 防火墙（或安全组）。
   - 添加规则，开放以下端口：
     - `80` (HTTP)
     - `443` (HTTPS)
     - `8000` (Supabase API 和 Studio 控制台)
     - `5432` (PostgreSQL 数据库直连，可选)

2. **设置适当的 Swap 虚拟内存（推荐）**：
   虽然您升级了内存，但加上 2GB-4GB 的 Swap 可以防止突发流量导致的 OOM 崩溃。
   ```bash
   sudo fallocate -l 4G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

## 第一步：安装 Docker 和 Docker Compose

通过 SSH 登录到您的腾讯云服务器：

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | bash -s docker --mirror Aliyun

# 启动 Docker 并设置开机自启
sudo systemctl start docker
sudo systemctl enable docker

# 安装 Docker Compose
sudo apt-get install docker-compose-plugin -y
```

### 1.1 配置 Docker 镜像加速器（解决国内拉取镜像超时问题）

由于 Docker 官方镜像仓库（Docker Hub）在国内访问极不稳定，您**必须**配置国内镜像加速器，否则后续的 `pull` 操作会超时失败。

在服务器终端执行以下命令：

```bash
# 创建 docker 配置目录
sudo mkdir -p /etc/docker

# 写入腾讯云内网加速器及其他可用备用源
sudo tee /etc/docker/daemon.json <<-'EOF'
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://docker.m.daocloud.io",
    "https://dockerproxy.com",
    "https://hub-mirror.c.163.com"
  ]
}
EOF

# 重载配置并重启 Docker 服务
sudo systemctl daemon-reload
sudo systemctl restart docker
```
*注：`mirror.ccs.tencentyun.com` 是腾讯云专属的内网加速节点，在腾讯云服务器上使用速度极快且稳定。*

## 第二步：拉取并配置 Supabase

```bash
# 1. 克隆官方的 docker 仓库
git clone --depth 1 https://github.com/supabase/supabase.git

# 2. 进入 docker 目录
cd supabase/docker

# 3. 复制环境变量模板文件
cp .env.example .env
```

**修改配置文件（关键）**：
使用 `nano .env` 或 `vim .env` 编辑刚才复制的 `.env` 文件：

```env
# 必须修改为你自己的强密码，否则数据库极易被黑客勒索
POSTGRES_PASSWORD=your_super_secret_db_password_here

# 必须生成两个安全的随机字符串 (可以随便敲键盘，越长越好，不要有特殊符号)
JWT_SECRET=your_super_secret_jwt_string_here_123456789
ANON_KEY=your_super_secret_anon_key_here_123456789
SERVICE_ROLE_KEY=your_super_secret_service_role_key_here_123456789

# 将这里的地址修改为您腾讯云服务器的公网 IP
# 例如：API_EXTERNAL_URL=http://123.45.67.89:8000
API_EXTERNAL_URL=http://你的腾讯云公网IP:8000
```

## 第三步：启动 Supabase 实例

在 `supabase/docker` 目录下执行：

```bash
# 拉取镜像并后台启动所有服务
sudo docker compose pull
sudo docker compose up -d
```

等待启动完成后，您可以在浏览器中访问控制台：
👉 **`http://你的腾讯云公网IP:8000/`**

默认的 Studio 登录账号：`supabase`，默认密码：`this_password_is_secret_42`（请记得在配置中修改或登录后修改）。

## 第四步：迁移数据库结构

由于您是全新的自建环境，里面是空数据库，您需要把之前的表结构导进去。

1. 登录您刚搭建好的 Supabase Studio (`http://你的公网IP:8000`)。
2. 进入左侧的 **SQL Editor** 菜单。
3. 打开您本地项目中的 `supabase/migrations/` 目录，将以下两个文件里的 SQL 代码复制到网页的编辑器中并执行 (Run)：
   - `20240122_initial_schema.sql` (核心表结构)
   - `20240122_seed_data.sql` (初始字典数据)

## 第五步：修改前端代码连接自建服务

打开本地项目中的 `src/lib/supabase.ts`，修改如下：

```typescript
import { createClient } from '@supabase/supabase-js';

// 替换为您腾讯云的公网 IP 和 8000 端口
const supabaseUrl = 'http://你的腾讯云公网IP:8000';

// 替换为您在第二步 .env 文件中设置的 ANON_KEY
const supabaseAnonKey = 'your_super_secret_anon_key_here_123456789';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

完成以上步骤后，系统就彻底连接到了您自己腾讯云上的 Supabase，网络飞快，数据完全自主掌控！
