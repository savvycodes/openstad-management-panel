const slugify           = require('slugify');
const nestedObjectAssign = require('nested-object-assign');
//middleware
const ideaMw            = require('../../middleware/idea');
const siteMw            = require('../../middleware/site');
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
const authFields        = [{key: 'name'}, {key: 'config'}, {key: 'requiredUserFields'}, {key: 'authTypes'}];
const deleteMongoDb     = require('../../services/mongo').deleteDb;


function nestedassign(target, source) {
  Object.keys(source).forEach(sourcekey=>{
    if (Object.keys(source).find(targetkey=>targetkey===sourcekey) !== undefined && typeof source[sourcekey] === "object") {
      target[sourcekey]=nestedassign(target[sourcekey],source[sourcekey]);
    } else {
      target[sourcekey]=source[sourcekey];
    }
  });
  return target;
}


module.exports = function(app){
  app.get('/admin/site/:siteId/idea/:ideaId',
    ideaMw.oneForSite,
    siteMw.withOne,
    (req, res, next) => {
      res.render('site/idea/form.html');
    }
  );

  app.get('/admin/site/:siteId',
    siteMw.withOne,
    (req, res, next) => {
      res.render('site/main.html');
    }
  );

  app.get('/admin/site/:siteId/:page',
    ideaMw.allForSite,
    siteMw.withOne,
    userClientMw.withOneForSite,
    (req, res, next) => {
      res.render(`site/${req.params.page}.html`);
    }
  );

  app.post('/admin/site',
    siteMw.withAll,
    (req, res, next) => {
    /**
     * Create client in mijnopenstad oAuth API
     */
     const domain = cleanUrl(req.body.productionUrl);
     const apiDomain = cleanUrl(apiUrl);
     const domainWithProtocol = ensureUrlHasProtocol(req.body.productionUrl);
     const siteName = req.body.name;
     // add time to make the name unique
     const dbName = time() + '-' + domain.replace(/\./g, '');
     const siteToCopy = req.sites.find(site => req.body.siteIdToCopy);
     const authApiConfigCopy = req.authClients.find(site => req.body.siteIdToCopy);
     let dbToCopy = siteToCopy && siteToCopy.cms ? siteToCopy.cms.dbName : false;
     let siteId;

     userClientApi.create(token, {
       name: siteName,
       siteUrl: domainWithProtocol,
       redirectUrl: domainWithProtocol,
       description: '',
       authTypes: ['Url'],
       requiredUserFields: ["firstName", "lastName", "email"],
       allowedDomains: [domain, apiDomain],
       config: {
         "backUrl": domainWithProtocol,
         'fromEmail': req.body.fromEmail,
         'fromName': req.body.fromName,
      }
    })
    .then((client) => {
    /**
     * Create Site in openstad API
     */
     return siteApi
         .create(req.session.jwt, {
            domain: domain,
            name: `${slugify(req.body.name)}-${new Date().getTime()}`,
            title: req.body.name,
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
         /**
          * Copy mongodb database for CMS from chosen site, or if empty default
          */
         dbToCopy = exists ? dbToCopy : process.env.DEFAULT_DB;
         return copyDb(dbToCopy, dbName);
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

      let data = pick(req.body, siteFields.map(field => field.key));
      data.config = pick(req.body, siteConfigFields.map(field => field.key));

      siteApi
        .update(req.session.jwt, req.params.siteId, nestedObjectAssign(req.site, data))
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
      siteData.config.cms.url = [domain];
      siteData.config.allowedDomains = [domain];
      promises.push(siteApi.update(req.session.jwt, req.params.siteId, siteData));

      const clientData = req.userApiClient;
      clientData.allowedDomains = [domain, apiDomain];
      clientData.siteUrl = domainWithProtocol;
      clientData.redirectUrl = domainWithProtocol;
      clientData.config.backUrl = domainWithProtocol;
      promises.push(siteApi.update(req.session.jwt, req.params.siteId, siteData));

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

  app.post('/admin/site/:siteId/user-api',
    siteMw.withOne,
    userClientMw.withOneForSite,
    (req, res, next) => {
      console.log('==>>>>> req.params.siteId', req.params.siteId);

      if (req.userApiClient.config && req.userApiClient.config.authTypes && req.body.config && req.body.config.authTypes) {
        const siteConfig = req.userApiClient.config;
        req.userApiClient.config.authTypes = Object.assign(req.userApiClient.config.authTypes, req.body.config.authTypes);
        req.body.config = req.userApiClient.config;
      }

      let data = pick(req.body, authFields.map(field => field.key));
      console.log('data.config 2', data.config);
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
    (req, res, next) => {

      Promises.all([
        siteApi.delete(req.session.jwt, req.params.siteId),
        userClientApi.delete(token, req.params.siteId),
        deleteMongoDb(req.site.config.cms.dbName),
      ])
        .then((response) => {
          req.flash('success', { msg: 'Aangepast!'});
          res.redirect('/admin');
        })
        .catch((err) => { next(err) });
    }
  );
}
