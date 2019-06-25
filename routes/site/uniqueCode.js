const { csvParser }     = require('json2csv');
const siteMw            = require('../../middleware/site');
const uniqueCodeMw      = require('../../middleware/uniqueCode');
const uniqueCodeApi     = require('../../services/uniqueCodeApi');
const maxCodesAllowed   = 10000;


module.exports = function(app){
  app.get('/admin/site/:siteId/unique-codes',
    siteMw.withOne,
    siteMw.addAuthClientId,
    uniqueCodeMw.withAllForClient,
    (req, res) => { res.render('site/idea/unique-codes.html'); }
  );

  app.get('/admin/site/:siteId/unique-code',
    siteMw.withOne,
    (req, res) => { res.render('site/unique-code-form.html'); }
  );

  app.post('/admin/site/:siteId/unique-code/bulk',
    siteMw.withOne,
    siteMw.addAuthClientId,
    (req, res) => {
      const promises = [];
      const amountOfCodes = req.body.amountOfCodes;

      // For performance reasons don't allow above certain nr
      if (amountOfCodes > maxCodesAllowed) {
        throw new Error('Trying to make too many unique codes');
      }

      // make a promise for every code to be created
      for (let i = 0; i < amountOfCodes; i++) {
        promises.push(uniqueCodeApi.create(req.session.jwt, req.authclientId, data));
      };

      /**
       * Execute all promises
       */
      Promise.all(promises)
        .then(function (response) {
          req.flash('success', { msg: 'Codes aangemakt!'});
          res.redirect(`/admin/site/${req.params.siteId}/ideas`);
          res.redirect(redirectTo);
        })
        .catch(function (err) {
          req.flash('error', { msg: 'Er gaat iets mis!'});
          res.redirect(req.header('Referer')  || appUrl);
        });
    }
  );


  app.get('/admin/site/:siteId/unique-code/export',
    siteMw.withOne,
    siteMw.addAuthClientId,
    uniqueCodeMw.withAllForClient,
    (req, res, next) => {
      const csvString = csvParser(req.uniqueCodes);
      const filename = `codes-${req.params.siteId}-${new Date().getTime()}.csv`;
      res.setHeader(`Content-disposition`, `attachment; filename=${filename}`);
      res.set('Content-Type', 'text/csv');
      res.status(200).send(csvString);
    })
    ;

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
  );
}
