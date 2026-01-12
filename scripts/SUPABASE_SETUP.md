# Supabase 数据库设置指南

这个指南将帮助你在 Supabase 上设置 Repo Graveyard 的数据库。

## 步骤 1: 创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com)
2. 注册/登录账号
3. 点击 "New Project" 创建新项目
4. 选择组织，输入项目名称（如：`repo-graveyard`）
5. 设置数据库密码（**请妥善保存**）
6. 选择区域（建议选择距离你最近的区域）
7. 点击 "Create new project" 并等待创建完成

## 步骤 2: 获取 API 凭证

1. 在项目仪表板中，点击左侧菜单的 **Settings** → **API**
2. 复制以下信息：
   - **Project URL** (类似: `https://xxxxx.supabase.co`)
   - **anon public key** (匿名公钥)

## 步骤 3: 运行初始化脚本

1. 在项目仪表板中，点击左侧菜单的 **SQL Editor**
2. 点击 "New Query" 创建新查询
3. 复制 `scripts/supabase-init.sql` 文件的内容
4. 粘贴到 SQL 编辑器中
5. 点击 "Run" 执行脚本

**脚本将创建：**
- `graveyards` 表 - 存储埋葬的项目信息
- `priest_stats` 表 - AI 神父的点赞统计
- `increment_respects()` 函数 - 原子递增致敬计数
- `bless_priest()` 函数 - 原子递增神父点赞
- 索引和 RLS 策略

## 步骤 4: 配置环境变量

在项目根目录创建 `.env.local` 文件：

```bash
VITE_SUPABASE_URL=你的项目URL
VITE_SUPABASE_KEY=你的anon密钥
```

示例：
```bash
VITE_SUPABASE_URL=https://vbzhpselnugbpjxxewjl.supabase.co
VITE_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 步骤 5: 更新代码配置

**重要：** 如果你有自己的 Supabase 项目，需要更新 `services/supabaseClient.ts`：

```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
```

删除硬编码的默认值，确保只从环境变量读取。

## 步骤 6: 验证设置

1. 启动开发服务器：
   ```bash
   npm run dev
   ```

2. 应用应该能正常运行并连接到你的 Supabase 数据库

## 数据库表结构

### `graveyards` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| repo_url | TEXT | GitHub 仓库 URL（唯一） |
| repo_name | TEXT | 仓库名称 |
| description | TEXT | 项目描述 |
| language | TEXT | 编程语言 |
| stars_count | INTEGER | 星标数 |
| forks_count | INTEGER | Fork 数 |
| birth_date | TIMESTAMPTZ | 创建日期 |
| death_date | TIMESTAMPTZ | 最后提交日期 |
| owner_name | TEXT | 所有者名称 |
| cause_of_death | TEXT | 死亡原因 |
| eulogy | TEXT | 悼词 |
| epitaph | TEXT | 墓志铭 |
| respects_paid | INTEGER | 致敬数 |
| undertaker_id | UUID | 入殓师 ID |
| undertaker_name | TEXT | 入殓师名称 |
| provider | TEXT | AI 提供商 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |

### `priest_stats` 表

| 字段 | 类型 | 说明 |
|------|------|------|
| provider | TEXT | AI 提供商（GEMINI/OPENAI/DEEPSEEK） |
| likes_count | INTEGER | 点赞数 |
| updated_at | TIMESTAMPTZ | 更新时间 |

## 故障排查

### 连接错误
- 检查 `.env.local` 中的 URL 和 Key 是否正确
- 确认 Supabase 项目是否已启动

### 权限错误
- 检查 RLS 策略是否正确设置
- 确保 `increment_respects` 和 `bless_priest` 函数有执行权限

### 表不存在
- 重新运行初始化脚本
- 在 Table Editor 中检查表是否创建成功

## 安全建议

1. **生产环境**：考虑使用 Row Level Security (RLS) 限制写入权限
2. **API 密钥**：不要将 `service_role` 密钥提交到代码仓库
3. **备份**：定期备份数据库

## 下一步

- 配置 AI API 密钥（Gemini/OpenAI/DeepSeek）
- 启动应用：`npm run dev`
- 埋葬你的第一个废弃项目！
