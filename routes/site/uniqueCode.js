const { Parser }     = require('json2csv');
const siteMw            = require('../../middleware/site');
const uniqueCodeMw      = require('../../middleware/uniqueCode');
const uniqueCodeApi     = require('../../services/uniqueCodeApi');
const maxCodesAllowed   = 10000;

module.exports = function(app){
  app.get('/admin/site/:siteId/unique-codes',
    siteMw.withOne,
    siteMw.addAuthClientId,
    uniqueCodeMw.withAllForClient,
    (req, res) => { res.render('site/unique-codes.html'); }
  );

  app.get('/admin/site/:siteId/unique-code',
    siteMw.withOne,
    (req, res) => { res.render('site/unique-code-form.html'); }
  );

  app.post('/admin/site/:siteId/unique-codes/bulk',
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
        promises.push(uniqueCodeApi.create({clientId: req.authClientId}));
      };

      /**
       * Execute all promises
       */
      Promise.all(promises)
        .then(function (response) {
          console.log('response', response);
          req.flash('success', { msg: 'Codes aangemakt!'});
          res.redirect(req.header('Referer')  || appUrl);
        })
        .catch(function (err) {
          req.flash('error', { msg: 'Er gaat iets mis!'});
          res.redirect(req.header('Referer')  || appUrl);
        });
    }
  );


  app.get('/admin/site/:siteId/unique-codes/export',
    siteMw.withOne,
    siteMw.addAuthClientId,
    uniqueCodeMw.withAllForClient,
    (req, res, next) => {
      const json2csvParser = new Parser(Object.keys(req.uniqueCodes[0]));
      const csvString = json2csvParser.parse(req.uniqueCodes);

    //  const csvString = csvParser(req.uniqueCodes);
      const filename = `codes-${req.params.siteId}-${new Date().getTime()}.csv`;
      res.setHeader(`Content-disposition`, `attachment; filename=${filename}`);
      res.set('Content-Type', 'text/csv');
      res.status(200).send(csvString);
    })
    ;

  app.get('/admin/site/:siteId/unique-code/delete/:uniqueCodeId',
    siteMw.withOne,
    (req, res) => {
      uniqueCodeApi
        .delete(req.params.uniqueCodeId)
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
