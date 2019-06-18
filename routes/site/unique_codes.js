const ideaMw            = require('../middleware/idea');
const siteMw            = require('../middleware/site');

const userClientApi     = require('../services/userClientApi');
const siteApi           = require('../services/siteApi');

const apiUrl = process.env.API_URL;
const appUrl = process.env.APP_URL;
const siteId = process.env.SITE_ID;


module.exports = function(app){
  app.get('/admin/site/:siteId/unique-codes',
    siteMw.withOne,
    (req, res) => {
      res.render('site/idea/unique-codes.html');
    }
  });

  app.get('/admin/site/:siteId/unique-code',
    siteMw.withOne,
    (req, res) => {
      res.render('site/unique-code-form.html');
    }
  });


}
