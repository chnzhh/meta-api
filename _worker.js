const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
}

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

      // ★ 新增：如果没有找到 icon，则返回 hostname 大写的首字母
      if (!absoluteIcon) {
        const hostname = new URL(url).hostname
        // 取主域名的第一段（去掉 www. 前缀），返回大写首字母
        const mainDomain = hostname.replace(/^www\./, '').split('.')[0]
        absoluteIcon = mainDomain ? mainDomain[0].toUpperCase() : ''
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
      if (format === 'text') {
        const body = meta === 'all' ? JSON.stringify(result, null, 2) : singleValue
        return textResponse(body)
      }

      // JSON 输出（默认）
      if (meta === 'all') {
        return jsonResponse(result)
      }

      return jsonResponse({ [meta]: singleValue })
    } catch (err) {
      return jsonResponse(
        { error: 'Failed to fetch or parse the webpage', detail: String(err) },
        500,
      )
    }
  },
}
