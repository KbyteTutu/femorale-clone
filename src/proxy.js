const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { transformHtml, rewriteCssUrls } = require('./transform');

const configPath = path.join(__dirname, '..', 'config.json');

function copyHeaders(upstreamHeaders, response) {
  upstreamHeaders.forEach((value, key) => {
    const lowerKey = key.toLowerCase();

    if (lowerKey === 'content-length' || lowerKey === 'content-encoding') {
      return;
    }

    response.setHeader(key, value);
  });
}

function createTargetUrl(targetUrl, request) {
  const requestPath = `${request.originalUrl || request.url}`;
  return new URL(requestPath, targetUrl).toString();
}

function createProxyMiddleware(targetUrl) {
  return async function proxyMiddleware(request, response) {
    const upstreamUrl = createTargetUrl(targetUrl, request);
    const hasBody = !['GET', 'HEAD'].includes(request.method.toUpperCase());

    try {
      let requestBody;

      if (hasBody) {
        requestBody = await new Promise((resolve, reject) => {
          const chunks = [];

          request.on('data', (chunk) => chunks.push(chunk));
          request.on('end', () => resolve(Buffer.concat(chunks)));
          request.on('error', reject);
        });
      }

      const upstreamResponse = await fetch(upstreamUrl, {
        method: request.method,
        headers: Object.fromEntries(
          Object.entries({
            'user-agent': request.get('user-agent') || 'Mozilla/5.0 (compatible; FemoraleMirror/1.0)',
            'accept': request.get('accept') || '*/*',
            'accept-language': request.get('accept-language') || 'en-US,en;q=0.9',
            'referer': targetUrl,
            'content-type': request.get('content-type') || undefined,
            'cookie': request.get('cookie') || undefined
          }).filter(([, value]) => value !== undefined)
        ),
        body: hasBody ? requestBody : undefined,
        redirect: 'manual'
      });

      const contentType = upstreamResponse.headers.get('content-type') || '';
      copyHeaders(upstreamResponse.headers, response);
      response.status(upstreamResponse.status);

      if (/text\/html/i.test(contentType)) {
        const body = await upstreamResponse.text();
        const { priceCoefficient } = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const transformed = transformHtml(body, upstreamUrl, priceCoefficient);
        response.send(transformed);
        return;
      }

      if (/text\/css/i.test(contentType)) {
        const body = await upstreamResponse.text();
        response.send(rewriteCssUrls(body, upstreamUrl));
        return;
      }

      const buffer = await upstreamResponse.buffer();
      response.send(buffer);
    } catch (error) {
      response.status(502).send(`Upstream fetch failed: ${error.message}`);
    }
  };
}

module.exports = {
  createProxyMiddleware
};
