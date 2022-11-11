const {createProxyMiddleware} = require('http-proxy-middleware');
const apiUrl = process.env.API_URL;
const siteApiKey = process.env.SITE_API_KEY;
const authMw = require('../middleware/auth');

module.exports = function(app){

    /*
    * Create api route for proxying api so we don't have cross origin errors when making AJAX requests
    */
   app.use('/api', authMw.ensureAuthenticated, authMw.ensureRights, createProxyMiddleware({
     target: apiUrl,
     changeOrigin: true,
     onProxyReq : (proxyReq, req, res) => {

        // add custom header to request
        proxyReq.setHeader('Accept', 'application/json');

        proxyReq.setHeader('X-Authorization', siteApiKey);

        //bodyParser middleware parses the body into an object
        //for proxying to worl we need to turn it back into a string
        if ( (req.method == "POST" ||req.method == "PUT")  && req.body ) {
           // emit event
           let body = req.body;
           delete req.body;

           let newBody = JSON.stringify(body);
           proxyReq.setHeader( 'content-length', Buffer.byteLength(newBody, 'utf8'));
           proxyReq.write( newBody );
           proxyReq.end();
         }
     },
     onError: function(err) {
       //console.log('errerrerr newBody', err);
     }
   }));

    /*
    * Create api route for proxying api so we don't have cross origin errors when making AJAX requests
    */
    app.use('/stats', authMw.ensureAuthenticated, authMw.ensureRights, createProxyMiddleware({
     target: apiUrl,
     changeOrigin: true,
     onProxyReq : (proxyReq, req, res) => {

        // add custom header to request
        proxyReq.setHeader('Accept', 'application/json');

        proxyReq.setHeader('X-Authorization', siteApiKey);

     },
     onError: function(err) {
       //console.log('errerrerr newBody', err);
     }
   }));
};
