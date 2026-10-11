export default {
  async fetch(req) {
    const { searchParams } = new URL(req.url)
    const url = searchParams.get('url')
    const format = searchParams.get('format') || 'json'
    const meta = searchParams.get('meta') || 'all'

    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      })

    if (!url) {
      return json({ error: 'Missing URL parameter' }, 400)
    }

    try {
      const headResponse = await fetch(url, { method: 'HEAD' })
      const contentType = headResponse.headers.get('content-type') || ''

      if (!contentType.includes('text/html')) {
        return json({ error: 'URL does not point to an HTML document', contentType }, 400)
      }

      const response = await fetch(url)
      const html = await response.text()

      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
      const title = titleMatch ? titleMatch[1].trim() : ''

      const descriptionMatch =
        html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
        html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["']/i)
      const description = descriptionMatch ? descriptionMatch[1].trim() : ''

      const iconMatch =
        html.match(/<link[^>]*rel=["']icon["'][^>]*href=["']([^"']*)["']/i) ||
        html.match(/<link[^>]*rel=["']shortcut icon["'][^>]*href=["']([^"']*)["']/i) ||
        html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']*)["']/i) ||
        html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']icon["']/i) ||
        html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']shortcut icon["']/i) ||
        html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']apple-touch-icon["']/i)
      const icon = iconMatch ? iconMatch[1].trim() : ''

      const absoluteIcon = icon?.startsWith('http') ? icon : new URL(icon || '', url).href

      const result = { url, title, description, icon: absoluteIcon }

      const validMeta = ['all', 'title', 'description', 'icon', 'url']
      if (!validMeta.includes(meta)) {
        return json({ error: `Invalid meta parameter. Valid values: ${validMeta.join(', ')}` }, 400)
      }

      const singleValue =
        meta === 'all' ? null : result[meta] !== undefined ? String(result[meta]) : ''

      if (format === 'text') {
        const body = meta === 'all' ? JSON.stringify(result, null, 2) : singleValue
        return new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      }

      if (meta === 'all') return json(result)

      return json({ [meta]: singleValue })
    } catch (err) {
      return json({ error: 'Failed to fetch or parse the webpage', detail: String(err) }, 500)
    }
  },
}
