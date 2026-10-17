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

# webmeta API 使用示例

## 基本用法

### 1. 获取全部元数据（JSON）

```bash
# 路径方式
curl https://webmeta.pages.dev/https://example.com

# 查询参数方式
curl "https://webmeta.pages.dev/?url=https://example.com"
返回：

{
  "url": "https://example.com",
  "title": "Example Domain",
  "description": "This domain is for use in illustrative examples in documents...",
  "icon": "https://example.com/favicon.ico"
}
2. 获取单个字段
# 仅获取标题
curl "https://webmeta.pages.dev/?url=https://example.com&meta=title"
# → {"title": "Example Domain"}

# 仅获取描述
curl "https://webmeta.pages.dev/?url=https://example.com&meta=description"
# → {"description": "This domain is for use..."}

# 仅获取图标
curl "https://webmeta.pages.dev/?url=https://example.com&meta=icon"
# → {"icon": "https://example.com/favicon.ico"}

# 仅获取 URL
curl "https://webmeta.pages.dev/?url=https://example.com&meta=url"
# → {"url": "https://example.com"}
3. 纯文本输出
# 标题（纯文本）
curl "https://webmeta.pages.dev/?url=https://example.com&meta=title&format=text"
# → Example Domain

# 全部元数据（格式化 JSON 文本）
curl "https://webmeta.pages.dev/?url=https://example.com&format=text"
路径格式
所有以下格式等价：

# 完整 URL（带协议）
curl https://webmeta.pages.dev/https://example.com
curl https://webmeta.pages.dev/http://example.com

# 不带协议（自动补全 http://）
curl https://webmeta.pages.dev/example.com
curl https://webmeta.pages.dev/example.com/

# 带路径
curl https://webmeta.pages.dev/https://example.com/page
彩色字母图标
当网站没有 favicon 时，自动生成 SVG 字母图标。

1. 自动颜色（根据域名哈希）
curl https://webmeta.pages.dev/example.com
返回：

{
  "url": "http://example.com",
  "title": "",
  "description": "",
  "icon": "data:image/svg+xml,%3Csvg%20xmlns%3D...fill%3D%22hsl(140%2C%2065%25%2C%2050%25)%22...%3E"
}
同一域名每次返回相同颜色，不同域名颜色不同。

2. 自定义颜色
# 十六进制颜色（需 URL 编码 # 为 %23）
curl "https://webmeta.pages.dev/example.com?color=%23ff5733"

# 颜色名称
curl "https://webmeta.pages.dev/example.com?color=blue"

# HSL 颜色
curl "https://webmeta.pages.dev/example.com?color=hsl(270%2C%2065%25%2C%2050%25)"
3. 在 HTML 中使用图标
<!-- 有 favicon 时返回真实 URL -->
<img src="https://webmeta.pages.dev/google.com?meta=icon&format=text" alt="icon">

<!-- 无 favicon 时返回 SVG data URL，直接可用 -->
<img src="https://webmeta.pages.dev/example.com?meta=icon&format=text" alt="icon">

<!-- 自定义颜色字母图标 -->
<img src="https://webmeta.pages.dev/example.com?meta=icon&format=text&color=%23ff5733" alt="icon">
缓存
# 第一次请求 → 抓取并缓存
curl -I https://webmeta.pages.dev/https://example.com
# 响应头: X-Cache: MISS

# 第二次请求 → 从边缘缓存返回
curl -I https://webmeta.pages.dev/https://example.com
# 响应头: X-Cache: HIT

# 不同 color 参数分别缓存
curl -I "https://webmeta.pages.dev/example.com?color=%23ff5733"  # X-Cache: MISS
curl -I "https://webmeta.pages.dev/example.com?color=%23ff5733"  # X-Cache: HIT
curl -I "https://webmeta.pages.dev/example.com?color=blue"       # X-Cache: MISS
缓存有效期：1 小时
仅缓存 200 成功响应，错误响应不缓存
缓存键包含 url + meta + format + color，不同参数组合分别缓存
JavaScript 调用示例
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

// 在页面中显示
document.querySelector('img').src = icon
参数速查
参数	默认值	可选值	说明
url	无	目标 URL	也可通过路径传递
meta	all	all title description icon url	返回的字段
format	json	json text	输出格式
color	无	CSS 颜色值	自定义字母图标背景色
