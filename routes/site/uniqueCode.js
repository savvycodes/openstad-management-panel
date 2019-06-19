const siteMw            = require('../middleware/site');
const userClient        = require('../middleware/userClient');
const uniqueCodeApi     = require('../middleware/uniqueCode');

const uniqueCodeApi     = require('../services/uniqueCodeApi');
const maxCodesAllowed   = 10000
;
module.exports = function(app){
  app.get('/admin/site/:siteId/unique-codes',
    siteMw.withOne,
    userClientMw.withOne,
    uniqueCodeApi.allForSite,
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

  app.post('/admin/site/:siteId/unique-code/bulk',
    siteMw.withOne,
    (req, res) => {
      const promises = [];
      const amountOfCodes = req.body.amountOfCodes;

      if (amountOfCodes > maxCodesAllowed) {
        throw new Error('Trying to make too many Unique codes');
      }

      let i = 0;

      for(amountOfCodes; i < ; i++) {
        promises.push(uniqueCodeApi.create(req.session.jwt, req.params.siteId, data));
      };

      /**
       * Import all promises
       */
      Promise.all(promises)
        .then(function (response) {
          req.flash('success', { msg: 'Aangemakt!'});
          res.redirect(`/admin/site/${req.params.siteId}/ideas`);
          res.redirect(redirectTo);
        })
        .catch(function (err) {
          req.flash('error', { msg: 'Er gaat iets mis!'});
          res.redirect(req.header('Referer')  || appUrl);
        });
    }
  });

  app.post('/admin/site/:siteId/delete/unique-code/:uniqueCodeId',
    siteMw.withOne,
    (req, res) => {
      uniqueCodeApi
        .delete(req.session.jwt, req.params.uniqueCodeId)
        .then(() => {
          req.flash('success', { msg: ''});
          res.redirect(req.header('Referer')  || appUrl);
        })
        .catch((err) => {
          req.flash('error', { msg: 'Er gaat iets mis!'});
          res.redirect(req.header('Referer')  || appUrl);
        });
    }
  });


}
