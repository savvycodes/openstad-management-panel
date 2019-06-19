const ideaMw            = require('../middleware/idea');
const siteMw            = require('../middleware/site');

const userClientApi     = require('../services/userClientApi');
const siteApi           = require('../services/siteApi');
const slugify           = require();


const apiUrl = process.env.API_URL;
const appUrl = process.env.APP_URL;
const siteId = process.env.SITE_ID;



module.exports = function(app){
  app.get('/admin/site/:siteId/idea/:ideaId',
    ideaMw.oneForSite,
    siteMw.withOne,
    (req, res) => {
      res.render('site/idea/form.html');
    }
  );

  app.get('/admin/site/:siteId',
    siteMw.withOne,
    (req, res) => {
      res.render('site/main.html');
    }
  );

  app.get('/admin/site/:siteId/:page',
    ideaMw.allForSite,
    siteMw.withOne,
    (req, res) => {
      res.render('site/'+ req.params.page + '.html');
    }
  );

  app.post('/site',
    siteMw.withAll,
    (req, res) => {
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
       .create(token, {
          domain: domain,
          name: req.body.name,
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
              "auth-client-secret":  client.clietId,
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

  app.post('/site/:siteId',
    siteMw.withOne,
    (req, res) => {
    const productionUrl = cleanUrl(req.body.productionUrl);

    new Site({ id: req.params.siteId })
      .fetch()
      .then((site) => {
        site.set('productionUrl', productionUrl);
    //    site.set('stagingUrl', stagingUrl);
    //    site.set('stagingName', req.body.stagingName);
        site.set('fromEmail', req.body.fromEmail);
        site.set('fromName', req.body.fromName);
        return site.save().then(() => {
          req.flash('success', { msg: 'Opgeslagen' });
          res.redirect('/admin/site/' + site.id + '/settings');
        });
      })
      .catch((e) => {
        res.status(500).json({ error: 'An error occured ' + e.msg });
      });
  });

  app.post('/site/:siteId/delete', (req, res) => {
    new Site({ id: req.params.siteId })
      .fetch()
      .then((site) => {
        const stagingUrl = site.get('stagingUrl');
        const stagingUrlDB = stagingUrl.replace(/\./g, '');

        deleteMongoDb(stagingUrlDB).then(() => {
          return site.destroy().then(() => {
            req.flash('success', { msg: 'Verwijdert!' });
            res.redirect('/');
          });
        });
      })
      .catch((e) => {
        res.status(500).json({ error: 'An error occured  ' + e.msg });
      });
  });

}


/*app.post('/admin/site/:siteId/user-api-client',
  siteMw.withOne,
  (req, res) => {
    return userClientApi.create(token, {
      name,
      siteUrl,
      redirectUrl: '',
      description: '',
      authTypes: ['Url'],
      requiredUserFields: [ "firstName", "lastName", "email" ],
      allowedDomains: [],
      config: {
         "backUrl": "https://buurtbudget.staging.openstadsdeel.nl/",
         "fromName": "Buurtbuddy",
         "fromEmail": "buurtbudget@amsterdam.nl",
         "authTypes": {
           "UniqueCode": {
             "label": "Mijn stemcode:",
             "title": "Controleer stemcode",
             "buttonText": "Controleer stemcode",
             "description": "Om te kunnen stemmen op de website West Begroot vul je hieronder je stemcode in. Deze code heb je thuis gestuurd gekregen. Wij controleren de stemcode op geldigheid. "
           }
         },
         "logoutUrl": "https://buurtbudget.staging.openstadsdeel.nl/logout",
         "projectUrl": "https://www.amsterdam.nl/westbegroot",
         "contactEmail": "niels@denes.nl",
         "requiredFields": {
           "info": "Waarom willen we dit van u weten? Omdat we graag zoveel mogelijk inzicht willen krijgen in waar de voorkeur van de Herengracht en omliggende straten ligt.",
           "title": "Aanvullende gegevens",
           "buttonText": "verstuur",
           "description": "Om uw voorkeur achter te laten hebben we wat extra gegevens van u nodig."
         },
         "clientDisclaimerUrl": "https://westbegroot.staging.openstadsdeel.nl/disclaimer"
       }
    });
  }
);
*/
