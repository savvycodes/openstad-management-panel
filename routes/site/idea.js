const Promise           = require("bluebird");
const multer            = require('multer');
const upload            = multer();
const { Parser }          = require('json2csv');

const ideaMw            = require('../../middleware/idea');
const siteMw            = require('../../middleware/site');
const ideaApi           = require('../../services/ideaApi');
const csvToObject       = require('../../utils/csvToObject');
const pick              = require('../../utils/pick');
const ideaFields        = [{key: 'title'}, {key: 'description'}, {key: 'summary'}, {key: 'location'}, {key: 'theme', extraData: true}, {key: 'area', extraData: true}, {key: 'images', extraData: true}, {key: 'status'}, {key: 'advice', extraData: true}, {key: 'ranking', extraData: true}, {key: 'originalId', extraData: true}, {key: 'budget', extraData: true, type:"number"}];

const apiUrl = process.env.API_URL;
const appUrl = process.env.APP_URL;
const siteId = process.env.SITE_ID;

module.exports = function(app){
  /**
   * Display Ideas import form
   */
  app.get('/admin/site/:siteId/idea/import',
    siteMw.withOne,
    (req, res) => {
      res.render('site/idea/import.html');
    }
  );

  app.get('/admin/site/:siteId/idea/export',
    siteMw.withOne,
    ideaMw.allForSite,
    (req, res, next) => {
      if (req.ideas.length === 0) {
        req.flash('error', { msg: 'No ideas to export'});
        res.redirect(req.header('Referer'));
      } else {
        const exportHeaders = [
          {key: 'id', label: 'ID'},
          {key: 'title', label: 'Title'},
          {key: 'summary', label: 'Summary'},
          {key: 'description', label: 'Description'},
          {key: 'originalId', label: 'Original idea ID', 'extraData': true},
          {key: 'area', label: 'Area', 'extraData': true},
          {key: 'theme', label: 'Theme', 'extraData': true},
          {key: 'advice', label: 'Advice', 'extraData': true},
          {key: 'budget', label: 'Budget', 'extraData': true},
          {key: 'ranking', label: 'Ranking', 'extraData': true},
          {key: 'images', label: 'Images', 'extraData': true},
          {key: 'modBreak', label: 'Modbreak'},
          {key: 'firstName', label: 'First name', userData: true},
          {key: 'lastName', label: 'Last name', userData: true},
          {key: 'email', label: 'email', userData: true},
          {key: 'yes', label: 'Votes for'},
          {key: 'no', label: 'Votes against'},
        ];

        const formattedIdeas = req.ideas ? req.ideas.map((idea) => {
          const formattedIdea = {};
          exportHeaders.forEach((header) => {
            if (header.userData) {
              formattedIdea[header.key] = idea.user && idea.user[header.key] ? idea.user[header.key] : '';
            } else {
              formattedIdea[header.key] = header.extraData &&  idea.extraData ? idea.extraData[header.key] : idea[header.key];
            }
          });

          return formattedIdea;
        }) : [];

        const json2csvParser = new Parser(exportHeaders.map((header) => header.label));
        const csvString = json2csvParser.parse(formattedIdeas);

      //  const csvString = csvParser(req.uniqueCodes);
        const filename = `ideas-${req.params.siteId}-${new Date().getTime()}.csv`;
        res.setHeader(`Content-disposition`, `attachment; filename=${filename}`);
        res.set('Content-Type', 'text/csv');
        res.status(200).send(csvString);
      }
  });

  /**
   * Display Idea edit form
   */
  app.get('/admin/site/:siteId/idea/:ideaId',
    ideaMw.oneForSite,
    siteMw.withOne,
    (req, res) => {
      res.render('site/idea/edit.html');
    }
  );


  app.post('/admin/site/:siteId/idea/import',
    siteMw.withOne,
    upload.single('import_file'),
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
          line.location = JSON.stringify({"type":"Point","coordinates":[line.location_lat, line.location_long]});
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
    //      res.redirect(redirectTo);
        })
        .catch(function (err) {
          let message = err && err.error && err.error.message ?  'Er gaat iets mis: '+ err.error.message : 'Er gaat iets mis!';
          req.flash('error', { msg: message});
          res.redirect(req.header('Referer')  || appUrl);
        });
    }
  );

  app.post('/admin/site/:siteId/idea/:ideaId',
    siteMw.withOne,
    ideaMw.oneForSite,
    (req, res, next) => {
      const idea = req.idea ? req.idea : {};

      ideaFields.forEach((field) => {
        if (req.body && req.body[field.key]) {
          let value = req.body[field.key];

          //in case of a number, parse it to int
          if (field.type && field.type === 'number') {
            value = parseInt(value, 10);
          }

          //check if field should be saved to extraData or own column
          if (field.extraData) {
            if(!idea.extraData) {
              idea.extraData = {};
            }

            idea.extraData[field.key] = value;
          } else {
            idea[field.key] = value;
          }
        }
      });

      ideaApi
        .update(req.session.jwt, req.site.id, idea )
        .then(function (response) {
           const redirectTo = req.header('Referer')  || appUrl
           res.redirect(redirectTo);
        })
        .catch(function (err) {
           let message = err && err.error && err.error.message ?  'Er gaat iets mis: '+ err.error.message : 'Er gaat iets mis!';
           req.flash('error', { msg: message});
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
      const idea = req.idea ? req.idea : {};

      ideaFields.forEach((field) => {
        if (req.body && req.body[field.key]) {
          let value = req.body[field.key];

          if (field.type && field.type === 'number') {
            value = parseInt(value, 10);
          }

          if (field.extraData) {
            if(!idea.extraData) {
              idea.extraData = {};
            }

            idea.extraData[field.key] = value;
          } else {
            idea[field.key] = value;
          }
        }
      });

      ideaApi
        .create(req.session.jwt, req.params.siteId, idea)
        .then(function (response) {
           req.flash('success', { msg: 'Aangemaakt!'});
           res.redirect(`/admin/site/${req.params.siteId}/ideas`);
           res.redirect(redirectTo);
        })
        .catch(function (err) {
          let message = err && err.error && err.error.message ?  'Er gaat iets mis: '+ err.error.message : 'Er gaat iets mis!';
          req.flash('error', { msg: message});
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
