export default async function handler(req, res) {
  const backendUrl = process.env.BACKEND_URL || process.env.VITE_API_BASE_URL || '';

  if (!backendUrl) {
    res.status(500).json({
      message: 'BACKEND_URL is not configured. Set it in Vercel Environment Variables.'
    });
    return;
  }

  const requestUrl = new URL(req.url, `https://${req.headers.host}`);
  const targetPath = requestUrl.pathname.replace(/^\/api/, '');
  const targetUrl = new URL(`${backendUrl.replace(/\/+$/, '')}${targetPath}${requestUrl.search}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') {
      headers.set(key, value);
    } else if (Array.isArray(value)) {
      headers.set(key, value.join(','));
    }
  }

  headers.delete('host');
  headers.set('x-forwarded-host', req.headers.host || '');

  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
  });

  const responseBody = await response.text();
  const contentType = response.headers.get('content-type') || 'application/json';

  res.status(response.status);
  res.setHeader('content-type', contentType);
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('access-control-allow-headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (responseBody) {
    res.send(responseBody);
  } else {
    res.end();
  }
}
