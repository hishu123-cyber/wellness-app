# 食术·中医体质养生

AI中医体质辨识，个性化健康管理平台

## 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库
node seed-db.js

# 3. 启动（开发环境）
$env:WELLNESS_SECRET="wellness-secret-key"; node server.js

# 4. 打开浏览器访问
# http://localhost:8000          -> 官网首页
# http://localhost:8000/app      -> APP入口
# http://localhost:8000/app?demo=demo -> 自动登录演示
```

## 生产部署

### 使用 PM2（推荐）

```bash
npm install -g pm2

# 修改 ecosystem.config.js 中的 WELLNESS_SECRET 为真实密钥
start_wellness.bat
# 或: npx pm2 start ecosystem.config.js
```

### 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `WELLNESS_SECRET` | 是 | 密码加密密钥（生产环境必须设置） |
| `NODE_ENV` | 否 | 设为 `production` 时强制要求环境变量 |

### 域名（ha 中国域名）

```
shishu.中国 -> http://localhost:8000（通过反向代理）
```

## 测试账号

| 账号 | 密码 | 角色 |
|------|------|------|
| `demo` | `123456` | 演示用户（有限权限） |
| `admin` | 需创建 | 管理员（访问 /api/admin/*） |

## API 概览

- `/api/health` - 健康检查
- `/api/auth/*` - 登录/注册
- `/api/constitution/*` - 体质测评
- `/api/diary/*` - 健康日记
- `/api/recipes` - 食疗药膳
- `/api/solar-terms` - 24节气养生
- `/api/articles` - 养生文章
- `/api/tea/*` - 茶养模块
- `/api/tcm/*` - 在线中医问诊
- `/api/shop/*` - 养生商城
- `/api/vip/*` - VIP会员
- `/api/points/*` - 积分签到
- `/api/pay/*` - 支付系统
- `/api/chefs/*` - 上门厨师服务
- `/api/admin/*` - 管理运维功能

## 技术栈

- **后端**: Node.js + Express 5 + sql.js (SQLite)
- **前端**: 原生 JS SPA + CSS 变量主题
- **PWA**: ServiceWorker + manifest.json
- **构建**: GitHub Actions → Bubblewrap APK

## APK 构建

Push 到 main 分支自动触发 GitHub Actions 构建。
也可手动触发：Actions → Build Android APK → Run workflow
