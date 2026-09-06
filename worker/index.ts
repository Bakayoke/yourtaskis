interface Env {
  ASSETS: Fetcher
}

function injectJoinMeta(html: string, code: string, origin: string) {
  const title = `Gå med i Your Task Is — ${code}`
  const description = `Du är inbjuden till ett hemma-Bäst-i-Test. Anslut med koden ${code} på yourtaskis.com.`
  const url = `${origin}/?join=${encodeURIComponent(code)}`
  const ogImage = `${origin}/og.svg`

  const tags = `
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Your Task Is" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${ogImage}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${ogImage}" />`

  return html
    .replace(/<title>[^<]*<\/title>/, tags)
    .replace(/<meta\s+name="description"[^>]*\/?>/, '')
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const join = url.searchParams.get('join')?.toUpperCase().trim()

    const response = await env.ASSETS.fetch(request)
    const type = response.headers.get('content-type') ?? ''

    if (!join || join.length !== 4 || !type.includes('text/html')) {
      return response
    }

    const html = injectJoinMeta(await response.text(), join, url.origin)
    const headers = new Headers(response.headers)
    headers.set('content-type', 'text/html;charset=UTF-8')
    headers.delete('content-length')
    return new Response(html, { status: response.status, headers })
  },
}
