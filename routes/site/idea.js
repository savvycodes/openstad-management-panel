const Promise           = require("bluebird");
const multer            = require('multer');
const upload            = multer();
const ideaMw            = require('../../middleware/idea');
const siteMw            = require('../../middleware/site');
const ideaApi           = require('../../services/ideaApi');
const csvToObject       = require('../../utils/csvToObject');
const pick              = require('../../utils/pick');
const ideaFields        = [{key: 'title'}, {key: 'description'}, {key: 'summary'}, {key: 'location'}, {key: 'thema', extraData: true}, {key: 'area', extraData: true}, {key: 'images', extraData: true}, {key: 'status'}];

const apiUrl = process.env.API_URL;
const appUrl = process.env.APP_URL;
const siteId = process.env.SITE_ID;

module.exports = function(app){
  /**
   * Display Idea edit form
   */
  app.get('/admin/site/:siteId/idea/:ideaId',
    ideaMw.oneForSite,
    siteMw.withOne,
    (req, res) => {
      res.render('site/idea/form.html');
    }
  );

  /**
   * Display Ideas import form
   */
  app.get('/admin/site/:siteId/idea/import',
    siteMw.withOne,
    (req, res) => {
      res.render('site/idea/import.html');
    }
  );

  app.post('/admin/site/:siteId/idea/import',
    siteMw.withOne,
    upload.single('file'),
    (req, res) => {
      const csvString = req.file.buffer.toString('utf8');
      const lines = csvToObject(csvString);
      const promises = [];

      /**
       * Create a promise to create an idea
       */
      lines.forEach((line) => {
        //format image from string to array
        line.images = line.images ? line.images.split(',') : [];
        //format location from 2 strings to 1 object
        //
        if (line.location_lat && line.location_long) {
          line.location = {"type":"Point","coordinates":[line.location_lat, line.location_long]};
        }

        const data = pick(line, ideaFields.filter(field => !field.extraData).map(field => field.key));
        data.extraData = pick(line, ideaFields.filter(field => field.extraData).map(field => field.key));
        promises.push(ideaApi.create(req.session.jwt, req.params.siteId, data));
      });

      /**
       * Import all promises
       */
      Promise.all(promises)
        .then(function (response) {
          req.flash('success', { msg: 'Geimporteerd!'});
          res.redirect(`/admin/site/${req.params.siteId}/ideas`);
          res.redirect(redirectTo);
        })
        .catch(function (err) {
          req.flash('error', { msg: 'Er gaat iets mis!'});
          res.redirect(req.header('Referer')  || appUrl);
        });
    }
  );

  app.post('/admin/site/:siteId/idea/:ideaId',
    ideaMw.oneForSite,
    siteMw.withOne,
    (req, res, next) => {
      const data = pick(req.body, ideaFields.filter(field => !field.extraData).map(field => field.key));
      data.extraData = pick(req.body, ideaFields.filter(field => field.extraData).map(field => field.key));

      ideaApi
        .update(req.session.jwt, data)
        .then(function (response) {
           const redirectTo = req.header('Referer')  || appUrl
           res.redirect(redirectTo);
        })
        .catch(function (err) {
           res.redirect(req.header('Referer')  || appUrl);
        });
    }
  );

  app.post('/admin/site/:siteId/idea/:ideaId/delete',
    (req, res, next) => {
      ideaApi.delete(req.session.jwt, req.params.siteId, req.params.ideaId)
        .then(function (response) {
           res.redirect(`/admin/site/${req.params.siteId}/ideas`);
        })
        .catch(function (err) {
           res.redirect(req.header('Referer'));
        });
    }
  );

  app.post('/admin/site/:siteId/idea',
    ideaMw.oneForSite,
    siteMw.withOne,
    (req, res, next) => {
      const data = pick(req.body, ideaFields.filter(field => !field.extraData).map(field => field.key));
      data.extraData = pick(req.body, ideaFields.filter(field => field.extraData).map(field => field.key));

      ideaApi
        .create(req.session.jwt, data)
        .then(function (response) {
           req.flash('success', { msg: 'Aangemaakt!'});
           res.redirect(`/admin/site/${req.params.siteId}/ideas`);
           res.redirect(redirectTo);
        })
        .catch(function (err) {
          req.flash('error', { msg: 'Er gaat iets mis!'});
          res.redirect(req.header('Referer')  || appUrl);
        });
    }
  );

  app.get('/admin/site/:siteId/idea/:ideaId',
    ideaMw.oneForSite,
    siteMw.withOne,
    (req, res) => {
      res.render('site/'+ req.params.page + '.html');
    }
  );
}
