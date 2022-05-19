const nestedObjectAssign  = require('nested-object-assign');
const Promise             = require("bluebird");

//middleware
const userClientMw      = require('../../middleware/userClient');
const siteMw            = require('../../middleware/site');

//services
const userClientApi     = require('../../services/userClientApi');
//utils
const pick              = require('../../utils/pick');
//ENV constants
const appUrl            = process.env.APP_URL;

const siteFields        = [{key: 'title'}];
const siteConfigFields  = [{key: 'basicAuth'}];
const authFields        = [{key: 'name'}, {key: 'requiredUserFields'}, {key: 'authTypes'}];

const userApiSettingFields        = require('../../config/auth').userApiSettingFields;



module.exports = function(app) {
  /**
   * Handle updating required fields & authTypes of the default oAuth API connected to this site
   */
  app.post('/admin/site/:siteId/user-api/settings',
    siteMw.withOne,
    userClientMw.withOneForSite,
    (req, res, next) => {
      let data = req.userApiClient;
      const authTypes = req.body.authTypes ? req.body.authTypes : [];
      const requiredFields = req.body.requiredUserFields ? req.body.requiredUserFields : [];

      const emailAuthTypesEnabled = authTypes.indexOf('Url') !== -1 ||authTypes.indexOf('Local') !== -1;
      const emailRequired = requiredFields.indexOf('email') !== -1;

      if (!req.body.authTypes) {
        req.flash('error', { msg: 'At least one authentication method is required'});
        req.session.save( () => {
          res.redirect(req.header('Referer')  || appUrl);
        });

      // only allow emailRequired if email is validated through an auth type like email url of password
      } else if (emailRequired && !emailAuthTypesEnabled) {
        req.flash('error', { msg: 'Select an authentication method that uses e-mail if you want to make e-mail an required field.'});
        req.session.save( () => {
          res.redirect(req.header('Referer')  || appUrl);
        });
      } else {
        data.requiredUserFields = req.body.requiredUserFields ? req.body.requiredUserFields : [];
        data.authTypes = req.body.authTypes;
        data.twoFactorRoles = req.body.twoFactorRoles ? req.body.twoFactorRoles : [];

        userClientApi
          .update(req.userApiClient.clientId, data)
          .then((userClient) => {
            req.flash('success', { msg: 'Aangepast!'});
            req.session.save( () => {
              res.redirect(req.header('Referer')  || appUrl);
            });
          })
          .catch((err) => { next(err) });
      }
    });


  /**
   * Handle updating config fields of the default oAauth api connected to this site
   */
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
      } else if (req.userApiClient.config &&  req.body.config && req.body.config.twoFactor ) {
          req.userApiClient.config.twoFactor = req.body.config.twoFactor;
      } else if (req.userApiClient.config &&  req.body.config && req.body.config.configureTwoFactor ) {
          req.userApiClient.config.configureTwoFactor = req.body.config.configureTwoFactor;
      } else if (req.userApiClient.config && req.body.config) {
        userApiSettingFields.forEach((field) => {
          if (req.body.config[field.key]) {
            var value = req.body.config[field.key];
            req.userApiClient.config[field.key] = value;
          }
        });
      }

      if (req.body.image) {
        try {
          const imageObject = JSON.parse(req.body.image);
          if (imageObject.url) {
            req.userApiClient.config[req.body.imageFieldName] = imageObject.url || '';
          }
        } catch(error) {
          return next(err)
        }
      }

      let data = pick(req.body, authFields.map(field => field.key));
      data = Object.assign(req.userApiClient, data);

      userClientApi
        .update(req.userApiClient.clientId, data)
        .then((userClient) => {
          req.flash('success', { msg: 'Aangepast!'});
          req.session.save( () => {
            res.redirect(req.header('Referer')  || appUrl);
          });
        })
        .catch((err) => { next(err) });
    }
  );


  /**
   * Handle updating name of all the oAuth clients connected to the site
   */
  app.post('/admin/site/:siteId/user-api/name',
    siteMw.withOne,
    userClientMw.withAllForSite,
    (req, res, next) => {

      const updateActions = [];
      req.siteClients;

      req.siteClients.forEach((siteClient) => {
        let data = Object.assign(siteClient, {
          name: req.body.name
        });

        updateActions.push(new Promise((resolve, reject) => {
          userClientApi.update(siteClient.clientId, data)
            .then(() => {
              resolve();
            })
            .catch((err) => {
              reject(err);
            });
          }));
      });

      Promise
        .all(updateActions)
        .then(() => {
          req.flash('success', { msg: 'Updated!'});
          req.session.save( () => {
            res.redirect(req.header('Referer')  || appUrl);
          });
        })
        .catch((err) => {
          console.log('->>> E:', err.message)
          req.flash('success', { msg: 'Something went wrong!'});
          req.session.save( () => {
            res.redirect(req.header('Referer')  || appUrl);
          });
        })

    }
  );
}
