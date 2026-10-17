const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
}

// 缓存有效期（秒）
const CACHE_TTL = 3600 // 1 小时

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
  })
}

function textResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...CORS_HEADERS },
  })
}

// 根据字符串生成确定性颜色（HSL）
function colorFromString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 65%, 50%)`
}

// 生成 SVG 字母图标，返回 data URL
function generateLetterTile(letter, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="12" fill="${color}"/><text x="32" y="46" font-family="Arial,sans-serif" font-size="36" font-weight="bold" fill="white" text-anchor="middle">${letter}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export default {
  async fetch(request) {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...CORS_HEADERS,
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      })
    }

    const reqUrl = new URL(request.url)
    const path = decodeURIComponent(reqUrl.pathname)
    const searchParams = reqUrl.searchParams

    const format = searchParams.get('format') || 'json'
    const meta = searchParams.get('meta') || 'all'
    const color = searchParams.get('color') || ''
    const letter = searchParams.get('letter') || ''

    // ---- 路由逻辑（替代 vercel.json rewrites）----
    let url = searchParams.get('url')

    if (!url) {
      if (path === '/' || path === '') {
        return jsonResponse({ error: 'Missing URL parameter' }, 400)
      }

      // /https://example.com/page → url = https://example.com/page
      if (path.startsWith('/https://') || path.startsWith('/http://')) {
        url = path.slice(1)
      } else {
        // /example.com/ 或 /example.com → url = http://example.com
        url = 'http://' + path.replace(/^\//, '')
      }
    }

    // 校验 meta 参数
    const validMeta = ['all', 'title', 'description', 'icon', 'url']
    if (!validMeta.includes(meta)) {
      return jsonResponse(
        { error: `Invalid meta parameter. Valid values: ${validMeta.join(', ')}` },
        400,
      )
    }

    // ---- 缓存逻辑 ----
    // 用目标 URL + meta + format + color + letter 生成缓存键
    const cacheKey = new Request(
      `https://cache.local/${meta}/${format}/${encodeURIComponent(url)}/${encodeURIComponent(color)}/${encodeURIComponent(letter)}`,
      { method: 'GET' },
    )
    const cache = caches.default

    // 检查缓存
    const cachedResponse = await cache.match(cacheKey)
    if (cachedResponse) {
      // 返回缓存，添加 X-Cache: HIT 头
      const headers = new Headers(cachedResponse.headers)
      headers.set('X-Cache', 'HIT')
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers,
      })
    }

    try {
      // 先发送 HEAD 请求检查 Content-Type
      let contentType = ''
      try {
        const headResponse = await fetch(url, { method: 'HEAD' })
        contentType = headResponse.headers.get('content-type') || ''
      } catch {
        // 部分服务器不支持 HEAD，跳过检查
      }

      if (contentType && !contentType.includes('text/html')) {
        return jsonResponse(
          { error: 'URL does not point to an HTML document', contentType },
          400,
        )
      }

      // 发送 GET 请求获取 HTML 内容
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MetaAPI/1.0)' },
      })
      const html = await response.text()

      // 提取 title
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
      const title = titleMatch ? titleMatch[1].trim() : ''

      // 提取 description
      const descriptionMatch =
        html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
        html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["']/i)
      const description = descriptionMatch ? descriptionMatch[1].trim() : ''

      // 提取 icon
      const iconMatch =
        html.match(/<link[^>]*rel=["']icon["'][^>]*href=["']([^"']*)["']/i) ||
        html.match(/<link[^>]*rel=["']shortcut icon["'][^>]*href=["']([^"']*)["']/i) ||
        html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']*)["']/i) ||
        html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']icon["']/i) ||
        html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']shortcut icon["']/i) ||
        html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']apple-touch-icon["']/i)
      const icon = iconMatch ? iconMatch[1].trim() : ''

      // 转换为绝对 URL
      let absoluteIcon = ''
      if (icon) {
        absoluteIcon = icon.startsWith('http') ? icon : new URL(icon, url).href
      }

      // 如果没有找到 icon，生成带颜色的 SVG 字母图标
      if (!absoluteIcon) {
        const hostname = new URL(url).hostname
        const mainDomain = hostname.replace(/^www\./, '').split('.')[0]
        // 优先使用 letter 参数，否则取域名首字母
        const tileLetter = letter || (mainDomain ? mainDomain[0].toUpperCase() : '')
        if (tileLetter) {
          // 优先使用自定义颜色，否则根据域名生成确定性颜色
          const tileColor = color || colorFromString(mainDomain)
          absoluteIcon = generateLetterTile(tileLetter, tileColor)
        }
      }

      const result = {
        url,
        title,
        description,
        icon: absoluteIcon,
      }

      // 根据 meta 参数选择输出内容
      const singleValue =
        meta === 'all' ? null : result[meta] !== undefined ? String(result[meta]) : ''

      // 根据 format 参数选择输出格式
      let responseToCache

      if (format === 'text') {
        const body = meta === 'all' ? JSON.stringify(result, null, 2) : singleValue
        responseToCache = textResponse(body)
      } else if (meta === 'all') {
        responseToCache = jsonResponse(result)
      } else {
        responseToCache = jsonResponse({ [meta]: singleValue })
      }

      // 添加缓存头并写入缓存（仅缓存成功响应）
      if (responseToCache.status === 200) {
        const headers = new Headers(responseToCache.headers)
        headers.set('X-Cache', 'MISS')
        headers.set('Cache-Control', `public, max-age=${CACHE_TTL}`)
        const cached = new Response(responseToCache.body, {
          status: responseToCache.status,
          headers,
        })
        // 异步写入缓存，不阻塞响应
        cache.put(cacheKey, cached.clone())
        return cached
      }

      return responseToCache
    } catch (err) {
      return jsonResponse(
        { error: 'Failed to fetch or parse the webpage', detail: String(err) },
        500,
      )
    }
  },
}
