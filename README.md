# webmeta API

网页元数据提取 API，部署在 Cloudflare Pages 上。

从给定 URL 提取网页的 `title`、`description`、`icon`，支持 JSON 和纯文本输出、边缘缓存、彩色字母图标回退。

## 文件结构

```
meta-api/
├── _worker.js          # Pages Advanced Mode 部署版（含缓存 + 彩色字母图标）
├── index.html          # API 说明页面
├── package.json        # 项目配置
├── wrangler.toml       # Wrangler 配置
├── README.md           # 项目说明（本文件）
└── .gitignore
```

## 部署

### Wrangler CLI

```bash
git clone <仓库地址>
cd meta-api
npm install
npx wrangler login
npx wrangler pages deploy . --project-name webmeta
```

### Cloudflare Pages 连接 Git

1. 将代码推送到 GitHub / GitLab
2. Cloudflare Dashboard → Workers & Pages → Create
3. 连接到 Git 仓库
4. 构建设置：Framework preset = None，Build command 留空，Build output directory = `.`
5. 点击 Deploy

## 本地开发

```bash
npm install
npx wrangler dev
```

访问 `http://localhost:8787?url=https://example.com`

## 功能

- 📄 提取网页 `title`、`description`、`icon`
- 🎨 无 favicon 时自动生成彩色 SVG 字母图标（根据域名哈希生成确定性颜色）
- 🎯 支持自定义图标颜色（`color` 参数）
- ⚡ 边缘缓存（Cache API，1 小时 TTL）
- 📦 JSON / 纯文本两种输出格式
- 🔗 路径或查询参数两种调用方式

## 快速开始

```bash
# 最简单的调用
curl https://webmeta.pages.dev/https://example.com
```

```json
{
  "url": "https://example.com",
  "title": "Example Domain",
  "description": "This domain is for use in illustrative examples in documents...",
  "icon": "https://example.com/favicon.ico"
}
```

## 参数

| 参数 | 默认值 | 可选值 | 说明 |
|------|--------|--------|------|
| `url` | 无（必填） | 目标网页地址 | 也可通过路径传递 |
| `meta` | `all` | `all` `title` `description` `icon` `url` | 返回的字段 |
| `format` | `json` | `json` `text` | 输出格式 |
| `color` | 无 | CSS 颜色值 | 自定义字母图标背景色 |

## 调用方式

```bash
# 通过 query 参数
curl "https://webmeta.pages.dev/?url=https://example.com"

# 通过路径（自动补全协议）
curl https://webmeta.pages.dev/https://example.com
curl https://webmeta.pages.dev/example.com
curl https://webmeta.pages.dev/example.com/

# 带路径的 URL
curl https://webmeta.pages.dev/https://example.com/page
```

## 使用示例

### 获取单个字段

```bash
curl "https://webmeta.pages.dev/?url=https://example.com&meta=title"
# → {"title": "Example Domain"}

curl "https://webmeta.pages.dev/?url=https://example.com&meta=description"
# → {"description": "This domain is for use..."}

curl "https://webmeta.pages.dev/?url=https://example.com&meta=icon"
# → {"icon": "https://example.com/favicon.ico"}

curl "https://webmeta.pages.dev/?url=https://example.com&meta=url"
# → {"url": "https://example.com"}
```

### 纯文本输出

```bash
curl "https://webmeta.pages.dev/?url=https://example.com&meta=title&format=text"
# → Example Domain

curl "https://webmeta.pages.dev/?url=https://example.com&format=text"
# → 格式化的 JSON 文本
```

## 彩色字母图标

当网站没有 favicon 时，自动生成 SVG 字母图标。

### 自动颜色

根据域名哈希生成确定性颜色，同一域名每次返回相同颜色。

```bash
curl https://webmeta.pages.dev/example.com
```

```json
{
  "url": "http://example.com",
  "title": "",
  "description": "",
  "icon": "data:image/svg+xml,%3Csvg%20xmlns%3D...fill%3D%22hsl(140%2C%2065%25%2C%2050%25)%22...%3E"
}
```

### 自定义颜色

```bash
# 十六进制（需 URL 编码 # 为 %23）
curl "https://webmeta.pages.dev/example.com?color=%23ff5733"

# 颜色名称
curl "https://webmeta.pages.dev/example.com?color=blue"

# HSL
curl "https://webmeta.pages.dev/example.com?color=hsl(270%2C%2065%25%2C%2050%25)"
```

### 在 HTML 中使用

```html
<img src="https://webmeta.pages.dev/google.com?meta=icon&format=text" alt="icon">
<img src="https://webmeta.pages.dev/example.com?meta=icon&format=text&color=%23ff5733" alt="icon">
```

## 缓存

```bash
# 第一次请求 → 抓取并缓存
curl -I https://webmeta.pages.dev/https://example.com
# 响应头: X-Cache: MISS

# 第二次请求 → 从边缘缓存返回
curl -I https://webmeta.pages.dev/https://example.com
# 响应头: X-Cache: HIT
```

- 缓存有效期：**1 小时**
- 仅缓存 **200 成功响应**，错误响应不缓存
- 缓存键包含 `url + meta + format + color`，不同参数组合分别缓存

## JavaScript 调用

```js
// 获取全部元数据
const res = await fetch('https://webmeta.pages.dev/https://example.com')
const data = await res.json()
console.log(data.title, data.description, data.icon)

// 获取标题（纯文本）
const title = await fetch(
  'https://webmeta.pages.dev/?url=https://example.com&meta=title&format=text'
).then(r => r.text())

// 获取带自定义颜色的图标
const icon = await fetch(
  'https://webmeta.pages.dev/?url=https://example.com&meta=icon&format=text&color=%23ff5733'
).then(r => r.text())

document.querySelector('img').src = icon
```
````_
