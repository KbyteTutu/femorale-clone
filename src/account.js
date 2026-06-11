const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, '..', 'views', 'myaccount.html');

function createAccountHandler() {
  return function accountHandler(_request, response) {
    const template = fs.readFileSync(templatePath, 'utf8');
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.send(template);
  };
}

module.exports = {
  createAccountHandler
};
