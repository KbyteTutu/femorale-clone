const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, '..', 'views', 'order.html');
const configPath = path.join(__dirname, '..', 'config.json');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(value) {
  const numericValue = Number.parseFloat(String(value).replace(/[$,\s]/g, ''));
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
  return `$${safeValue.toFixed(2)}`;
}

function renderItems(items) {
  return items
    .map((item) => {
      const price = Number(item.price) || 0;
      const imageMarkup = item.image
        ? `<div class="item-image"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}"></div>`
        : '';

      return `
        <tr>
          <td>
            <div class="item-name">${escapeHtml(item.name)}</div>
            ${imageMarkup}
          </td>
          <td>${escapeHtml(item.description || '')}</td>
          <td class="price">${formatCurrency(price)}</td>
          <td class="qty">1</td>
          <td class="price">${formatCurrency(price)}</td>
        </tr>
      `;
    })
    .join('');
}

function createOrderHandler() {
  return function orderHandler(_request, response) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const template = fs.readFileSync(templatePath, 'utf8');
    const items = Array.isArray(config.orderItems) ? config.orderItems : [];
    const total = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

    const html = template
      .replace('{{items}}', () => renderItems(items))
      .replace(/{{total}}/g, () => formatCurrency(total));

    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.send(html);
  };
}

module.exports = {
  createOrderHandler
};
