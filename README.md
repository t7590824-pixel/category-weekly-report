# 品类运营周报系统迁移说明

这是从 Manus 导出的周报/月报系统源码，已做了 Codex 本地迁移和新平台部署适配。

## 本地运行

1. 安装 Node.js LTS，并确保 `pnpm` 可用。
2. 复制 `.env.example` 为 `.env`，填入数据库、飞书和 AI 分析相关密钥。
   本地只想先看页面时，可以临时设置 `LOCAL_AUTH_BYPASS=true`。生产环境不要开启这个开关。
3. 安装依赖：

```bash
pnpm install
```

4. 初始化数据库表：

```bash
pnpm db:push
```

5. 启动开发环境：

```bash
pnpm dev
```

默认会从 `http://localhost:3000` 打开。

## 线上部署

这个项目是 Node.js + React 的全栈服务，不能直接当纯静态网站部署。推荐部署到支持 Docker 或 Node Web Service 的平台，例如 Render、Railway、Fly.io、腾讯云、阿里云或自有服务器。

仓库已包含：

- `Dockerfile`：通用容器部署入口。
- `render.yaml`：Render Blueprint 示例，会生成新的线上地址。
- `.env.example`：需要在部署平台里配置的环境变量模板。

部署后需要把飞书应用里的回调地址改成新域名：

```text
https://你的新域名/api/feishu/callback
```

同时把 `FEISHU_REDIRECT_BASE_URL` 设置成：

```text
https://你的新域名
```

## 需要迁移的外部资源

- `DATABASE_URL`：MySQL/TiDB 数据库。登录用户和月报 SKC 导入缓存需要它。
- 飞书应用：回调地址需要配置为 `https://你的域名/api/feishu/callback`，本地调试可用 `http://localhost:3000/api/feishu/callback`。
- Google Sheets：当前代码直接读取固定表格的 CSV 导出链接。表格必须允许服务器访问，否则要改成 Service Account 或 API Key 读取。
- AI 分析：优先使用 `OPENAI_BASE_URL` / `OPENAI_API_KEY` / `OPENAI_MODEL` 这组 OpenAI-compatible 配置；如果继续使用旧 Forge 接口，也可以填 `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY`。

## 月报数据

月报 SKC 数据通过页面上传 Excel/CSV 后写入 `skc_monthly_data` 表。迁移时如果新库为空，需要重新导入历史月报文件；如果要保留 Manus 托管数据库里的历史缓存，需要从 Manus 数据库导出后导入新库。

## Dify AI 分析

当前系统保留原来的模块级 AI 分析方式：销售同比、销售环比、双端、渠道、新老品、场景、畅销元素等模块仍然各自点击生成分析。后台会根据 `moduleKey` 选择对应的专属 prompt，然后优先发送到公司 Dify 工作流。

配置方式：

```env
DIFY_API_URL=https://your-dify-domain/v1
DIFY_API_KEY=your-workflow-api-key
DIFY_USER=category-weekly-report
```

Dify 工作流模板在 `dify/category-report-analysis-workflow.yml`。导入后需要在 Dify 里选择公司允许使用的模型，并发布工作流。如果没有配置 Dify，系统会回退到 `OPENAI_BASE_URL` / `OPENAI_API_KEY` 这组 OpenAI-compatible 配置。
