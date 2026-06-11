const cheerio = require('cheerio');

const PRICE_PATTERN = /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/g;
// thumbpage.asp uses schema.org markup: $<span itemprop="price">12.00</span>
const SCHEMA_PRICE_PATTERN = /\$<span\s+[^>]*itemprop="price"[^>]*>(\d+(?:\.\d+)?)<\/span>/gi;
// Rewrite to absolute femorale.com so CSS/JS/images actually load
const RESOURCE_ATTRS = ['src', 'background', 'poster'];
// Keep relative so navigation stays within the mirror proxy
const NAV_ATTRS = ['href', 'action'];

function formatPrice(value) {
  const adjusted = Math.max(value, 0.01);
  return `$${adjusted.toFixed(2)}`;
}

function transformDollarPrices(text, coefficient) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  return text.replace(PRICE_PATTERN, (_, rawNumber) => {
    const numericValue = Number.parseFloat(rawNumber.replace(/,/g, ''));

    if (Number.isNaN(numericValue)) {
      return `$${rawNumber}`;
    }

    return formatPrice(numericValue * coefficient);
  });
}

function isAbsoluteUrl(url) {
  return /^(?:[a-z]+:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('mailto:') || url.startsWith('javascript:') || url.startsWith('#');
}

function stripTargetDomain(value, targetUrl) {
  if (!value) return value;
  const prefix = targetUrl.replace(/\/+$/, '');
  if (value.startsWith(prefix)) {
    return value.slice(prefix.length) || '/';
  }
  return value;
}

function resolveUrl(value, baseUrl) {
  if (!value) {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed || isAbsoluteUrl(trimmed)) {
    return value;
  }

  try {
    return new URL(trimmed, baseUrl).toString();
  } catch (error) {
    return value;
  }
}

function rewriteCssUrls(cssText, baseUrl) {
  if (!cssText || typeof cssText !== 'string') {
    return cssText;
  }

  return cssText.replace(/url\(([^)]+)\)/gi, (match, rawUrl) => {
    const quote = rawUrl.trim().match(/^['"]/);
    const cleaned = rawUrl.trim().replace(/^['"]|['"]$/g, '');
    const resolved = resolveUrl(cleaned, baseUrl);

    if (resolved === cleaned) {
      return match;
    }

    const wrapper = quote ? quote[0] : '';
    return `url(${wrapper}${resolved}${wrapper})`;
  });
}

function rewriteSrcset(srcset, baseUrl) {
  if (!srcset || typeof srcset !== 'string') {
    return srcset;
  }

  return srcset
    .split(',')
    .map((entry) => {
      const trimmed = entry.trim();
      if (!trimmed) {
        return trimmed;
      }

      const parts = trimmed.split(/\s+/);
      const originalUrl = parts.shift();
      const rewrittenUrl = resolveUrl(originalUrl, baseUrl);
      return [rewrittenUrl, ...parts].join(' ');
    })
    .join(', ');
}

function rewriteAttributes($, baseUrl, targetUrl) {
  RESOURCE_ATTRS.forEach((attribute) => {
    $(`[${attribute}]`).each((_, element) => {
      const currentValue = $(element).attr(attribute);
      $(element).attr(attribute, resolveUrl(currentValue, baseUrl));
    });
  });

  NAV_ATTRS.forEach((attribute) => {
    $(`[${attribute}]`).each((_, element) => {
      const currentValue = $(element).attr(attribute);
      $(element).attr(attribute, stripTargetDomain(currentValue, targetUrl));
    });
  });

  $('[srcset]').each((_, element) => {
    const currentValue = $(element).attr('srcset');
    $(element).attr('srcset', rewriteSrcset(currentValue, baseUrl));
  });

  $('[style]').each((_, element) => {
    const currentValue = $(element).attr('style');
    $(element).attr('style', rewriteCssUrls(currentValue, baseUrl));
  });

  $('style').each((_, element) => {
    const currentValue = $(element).html();
    $(element).html(rewriteCssUrls(currentValue, baseUrl));
  });
}

function transformHtml(html, pageUrl, coefficient) {
  // Pass 1: transform plain text prices on raw HTML ($12.00, $1 to $10, etc.)
  // This does NOT match schema.org patterns because $ is followed by < not digits
  let processed = transformDollarPrices(html, coefficient);

  // Pass 2: transform schema.org microdata prices ($<span itemprop="price">12.00</span>)
  processed = processed.replace(SCHEMA_PRICE_PATTERN, (_, rawNumber) => {
    const numericValue = parseFloat(rawNumber);
    if (isNaN(numericValue)) return _;
    return formatPrice(numericValue * coefficient);
  });

  // Pass 3: cheerio for URL rewriting only
  const $ = cheerio.load(processed, {
    decodeEntities: false,
    scriptingEnabled: false
  });

  const targetOrigin = new URL(pageUrl).origin;
  rewriteAttributes($, pageUrl, targetOrigin);

  // Transform prices in script/style tags
  $('script').each((_, element) => {
    const currentValue = $(element).html();
    $(element).html(transformDollarPrices(currentValue, coefficient));
  });

  $('style').each((_, element) => {
    const currentValue = $(element).html();
    const withRewrittenAssets = rewriteCssUrls(currentValue, pageUrl);
    $(element).html(transformDollarPrices(withRewrittenAssets, coefficient));
  });

  return $.html();
}

module.exports = {
  transformDollarPrices,
  resolveUrl,
  rewriteCssUrls,
  rewriteSrcset,
  transformHtml
};
