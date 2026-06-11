const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'config.json');

function readConfig() {
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function writeConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

function createAdminHandler() {
  return function adminHandler(request, response) {
    if (request.method === 'POST') {
      const { priceCoefficient, orderItems } = request.body;

      if (priceCoefficient == null || !Array.isArray(orderItems)) {
        response.status(400).json({ error: 'Missing priceCoefficient or orderItems' });
        return;
      }

      const coefficient = Number(priceCoefficient);
      if (!Number.isFinite(coefficient) || coefficient <= 0) {
        response.status(400).json({ error: 'Invalid priceCoefficient' });
        return;
      }

      const items = orderItems.map((item) => ({
        name: String(item.name || ''),
        description: String(item.description || ''),
        price: Number(item.price) || 0
      }));

      const config = readConfig();
      config.priceCoefficient = coefficient;
      config.orderItems = items;
      writeConfig(config);

      response.json({ ok: true });
      return;
    }

    const config = readConfig();
    const page = fs.readFileSync(
      path.join(__dirname, '..', 'views', 'likui.html'),
      'utf8'
    );

    const injected = page.replace(
      '{{config}}',
      JSON.stringify({
        priceCoefficient: config.priceCoefficient,
        orderItems: config.orderItems
      })
    );

    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.send(injected);
  };
}

module.exports = { createAdminHandler };
