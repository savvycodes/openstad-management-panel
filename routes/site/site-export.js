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
   * Export
   */
  app.post(
    '/admin/site/:siteId/export',
    siteMw.withOne,
    siteMw.addAuthClientId,
    //Todo: prepareExport
    //Todo: getData from site
    //Todo: write data to file.
    (req, res, next) => {
      // prepare
      console.log('Export prepare');
      let id = Math.round(new Date().getTime() / 1000);
      req.export = {
        id,
        dir: tmpDir + '/' + id,
        filename: tmpDir + '/' + id + '.export.tgz',
        dbName: req.site.config && req.site.config.cms && req.site.config.cms.dbName,
        site: req.site,
      };
      if (!req.export.dbName) return next('site not found');
      fs.mkdir(req.export.dir)
        .then(res => {
          return fs.mkdir(req.export.dir + '/oauth')
        })
        .then(res => {
          return fs.mkdir(req.export.dir + '/attachments')
        })
        .then(res => {
          return fs.mkdir(req.export.dir + '/api')
        })
        .then(res => next())
        .catch(next);
    },
    (req, res, next) => {
      if (!req.body['choices-guide']) return next();
      // choices-guide
      console.log('Export choices-guide');
      let promises = [];
      choicesGuideApi
        .fetchAll(req.session.jwt, req.export.site.id)
        .then(result => {
          result.forEach((choicesGuide) => {
            promises.push(
              choicesGuideApi
                .fetch(req.session.jwt, req.export.site.id, choicesGuide.id)
                .then(result => {
                  let json = JSON.stringify(result);
                  return fs.writeFile(req.export.dir + `/api/choicesguide-${choicesGuide.id}.json`, json)
                })
            )
          });
          return promises;
        })
        .then(promises => {
          return Promise
            .all(promises)
            .then(res => {
              console.log('Gesaved');
            })
            .then(res => next())
        })
        .catch(next);
    },
    (req, res, next) => {
      if (!req.body['cms-attachments']) return next();
      // cms attachments
      console.log('Export cms attachments 1');
      let cmsUrl = 'http://' + ( req.export.site && req.export.site.domain );
      queryDb(req.export.dbName, 'aposDocs').then(result => {
        let files = [];
        result.forEach((entry) => {
          if (  entry.published == true && entry.trash == false)  {
            if (entry.type == 'apostrophe-file' || entry.type == 'apostrophe-image') {
              console.log(entry.attachment.name);
              files.push(entry.attachment._id + '-'  + entry.attachment.name + '.' + entry.attachment.extension);
            }
            if (entry.type == 'apostrophe-image') {
              ['.full', '.max', '.one-half', '.one-sixth', '.one-third', '.two-thirds'].forEach((size) => {
                files.push(entry.attachment._id + '-'  + entry.attachment.name + size + '.' + entry.attachment.extension);
              });
            }
          }
        });
        let promises = [];
        files.forEach((filename) => {
          promises.push(
            fetch(cmsUrl + '/uploads/attachments/' + filename)
              .then(res => res.buffer())
              .then(res => {
                return fs.writeFile(req.export.dir + '/attachments/' + filename, res)
              })
          )
        });
        Promise
          .all(promises)
          .then(res => next())
          .catch(next)
      })
    },
    (req, res, next) => {
      if (!req.body['cms-attachments']) return next();
      // cms attachments
      console.log('Export cms attachments 2');
      let cmsUrl = 'http://' + ( req.export.site && req.export.site.domain );
      queryDb(req.export.dbName, 'aposAttachments').then(result => {
        let files = [];
        result.forEach((entry) => {
          files.push(entry._id + '-'  + entry.name + '.' + entry.extension);
          if (entry.extension.toLowerCase().match(/jpe?g|svg|png|gif/)) {
            ['.full', '.max', '.one-half', '.one-sixth', '.one-third', '.two-thirds'].forEach((size) => {
              files.push(entry._id + '-'  + entry.name + size + '.' + entry.extension);
            });
          }
        });
        let promises = [];
        files.forEach((filename) => {
          promises.push(
            fetch(cmsUrl + '/uploads/attachments/' + filename)
              .then(res => res.buffer())
              .then(res => {
                return fs.writeFile(req.export.dir + '/attachments/' + filename, res)
              })
          )
        });
        Promise
          .all(promises)
          .then(res => next())
          .catch(next)
      })
    },
    (req, res, next) => {
      // export mongo
      console.log('Export mongo');
      exportDb(req.export.dbName, req.export.dir)
        .then(res => {
          // rename
          return fs.rename(req.export.dir + '/' + req.export.site.config.cms.dbName, req.export.dir + '/' + 'mongo')
        })
        .then(res => next())
        .catch(next)
    },
    (req, res, next) => {
      // export oauth
      console.log('Export oauth');
      let oauth = req.export.site.config && req.export.site.config.oauth || {};
      let promises = [];
      Object.keys(oauth).forEach((key) => {
        let current = oauth[key];
        promises.push(
          userClientApi
            .fetch(oauth[key]['auth-client-id'])
            .then(client => {
              let json = JSON.stringify(client);
              return fs.writeFile(req.export.dir + '/oauth/' + key + '.json', json + '\n')
            })
        )
      });
      Promise
        .all(promises)
        .then(res => next())
        .catch(next)
    },
    (req, res, next) => {
      // site as json
      console.log('Export site');
      let json = JSON.stringify(req.export.site);
      fs.writeFile(req.export.dir + '/api/site.json', json)
        .then(res => next())
        .catch(next)
    },
    (req, res, next) => {
      // todo: images
      // todo: ideas?
      // nog andere dingen?
      return next();
    },
    (req, res, next) => {
      // tar
      console.log('Export tar');
      tar.create(
        {
          gzip: true,
          cwd: req.export.dir,
          file: req.export.filename,
        },
        ['.'])
        .then(next)
        .catch(next)
    },
    (req, res, next) => {
      // todo: ik denk dat het met een download link moet ipv direct zoals dit
      // todo: cleanup
      res.download(req.export.filename);
    },
  );

}
