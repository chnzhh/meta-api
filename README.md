# meta-api

网页元数据提取 API，部署在 Cloudflare Workers 上。

## 功能

- 提取网页的 title、description、icon、url
- 支持 JSON / 纯文本输出
- 支持路径路由和查询参数两种调用方式
- 自动 CORS 跨域支持

## 安装

```bash
# 1. 克隆仓库
git clone <克隆地址>
cd meta-api

# 2. 安装依赖
npm install
```

## 本地开发

```bash
npm run dev
```

访问 `http://localhost:8787` 进行测试。

## 部署到 Cloudflare

```bash
# 1. 登录 Cloudflare（首次需要）
npx wrangler login

# 2. 部署
npm run deploy
```

部署成功后会输出 Worker 的 URL，格式类似：
`https://meta-api.<your-subdomain>.workers.dev`

## 使用方式

### 方式一：查询参数
```
https://meta-api.xxx.workers.dev/?url=https://example.com
https://meta-api.xxx.workers.dev/?url=https://example.com&format=text
https://meta-api.xxx.workers.dev/?url=https://example.com&meta=title
```

### 方式二：路径路由
```
https://meta-api.xxx.workers.dev/https://example.com
https://meta-api.xxx.workers.dev/example.com
https://meta-api.xxx.workers.dev/example.com/
```

### 参数说明

| 参数 | 默认值 | 可选值 |
|------|--------|--------|
| `url` | 无 | 任意网址 |
| `format` | `json` | `json`、`text` |
| `meta` | `all` | `all`、`title`、`description`、`icon`、`url` |

### 返回示例

```json
{
  "url": "https://example.com",
  "title": "Example Domain",
  "description": "",
  "icon": "https://example.com/favicon.ico"
}
```
