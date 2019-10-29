const slugify             = require('slugify');
const nestedObjectAssign  = require('nested-object-assign');
const Promise             = require("bluebird");

//middleware
const ideaMw            = require('../../middleware/idea');
const siteMw            = require('../../middleware/site');
const voteMw            = require('../../middleware/vote');
const userClientMw      = require('../../middleware/userClient');
//services
const userClientApi     = require('../../services/userClientApi');
const siteApi           = require('../../services/siteApi');
//utils
const pick              = require('../../utils/pick');
//ENV constants
const apiUrl            = process.env.API_URL;
const appUrl            = process.env.APP_URL;
const siteId            = process.env.SITE_ID;

const siteFields        = [{key: 'title'}];
const siteConfigFields  = [{key: 'basicAuth'}];

const authFields            = [{key: 'name'}, {key: 'requiredUserFields'}, {key: 'authTypes'}];
const deleteMongoDb         = require('../../services/mongo').deleteDb;
const dbExists              = require('../../services/mongo').dbExists;
const copyDb                = require('../../services/mongo').copyMongoDb;
const userApiSettingFields  = require('../../config/auth').userApiSettingFields;
const userApiRequiredFields  = require('../../config/auth').userApiRequiredFields;
const siteConfigSchema  = require('../../config/site').configSchema;

const cleanUrl = (url) => {
  return url.replace('http://', '').replace('https://', '').replace(/\/$/, "");
}

const ensureUrlHasProtocol = (url) => {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // if no protocol, assume https
    url = 'https://' + url;
  }

  return url;
}

module.exports = function(app){

  app.get('/admin/site/:siteId',
    siteMw.withOne,
    userClientMw.withOneForSite,
    (req, res, next) => {
      res.render('site/main.html');
    }
  );

  app.get('/admin/site/:siteId/votes',
    ideaMw.allForSite,
    siteMw.withOne,
    voteMw.allForSite,
    userClientMw.withOneForSite,
    (req, res, next) => {
      res.render(`site/votes.html`);
    }
  );

  app.get('/admin/site/:siteId/:page',
    siteMw.withOne,
    ideaMw.allForSite,
    userClientMw.withOneForSite,
    (req, res, next) => {

      console.log('userApiClient', req.userApiClient);

      res.render(`site/${req.params.page}.html`,  {
        siteConfigSchema: siteConfigSchema,
        pageName: req.params.page,
        userApiSettingFields: userApiSettingFields,
        userApiRequiredFields: userApiRequiredFields
      });
    }
  );

  app.get('/admin/site/:siteId/settings/:page',
    siteMw.withOne,
    ideaMw.allForSite,
    userClientMw.withOneForSite,
    (req, res, next) => {
      res.render(`site/settings/${req.params.page}.html`, {
        siteConfigSchema: siteConfigSchema,
        ideaFields: siteConfigSchema.ideas,
        pageName: req.params.page
      });
    }
  );

  app.post('/admin/site',
    siteMw.withAll,
    userClientMw.withAll,
    (req, res, next) => {
    /**
     * Create client in mijnopenstad oAuth API
     */
     const domain = cleanUrl(req.body.productionUrl);
     const apiDomain = cleanUrl(apiUrl);
     const domainWithProtocol = ensureUrlHasProtocol(domain);
     const siteName = req.body.siteName;
     // add time to make the name unique
     const dbName = Math.round(new Date().getTime() / 1000) + domain.replace(/\./g, '');
     const siteToCopy = req.sites.find(site => parseInt(req.body.siteIdToCopy, 10) === site.id);
     const authClientId = siteToCopy.config.oauth.authClientId;
     const authApiConfigCopy = req.userApiClients.find(client => client.clientId === authClientId);

     let dbToCopy = siteToCopy &&  siteToCopy.config &&  siteToCopy.config.cms ? siteToCopy.config.cms.dbName : false;

     let siteId;

     userClientApi.create({
       name: siteName,
       siteUrl: domainWithProtocol,
       redirectUrl: domainWithProtocol,
       description: authApiConfigCopy ? authApiConfigCopy.description : '',
       authTypes: authApiConfigCopy ? authApiConfigCopy.authTypes : ['Url'],
       requiredUserFields: authApiConfigCopy ? authApiConfigCopy.requiredUserFields : ["firstName", "lastName", "email"],
       allowedDomains: [domain, apiDomain],
       config: {
         "backUrl": domainWithProtocol,
         'fromEmail': req.body.fromEmail,
         'fromName': req.body.fromName,
         'authTypes' : authApiConfigCopy && authApiConfigCopy.config && authApiConfigCopy.config.authTypes ? authApiConfigCopy.config.authTypes : ["firstName", "lastName", "email"],
      }
    })
    .then((client) => {
    /**
     * Create Site in openstad API
     */
     return siteApi
         .create(req.session.jwt, {
            domain: domain,
            name: `${slugify(req.body.siteName)}-${new Date().getTime()}`,
            title: req.body.siteName,
            config: {
              allowedDomains: [domain],
              basicAuth: {
                active: req.body.basicAuthActive === 'yes',
                user: req.body.basicAuthUser,
                password: req.body.basicAuthPassword,
              },
              cms: {
                dbName: dbName,
                url: domainWithProtocol,
                hostname: domain,
              },
              oauth: {
                "auth-client-id": client.clientId,
                "auth-client-secret":  client.clientSecret,
              },
              email: {
      					siteaddress: req.body.fromEmail,
      					thankyoumail: {
    							from: req.body.fromEmail,
      					}
        			},
            }
         })
       })
       .then((site) => {
         return dbExists(dbToCopy);
       })
       .then((exists) => {
         console.log('exists', exists);

         /**
          * Copy mongodb database for CMS from chosen site, or if empty default
          */
         dbToCopy = exists ? dbToCopy : process.env.DEFAULT_DB;

         return copyDb(dbToCopy, dbName);
       })
       .then(() => {
         req.flash('success', { msg: 'Aangemaakt!'});
         res.redirect(req.header('Referer')  || appUrl);
       })
       .catch((e) => {
         console.log(e);
         res.status(500).json({ error: 'An error occured: ' + e.msg });
       });
  });

  app.post('/admin/site/:siteId',
    siteMw.withOne,
    (req, res, next) => {
      delete req.body.url;
      const siteConfigFields = Object.keys(siteConfigSchema);
      const siteData = req.site;


      if (siteFields) {
        siteFields.forEach((siteField) => {
          if (req.body[siteField]) {
            siteData[siteField] = req.body[siteField];
          }
        });
      }

      if (siteConfigFields && req.body.config) {
        siteConfigFields.forEach((siteConfigField) => {
          let fields = siteConfigSchema[siteConfigField];
          fields.forEach((field) => {
            if (req.body.config[siteConfigField]) {
              let value = req.body.config[siteConfigField][field.key];

              //check if not set (can be false in case of boolean)
              if (value || value === false) {
                if (field.type === 'number') {
                  value = parseInt(value, 10);
                }

                if (field.parentKey) {

                  if (!siteData.config[field.parentKey][siteConfigField]) {
                    siteData.config[field.parentKey][siteConfigField] = {};
                  }
                  siteData.config[field.parentKey][siteConfigField][field.key] = value;
                } else {
                  siteData.config[siteConfigField][field.key] = value;
                }

              }
            }
          });
        })
      }

      siteApi
        .update(req.session.jwt, req.params.siteId, siteData)
        .then((site) => {
          req.flash('success', { msg: 'Aangepast!'});
          res.redirect(req.header('Referer')  || appUrl);
        })
        .catch((err) => { next(err) });
    }
  );


  // this is not so nice, should only set it once in API & once in oAuth api
  app.post('/admin/site/:siteId/url',
    siteMw.withOne,
    userClientMw.withOneForSite,
    (req, res, next) => {

      const siteData = req.site;
      const domain = cleanUrl(req.body.productionUrl);
      const apiDomain = cleanUrl(apiUrl);
      const domainWithProtocol = ensureUrlHasProtocol(req.body.productionUrl);
      const promises = [];

      // set domain to site api
      siteData.domain = domain;
    ///  siteData.config.cms.url = siteData.config.cms.url ? [domain] : [];
      siteData.config.allowedDomains = siteData.config.allowedDomains ? [domain] : [];

      promises.push(siteApi.update(req.session.jwt, req.params.siteId, siteData));

      if (req.userApiClient)  {
        const clientData = req.userApiClient;
        clientData.allowedDomains = [domain, apiDomain];
        clientData.siteUrl = domainWithProtocol;
        clientData.redirectUrl = domainWithProtocol;
        clientData.config.backUrl = domainWithProtocol;

        promises.push(userClientApi.update(req.userApiClient.clientId, clientData));
      }


      /**
       * Import all promises
       */
      Promise.all(promises)
        .then(function (response) {
          console.log('==>>>> > > > > response', response);
          req.flash('success', { msg: 'Url aangepast!'});
          res.redirect(req.header('Referer')  || appUrl);
        })
        .catch(function (err) {
          req.flash('error', { msg: 'Er gaat iets mis!'});
          res.redirect(req.header('Referer')  || appUrl);
        });

    }
  );

  app.post('/admin/site/:siteId/user-api',
    siteMw.withOne,
    userClientMw.withOneForSite,
    (req, res, next) => {
      if (req.userApiClient.config && req.userApiClient.config.authTypes && req.body.config && req.body.config.authTypes) {
        const siteConfig = req.userApiClient.config;
        req.userApiClient.config.authTypes = nestedObjectAssign(req.userApiClient.config.authTypes, req.body.config.authTypes);
        req.body.config = req.userApiClient.config;
      } else if (req.userApiClient.config &&  req.body.config && req.body.config.requiredFields ) {
        req.userApiClient.config.requiredFields = req.body.config.requiredFields;
      } else if (req.userApiClient.config && req.body.config) {
        userApiSettingFields.forEach((field) => {
          if (req.body.config[field.key]) {
            var value = req.body.config[field.key];
            req.userApiClient.config[field.key] = value;
          }
        });
      }

      let data = pick(req.body, authFields.map(field => field.key));
      data = Object.assign(req.userApiClient, data);

      userClientApi
        .update(req.userApiClient.clientId, data)
        .then((userClient) => {
          req.flash('success', { msg: 'Aangepast!'});
          res.redirect(req.header('Referer')  || appUrl);
        })
        .catch((err) => { next(err) });
    }
  );


  app.post('/admin/site/:siteId/delete',
    siteMw.withOne,
    siteMw.addAuthClientId,
    (req, res, next) => {

      const deleteActions = [
  //      siteApi.delete(req.session.jwt, req.params.siteId),
        userClientApi.delete(req.authClientId),
      ];

      if (req.site.config && req.site.config.cms && req.site.config.cms.dbName) {
        deleteActions.push(deleteMongoDb(req.site.config.cms.dbName));
      }

      Promise.all(deleteActions)
        .then((response) => {
          req.flash('success', { msg: 'Aangepast!'});
          res.redirect('/admin');
        })
        .catch((err) => {
          console.log( 'Error, admin/site/:siteId/delete: ', err);
          req.flash('error', { msg: 'Ging iets mis!'});
          res.redirect('/admin');
      //     next(err)
        });
    }
  );
}
