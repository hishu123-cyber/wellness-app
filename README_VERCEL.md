# 食术养生 - Vercel 部署版

中医体质养生应用，支持 Vercel Serverless 部署。

## 快速部署

### 1. 配置 Turso 数据库（推荐）

1. 访问 [Turso](https://turso.tech) 注册账号
2. 创建数据库
3. 获取数据库 URL 和 Auth Token

### 2. 部署到 Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel
```

### 3. 配置环境变量

在 Vercel Dashboard 中设置以下环境变量：

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `WELLNESS_SECRET` | ✅ | JWT 密钥，任意随机字符串 |
| `TURSO_DATABASE_URL` | ✅ | Turso 数据库 URL |
| `TURSO_AUTH_TOKEN` | ✅ | Turso Auth Token |
| `OPENAI_API_KEY` | ❌ | AI 服务密钥（可选） |

### 4. 初始化数据库

首次部署后，需要在 Turso 数据库中创建表。可以：
- 使用 Turso CLI 执行 SQL
- 或者使用内存模式测试（不持久化）

## 项目结构

```
├── api/
│   ├── index.js      # 主 API 入口（Serverless Function）
│   └── db.js         # 数据库适配层（Turso/sql.js）
├── public/
│   ├── index.html    # 前端入口页面
│   ├── app.js        # 前端应用逻辑
│   ├── styles.css    # 样式文件
│   └── assets/       # 静态资源
├── *.js              # 服务模块（TCM、营养师、AI等）
├── vercel.json       # Vercel 配置
└── package.json      # 依赖配置
```

## API 路由

所有 API 路由以 `/api/` 开头：

- `/api/auth/*` - 用户认证
- `/api/constitution/*` - 体质测评
- `/api/diary/*` - 健康日记
- `/api/recipes/*` - 食疗食谱
- `/api/tcm/*` - 中医问诊
- `/api/nutritionists/*` - 营养师服务
- `/api/tea/*` - 茶养打卡
- `/api/shop/*` - 商城
- `/api/vip/*` - VIP 会员

## 本地开发

```bash
# 安装依赖
npm install

# 复制环境变量
cp .env.example .env

# 启动开发服务器
npm run dev

# 或使用原始服务器
npm start
```

## 注意事项

1. **数据库**：Vercel Serverless 环境无法使用本地 SQLite 文件，必须使用 Turso 或其他云数据库
2. **会话状态**：每次请求是无状态的，用户认证通过 JWT Token 实现
3. **静态文件**：前端文件放在 `public/` 目录自动托管
4. **环境变量**：敏感信息（API 密钥、数据库凭证）必须通过环境变量配置

## 原始服务器

原始的 `server.js` 仍然可用，支持本地开发和传统部署：

```bash
node server.js
```

## License

ISC
