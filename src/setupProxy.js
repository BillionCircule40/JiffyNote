// Dev-server only: forwards /api to the backend when REACT_APP_API_URL=/api.
// This replaces the "proxy" field in package.json, which crashed `npm start` on
// machines where Create React App can't find a LAN address
// ("options.allowedHosts[0] should be a non-empty string").
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  app.use('/api', createProxyMiddleware({ target: 'http://localhost:8080', changeOrigin: true }));
};
