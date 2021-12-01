const imageApiUrl = process.env.IMAGE_API_URL;
const imageApiToken = process.env.IMAGE_API_ACCESS_TOKEN;
const {createProxyMiddleware} = require('http-proxy-middleware');

module.exports = function(app){
  /**
   * Create route for proxying one image to image server, add api token in header
   */

  app.use('/image', createProxyMiddleware({
    target: imageApiUrl,
    changeOrigin: true,
    onProxyReq : (proxyReq, req, res) => {
      // add custom header to request
      proxyReq.setHeader('Authorization', `Bearer ${imageApiToken}`);
    }
  }));

  /**
   * Create route for proxying multiples images to image server, add api token in header
   */
  app.use('/images', createProxyMiddleware({
    target: imageApiUrl,
    changeOrigin: true,
    onProxyReq : (proxyReq, req, res) => {
      // add custom header to request
      proxyReq.setHeader('Authorization', `Bearer ${imageApiToken}`);
    }
  }));
};
