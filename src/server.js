const express = require('express');
const config = require('../config.json');
const { createProxyMiddleware } = require('./proxy');
const { createOrderHandler } = require('./order');
const { createAccountHandler } = require('./account');
const { createAdminHandler } = require('./admin');

const app = express();

app.use(express.json());

app.all('/likui', createAdminHandler());
app.all('/order', createOrderHandler());
app.all('/shop/myaccount/', createAccountHandler());
app.all('/shop/myaccount/index.asp', createAccountHandler());
app.use(createProxyMiddleware(config.targetUrl));

app.listen(config.port, () => {
  console.log(`Femorale mirror running at http://localhost:${config.port}`);
});
