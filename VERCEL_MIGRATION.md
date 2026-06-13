# 食术养生 Vercel 部署改造

## 完成时间
2026-06-13

## 改造目标
将食术养生项目从传统 Node.js 服务器改造为适配 Vercel Serverless 部署。

## 完成的工作

### 1. 创建 vercel.json 配置
- 配置 Serverless Functions 路由
- 配置静态文件托管
- 设置函数内存和超时限制

### 2. 创建 api/index.js - 主 API 路由
- 从 server.js 提取所有路由逻辑
- 使用 Express 应用包装
- 导出 Vercel Serverless Handler
- 保留所有原有 API 路由：
  - 用户注册/登录/认证
  - 茶养打卡/徽章/记录
  - 中医问诊 (tcm_service)
  - 营养师服务 (nutritionist_service)
  - 服务商入驻 (provider_onboarding_service)
  - AI辨体 (ai_constitution_engine)
  - 用户画像 (user_profile_engine)
  - 节气日历 (seasonal_calendar_service)
  - 支付 (pay)
  - AI问答 (ai_service)
  - 茶百科 (tea_service)

### 3. 创建 api/db.js - 数据库适配层
- 支持 Turso (libsql) 云数据库
- 支持 sql.js 内存数据库 fallback
- 提供同步 API（兼容现有服务模块）
- 提供异步 API（用于新路由）
- 自动初始化表结构

### 4. 复制前端文件到 public/
- index.html
- app.js
- styles.css
- manifest.json
- sw.js
- assets/

### 5. 更新 package.json
- 添加 @libsql/client 依赖
- 移除 localtunnel, ssh2
- 添加 vercel-build 脚本

### 6. 创建 .vercelignore
排除不需要上传的文件

### 7. 创建 .env.example
环境变量配置示例

### 8. 创建 README_VERCEL.md
部署说明文档

## 重要注意事项

### 数据库配置
- **生产环境**：必须配置 Turso 数据库
  - `TURSO_DATABASE_URL`
  - `TURSO_AUTH_TOKEN`
- **开发/测试**：可以使用内存 SQLite（数据不持久化）

### 服务模块兼容性
- 现有服务模块使用同步 API
- 内存模式：完全兼容
- Turso 模式：需要将服务模块改为异步调用

### 认证系统
- JWT Token 认证保持不变
- Token 有效期 7 天

### API 路径
- 前端 app.js 中的 API 路径已正确配置为 `/api`
- 无需修改

## 部署步骤

```bash
# 1. 配置 Turso 数据库（推荐）
#    访问 https://turso.tech 注册并创建数据库

# 2. 安装依赖
npm install

# 3. 部署到 Vercel
vercel

# 4. 配置环境变量（Vercel Dashboard）
#    - WELLNESS_SECRET
#    - TURSO_DATABASE_URL
#    - TURSO_AUTH_TOKEN
```

## 文件清单

新增文件：
- `vercel.json` - Vercel 配置
- `.vercelignore` - 部署排除文件
- `.env.example` - 环境变量示例
- `README_VERCEL.md` - 部署文档
- `api/index.js` - Serverless 入口
- `api/db.js` - 数据库适配层
- `public/` - 前端静态文件

修改文件：
- `package.json` - 添加依赖

保留文件：
- 所有原始文件（server.js, 服务模块等）均未删除
