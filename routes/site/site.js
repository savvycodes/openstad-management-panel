const slugify             = require('slugify');
const Promise             = require("bluebird");

//middleware
const ideaMw            = require('../../middleware/idea');
const externalSiteMw    = require('../../middleware/externalSite');
const siteMw            = require('../../middleware/site');
const voteMw            = require('../../middleware/vote');
const userClientMw      = require('../../middleware/userClient');
const roleClientMw      = require('../../middleware/role');

//services
const userClientApi     = require('../../services/userClientApi');
const siteApi           = require('../../services/siteApi');
const openstadEnvironmentService = require('../../services/openstad/openstadEnvironmentService');
const k8Ingress = require('../../services/k8/ingress');

//ENV constants
const apiUrl            = process.env.API_URL;
const appUrl            = process.env.APP_URL;
const siteFields        = [{key: 'title'}];

const deleteMongoDb               = require('../../services/mongo').deleteDb;
const dbExists                    = require('../../services/mongo').dbExists;
const copyDb                      = require('../../services/mongo').copyMongoDb;

const userApiSettingFields        = require('../../config/auth').userApiSettingFields;
const userApiRequiredFields       = require('../../config/auth').userApiRequiredFields;
const twoFactorConfigureFields    = require('../../config/auth').twoFactorConfigureFields;
const twoFactorValidateFields     = require('../../config/auth').twoFactorValidateFields;

const siteConfigSchema            = require('../../config/site').configSchema;

//models
const NewSite = require('../../services/openstad/models/newSite');

const cleanUrl                = require('../../utils/cleanUrl');
const ensureUrlHasProtocol    = require('../../utils/ensureUrlHasProtocol');
const formatBaseDomain        = require('../../utils/formatBaseDomain');

module.exports = function(app){

  /**
   * Show new site form
   */
  app.get('/admin/site-new',
    siteMw.withAll,
    externalSiteMw.withAll,
    (req, res, next) => {
      res.render('site/new-form.html', { externalSites: req.externalSites, wildcardHost: process.env.WILDCARD_HOST, existingDomains: req.sites.map(site => site.domain).join(',') });
    }
  );

  /**
   * Show copy site form
   */
  app.get('/admin/site-copy',
    siteMw.withAll,
    (req, res, next) => {
      res.render('site/copy-form.html', {existingDomains: req.sites.map(site => site.domain).join(',')});
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
    roleClientMw.withAll,
    userClientMw.withOneForSite,
    (req, res, next) => {
      res.render(`site/${req.params.page}.html`,  {
        siteConfigSchema: siteConfigSchema,
        pageName: req.params.page,
        userApiSettingFields: userApiSettingFields,
        userApiRequiredFields: userApiRequiredFields,
        twoFactorConfigureFields: twoFactorConfigureFields,
        twoFactorValidateFields: twoFactorValidateFields
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

  app.post('/admin/site/copy',
    // Todo: It would be nice if we create a controller for this method.
    async (req, res, next) => {
      try {

        let domain = req.body['domain-type'] === 'subdomain' ? `${req.body.domain}.${process.env.WILDCARD_HOST}` : req.body.domain;
        const protocol = req.body.protocol ? req.body.protocol : 'https://';

        domain = protocol + cleanUrl(domain);

        const newSite = new NewSite(domain, req.body.siteName, req.body.fromEmail, req.body.fromName);

        const siteData = await openstadEnvironmentService.get(newSite.getUniqueSiteId(), req.body.siteIdToCopy, req.body['choice-guides'], false);

        const site = await openstadEnvironmentService.create(req.user, newSite, siteData.apiData, siteData.cmsData, siteData.oauthData);

        req.flash('success', { msg: 'De site is succesvol aangemaakt'});
        res.redirect('/admin/site/' + site.id)

      } catch (error) {
        console.error(error);
        req.flash('error', { msg: 'Het is helaas niet gelukt om de site aan te maken.'});
        res.redirect('back');
      }
    }
  );

  /**
   * Edit config value of the site
   */
  app.post('/admin/site/:siteId(\\d+)',
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
      const domain = cleanUrl(req.body.productionUrl).toLowerCase();
      const apiDomain = cleanUrl(apiUrl);

      // sites can run on domain.com/site1, but when checking domain should be only base domain
      const baseDomain = formatBaseDomain(domain);

      const domainWithProtocol = ensureUrlHasProtocol(req.body.productionUrl).toLowerCase();

      const promises = [];

      // set domain to site api
      // this probably should be changed names in future, since sites can also run under domain.com/subdir
      // url would be more fitting
      siteData.domain = domain;
    ///  siteData.config.cms.url = siteData.config.cms.url ? [domain] : [];


      siteData.config.allowedDomains = baseDomain ? [baseDomain] : [];

      // update CMS urls
      if (siteData.config.cms) {
        siteData.config.cms.url = domainWithProtocol;
        siteData.config.cms.domain =  domain;
        siteData.config.cms.hostname =  domain;
      }

      promises.push(siteApi.update(req.session.jwt, req.params.siteId, siteData));

      if (req.userApiClient)  {
        const clientData = req.userApiClient;
        clientData.allowedDomains = [domain, apiDomain];
        clientData.siteUrl = domainWithProtocol;
        clientData.redirectUrl = domainWithProtocol;
        clientData.config.backUrl = domainWithProtocol;

        promises.push(userClientApi.update(req.userApiClient.clientId, clientData));
      }

      if (process.env.KUBERNETES_NAMESPACE) {
        promises.push(k8Ingress.edit(siteData.config.cms.dbName, domain));
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
          console.error(err);
          req.flash('error', { msg: 'Er gaat iets mis!'});
          res.redirect(req.header('Referer')  || appUrl);
        });

    }
  );


  /**
   * Edit url of the website, this has specific route because it needs to happen at specific points
   * @type {[type]}
   */
  app.post('/admin/site/:siteId/smtp',
    siteMw.withOne,
    userClientMw.withOneForSite,
    (req, res, next) => {

      const clientConfig =  clientData.config;

      const smtpSettings = {

      }

      clientConfig.smtp = smtpSettings;
      clientData

      promises.push(userClientApi.update(req.userApiClient.clientId, clientData));


      if (process.env.KUBERNETES_NAMESPACE) {
        promises.push(k8Ingress.edit(siteData.config.cms.dbName, domain));
      }

      /**
       * Import all promises
       */
      Promise.all(promises)
        .then(function (response) {
          req.flash('success', { msg: 'Aangepast!'});
          res.redirect(req.header('Referer')  || appUrl);
        })
        .catch(function (err) {
          console.error(err);
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

        if (process.env.KUBERNETES_NAMESPACE) {
          deleteActions.push(k8Ingress.delete(req.site.config.cms.dbName));
        }
      }

      Promise.all(deleteActions)
        .then((response) => {
          req.flash('success', { msg: 'Verwijderd!'});
          res.redirect('/admin');
        })
        .catch((err) => {

          console.log('++++++++++++++++++++');
          console.log(err);
          let message = err && err.error && err.error.message ?  'Er gaat iets mis: '+ err.error.message : 'Er gaat iets mis!';
          req.flash('error', { msg: message});
          res.redirect('/admin');
      //     next(err)
        });
    }
  );

}
