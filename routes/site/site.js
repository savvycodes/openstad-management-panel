const slugify             = require('slugify');
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

const ideaApi                     = require('../../services/ideaApi');
const deleteMongoDb               = require('../../services/mongo').deleteDb;
const dbExists                    = require('../../services/mongo').dbExists;
const copyDb                      = require('../../services/mongo').copyMongoDb;
const userApiSettingFields        = require('../../config/auth').userApiSettingFields;
const userApiRequiredFields       = require('../../config/auth').userApiRequiredFields;
const siteConfigSchema            = require('../../config/site').configSchema;

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


  /**
   * Show site overview dashboard
   */
  app.get('/admin/site/:siteId/archive-votes',
    ideaMw.allForSite,
    siteMw.withOne,
    voteMw.allForSite,
    siteMw.addStats,
    userClientMw.withOneForSite,
    (req, res, next) => {
      const promises = [];

      req.ideas.forEach((idea) => {
        console.log('ideaideaidea', idea.extraData);
        idea.extraData.archivedYes = idea.yes;
        idea.extraData.archivedNo = idea.no;
        promises.push(ideaApi.update(req.session.jwt, req.site.id, idea))
      });

      /**
       * Import all promises
       */
      Promise.all(promises)
        .then(function (response) {
          req.flash('success', { msg: 'Ideas update!'});
          res.redirect('/admin/site/' + req.site.id  || appUrl);
        })
        .catch(function (err) {
          req.flash('error', { msg: 'Error'});
          res.redirect('/admin/site/' + req.site.id  || appUrl);
        });
    }
  );

  /**
   * Show site overview dashboard
   */
  app.get('/admin/site/:siteId',
    ideaMw.allForSite,
    siteMw.withOne,
    voteMw.allForSite,
    siteMw.addStats,
    userClientMw.withOneForSite,
    (req, res, next) => {
      res.render('site/main.html');
    }
  );

  /**
   * Generic handling of pages, will look for template from url parameter
   */
  app.get('/admin/site/:siteId/:page',
    siteMw.withOne,
    ideaMw.allForSite,
    userClientMw.withOneForSite,
    (req, res, next) => {
      res.render(`site/${req.params.page}.html`,  {
        siteConfigSchema: siteConfigSchema,
        pageName: req.params.page,
        userApiSettingFields: userApiSettingFields,
        userApiRequiredFields: userApiRequiredFields
      });
    }
  );

  /**
   * Generic handling of pages, will look for settngs template from url parameter
   */
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

  /**
   * Create a new site by copying an old one
   */
  app.post('/admin/site',
    siteMw.withAll,
    userClientMw.withAll,
    (req, res, next) => {
    let clientDefault, clientAnonymous;
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
     const authClientIdDefault = siteToCopy && siteToCopy.config && siteToCopy.config.oauth && siteToCopy.config.oauth.default ? siteToCopy.config.oauth.default["auth-client-id"]  : false;
     const authClientId  = authClientIdDefault ? authClientIdDefault : (siteToCopy.config && siteToCopy.config.oauth ? siteToCopy.config.oauth["auth-client-id"] : false);
     const authApiConfigCopy = req.userApiClients.find(client => client.clientId === authClientId);

     //copy the config but overwrite specific values entered by the user
     const authConfig = authApiConfigCopy.config ? JSON.parse(authApiConfigCopy.config) : {};
     authConfig.backUrl = domainWithProtocol;
     authConfig.fromEmail = req.body.fromEmail;
     authConfig.fromName = req.body.fromName;

     const formattedAuthConfigDefault = {
       name: siteName,
       siteUrl: domainWithProtocol,
       redirectUrl: domainWithProtocol,
       description: authApiConfigCopy ? authApiConfigCopy.description : '',
       authTypes: authApiConfigCopy && authApiConfigCopy.authTypes? JSON.parse(authApiConfigCopy.authTypes) : ['Url'],
       requiredUserFields: authApiConfigCopy && authApiConfigCopy.authTypes ? JSON.parse(authApiConfigCopy.requiredUserFields) : ["firstName", "lastName", "email"],
       allowedDomains: [domain, apiDomain],
       config: authConfig
    };

    let dbToCopy = siteToCopy &&  siteToCopy.config &&  siteToCopy.config.cms ? siteToCopy.config.cms.dbName : false;
    let siteId;

    // create the default oAuth client API
    userClientApi.create(formattedAuthConfigDefault)
     .then((defaultResponse) => {
       clientDefault = defaultResponse;
       formattedAuthConfigDefault.authTypes = ['Anonymous'];

       // for anonymous "authenticating" only require the postcode
       formattedAuthConfigDefault.requiredUserFields = ['postcode'];

       // create the anonymous oAuth client API for voting without authenticating
       return userClientApi.create(formattedAuthConfigDefault);
     })
     .then((anonymousResponse) => {
       clientAnonymous = anonymousResponse;

      /**
       * Create Site in openstad API
       */
      const siteConfig = Object.assign(siteToCopy.config, {
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
            default : {
              "auth-client-id": clientDefault.clientId,
              "auth-client-secret":  clientDefault.clientSecret,
            },
            anonymous: {
              "auth-client-id": clientAnonymous.clientId,
              "auth-client-secret":  clientAnonymous.clientSecret,
            }
          },
          email: {
            siteaddress: req.body.fromEmail,
            thankyoumail: {
              from: req.body.fromEmail,
            }
          }
      });

     return siteApi
         .create(req.session.jwt, {
            domain: domain,
            name: `${slugify(req.body.siteName)}-${new Date().getTime()}`,
            title: req.body.siteName,
            config: siteConfig
         })
       })
       .then((site) => {
         return dbExists(dbToCopy);
       })
       .then((exists) => {
         /**
          * Copy mongodb database for CMS from chosen site, or if empty get the default DB
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

  /**
   * Edit config value of the site
   */
  app.post('/admin/site/:siteId',
    siteMw.withOne,
    (req, res, next) => {
      delete req.body.url;
      const siteConfigFields = Object.keys(siteConfigSchema);
      const siteData = req.site;

      if (siteFields) {
        siteFields.forEach((siteField) => {
          if (req.body[siteField.key]) {
            siteData[siteField.key] = req.body[siteField.key];
          }
        });
      }

      if (siteConfigFields && req.body.config) {
        siteConfigFields.forEach((siteConfigField) => {
          let fields = siteConfigSchema[siteConfigField];
          fields.forEach((field) => {
            if (req.body.config[siteConfigField]) {
              let value = req.body.config[siteConfigField][field.key];

              console.log('value', value);

              //check if not set (can be false in case of boolean)
              if (value || value === false) {
                // in case it's a number cast the type, otherwise api will not see it as valid
                if (field.type === 'number') {
                  value = parseInt(value, 10);
                }

                if (field.type === 'array') {
                  value = value.split(',').map((item) => {
                    return item.trim();
                  });
                }

                // in case it's a nested config value
                // for now just support one level deep
                // of course a recursive function would be pretyy
                if (field.parentKey) {
                  // if not set, create an empty object for the config section
                  if (!siteData.config[field.parentKey][siteConfigField]) {
                    siteData.config[field.parentKey][siteConfigField] = {};
                  }

                  siteData.config[field.parentKey][siteConfigField][field.key] = value;
                } else {
                  // if not set, create an empty object for the config section
                  if (!siteData.config[siteConfigField]) {
                    siteData.config[siteConfigField] = {};
                  }

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


  /**
   * Edit url of the website, this has specific route because it needs to happen at specific points
   * @type {[type]}
   */
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
          req.flash('success', { msg: 'Url aangepast!'});
          res.redirect(req.header('Referer')  || appUrl);
        })
        .catch(function (err) {
          req.flash('error', { msg: 'Er gaat iets mis!'});
          res.redirect(req.header('Referer')  || appUrl);
        });

    }
  );

  /**
   * Delete a website
   * At the moment it's a hard delete of the mongodb database.
   * The api adds a flag "deletedAt" to the the row, but keeps the row,
   */
  app.post('/admin/site/:siteId/delete',
    siteMw.withOne,
    siteMw.addAuthClientId,
    (req, res, next) => {

      const deleteActions = [
        siteApi.delete(req.session.jwt, req.params.siteId),
      //  userClientApi.delete(req.authClientId),
      ];

      if (req.site.config && req.site.config.cms && req.site.config.cms.dbName) {
        deleteActions.push(deleteMongoDb(req.site.config.cms.dbName));
      }

      Promise.all(deleteActions)
        .then((response) => {
          req.flash('success', { msg: 'Verwijderd!'});
          res.redirect('/admin');
        })
        .catch((err) => {
          let message = err && err.error && err.error.message ?  'Er gaat iets mis: '+ err.error.message : 'Er gaat iets mis!';
          req.flash('error', { msg: message});
          res.redirect('/admin');
      //     next(err)
        });
    }
  );
}
