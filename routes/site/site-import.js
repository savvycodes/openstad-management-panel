const fs = require('fs').promises;
const tar = require('tar');
const fetch = require('node-fetch');

const multer            = require('multer');
const upload            = multer();

//middleware
const ideaMw            = require('../../middleware/idea');
const siteMw            = require('../../middleware/site');
const voteMw            = require('../../middleware/vote');
const userClientMw      = require('../../middleware/userClient');

//services
const userClientApi     = require('../../services/userClientApi');
const siteApi           = require('../../services/siteApi');
const ideaApi           = require('../../services/ideaApi');
const choicesGuideApi   = require('../../services/choicesGuideApi');
const exportDb          = require('../../services/mongo').export;
const queryDb           = require('../../services/mongo').query;
const importDb          = require('../../services/mongo').import;

//utils
const pick              = require('../../utils/pick');
//ENV constants
const apiUrl            = process.env.API_URL;
const appUrl            = process.env.APP_URL;
const siteId            = process.env.SITE_ID;
const tmpDir = process.env.TMPDIR || './tmp';

module.exports = function(app){
  /**
   * Show new site form
   */
  app.get('/admin/site-import',
    siteMw.withAll,
    userClientMw.withAll,
    (req, res, next) => {
      res.render('site/import-form.html');
    }
  );

  /**
   * Import
   */
  app.post(
    '/admin/site/import',
    siteMw.withAll,
    userClientMw.withAll,
    upload.single('import_file'),
    (req, res, next) => {
      // prepare
      let id = Math.round(new Date().getTime() / 1000);
      req.import = {
        id,
        dir: tmpDir + '/' + id,
        filename: tmpDir + '/' + id + '/' + req.file.originalname,
        protocol: req.protocol,
        domain: req.body.domain,
      };
      fs.mkdir(req.import.dir)
        .then(res => {
          // write upload
          return fs.writeFile(req.import.filename, req.file.buffer)
        })
        .then(res => next())
        .catch(next)
    },
    (req, res, next) => {
      // untar
      tar.extract(
        {
          cwd: req.import.dir,
          file: req.import.filename,
        })
        .then(next)
        .catch(next)
    },
    (req, res, next) => {
      // read site.json
      fs.readFile(req.import.dir + '/api/site.json')
        .then(data => {
          try {
            req.import.site = JSON.parse(data.toString());
          } catch (err) {
            return next('Site not found');
          }
          return next();
        })
        .catch(next)
    },
    (req, res, next) => {
      // rename
      req.import.dbName = `${req.import.id}${req.import.site.title}`;
      req.import.dbName = req.import.dbName.replace(/ /, '')
      return next()
    },
    (req, res, next) => {
      // oauth
      let oauthConfigs = {};
      return fs.readdir(req.import.dir + '/oauth')
        .then(data => {
          let promises = [];
          data.forEach((filename) => {
            promises.push(
              fs.readFile(req.import.dir + '/oauth/' + filename)
                .then(data => {
                  data = JSON.parse(data);
                  let client = {
                    name: data.name,
                    description: data.description,
                    authTypes: data.authTypes,
                    requiredUserFields: data.requiredUserFields,
                    exposedUserFields: data.exposedUserFields,
                    siteUrl: data.siteUrl.replace(/^https?:\/\/[^\/]+/, req.import.protocol + '://' + req.import.domain),
                    redirectUrl: data.siteUrl.replace(/^https?:\/\/[^\/]+/, req.import.protocol + '://' + req.import.domain),
                    allowedDomains: [
                      req.import.domain,
                      process.env.API_URL.replace(/^https?:\/\//, ''),
                    ],
                    config: data.config,
                  }
                  if ( client.config && client.config.backUrl ) {
                    client.config.backUrl = client.config.backUrl.replace(/^https?:\/\/[^\/]+/, req.import.protocol + '://' + req.import.domain);
                  }
                  let key = filename.replace(/.json$/, '');
                  return userClientApi
                    .create(client)
                    .then(result => {
                      oauthConfigs[key] = {
                        'auth-client-id': result.clientId,
                        'auth-client-secret': result.clientSecret,
                      }
                    });
                })
            )
          });
          return promises;
        })
        .then(promises => {
          return Promise
            .all(promises)
            .then(res => {
              req.import.site.config.oauth = oauthConfigs;
              console.log(req.import.site.config.oauth);
            })
            .then(res => next())
        })
        .catch(next)
    },
    (req, res, next) => {
      return next()
    },
    (req, res, next) => {
      // create mongo db
      importDb(req.import.dbName, req.import.dir + '/mongo')
        .then(next)
        .catch(next)
    },
    (req, res, next) => {
      // cms attachments
      let cmsUrl = 'http://' + ( req.site && req.site.domain );
      fs.readdir(req.import.dir + '/attachments')
        .then(data => {
          data.forEach((entry) => {
            // TODO: uploaden naar cms
          });
          return next()
        })
        .catch(next)
    },
    (req, res, next) => {
      // create site in API
      let siteConfig = req.import.site.config;
      siteConfig.cms.dbName = req.import.dbName;
      siteConfig.allowedDomains.push(req.import.domain); // TODO
      return siteApi
        .create(req.session.jwt, {
          domain: req.import.domain,
          name: req.import.id + req.import.site.title,
          title: req.import.site.title,
          config: siteConfig,
        })
        .then((site) => {
          req.import.site = site;
          return next();
        })
        .catch(next);
    },
    (req, res, next) => {
      // choices-guides
      return fs.readdir(req.import.dir + '/api')
        .then(data => {
          let promises = [];
          data.forEach((filename) => {
            if (filename.match(/^choicesguide-/)) {
              promises.push(
                fs.readFile(req.import.dir + '/api/' + filename)
                  .then(result => {
                    let json = JSON.parse(result);
                    choicesGuideApi
                      .create(req.session.jwt, req.import.site.id, json)
                  })
              )
            }
          });
          return promises;
        })
        .then(promises => {
          return Promise
            .all(promises)
            .then(res => next())
        })
        .catch(next)

    },
    (req, res, next) => {
      // todo: cleanup
      res.redirect('/admin/site/' + req.import.site.id)
    },
  );

}
