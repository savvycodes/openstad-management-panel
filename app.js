// Load environment variables from .env file
var dotenv = require('dotenv');
dotenv.load();
const express           = require('express');
const isDev             = process.env.ENVIRONMENT === 'development';
const Site              = require('./models').Site;
const bodyParser        = require('body-parser');
const cookieParser      = require('cookie-parser');
const expressSession    = require('express-session')
const nunjucks          = require('nunjucks');
const flash             = require('express-flash');
const app               = express();
const FileStore         = require('session-file-store')(expressSession);
const rp                = require('request-promise');
const ideaMw            = require('./middleware/idea');
const siteMw            = require('./middleware/site');
const enrichMw          = require('./middleware/enrich');
const authMw            = require('./middleware/auth');

const dateFilter                  = require('./nunjucks/dateFilter');
const currencyFilter              = require('./nunjucks/currency');
const limitTo                     = require('./nunjucks/limitTo');
const jsonFilter                  = require('./nunjucks/json');
const timestampFilter             = require('./nunjucks/timestamp');
const replaceIdeaVariablesFilter  = require('./nunjucks/replaceIdeaVariables');

const cleanUrl = (url) => {
  return url.replace(['http://', 'https://'], '');
}

const apiUrl = process.env.API_URL;
const appUrl = process.env.APP_URL

const slugify = (text) => {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

//app.set('views', __dirname + '/templates');

const nunjucksEnv = nunjucks.configure('templates', {
  autoescape: true,
  express: app
});

app.use((req, res, next) => {
  dateFilter.setDefaultFormat('DD-MM-YYYY HH:mm');
  nunjucksEnv.addFilter('date', dateFilter);
  nunjucksEnv.addFilter('currency', currencyFilter);
  nunjucksEnv.addFilter('limitTo', limitTo);
  nunjucksEnv.addFilter('json', jsonFilter);
  nunjucksEnv.addFilter('timestamp', timestampFilter);
  nunjucksEnv.addFilter('replaceIdeaVariables', replaceIdeaVariablesFilter);
  next();
});

const copyDb = require('./services/mongo').copyMongoDb;
const dbExists = require('./services/mongo').dbExists;
const deleteMongoDb =  require('./services/mongo').deleteDb;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

app.use(cookieParser(process.env.COOKIE_SECRET, {
  path: '/',
  maxAge:  3600000 * 24 * 7 ,
  secure: process.env.COOKIE_SECURE_OFF === 'yes' ? false : true,
  httpOnly: true,
  sameSite: false
}));


// Session Configuration
app.use(expressSession({
  saveUninitialized : true,
  resave            : true,
  secret            : process.env.SESSION_SECRET,
  //store             : new MemoryStore(),
/*  store             : new FileStore({
    ttl: 3600 * 24 * 31
  }),*/
  key               : 'authorization.sid',
  cookie            : {
    maxAge:  3600000 * 24 * 7 ,
//    secure: process.env.COOKIE_SECURE_OFF === 'yes' ? false : true,
//    httpOnly: true,
    sameSite: false,
    path: '/'
  },
  store: new FileStore({
    ttl: 3600 * 24 * 31
  }),

}));
app.use(flash());

app.use(enrichMw.run);

// redirect the index page to the admin section
app.get('/', (req, res) => {
  res.redirect('/admin');
});

app.use(
  authMw.check,
  authMw.fetchUserData
);

/**
 * Make sure user is isAuthenticated & has rights to access
 */
app.use('/admin',
  authMw.ensureAuthenticated,
  authMw.ensureRights
);

app.get('/admin', (req, res) => {
  Site
    .fetchAll()
    .then(function (resData) {
      const sites = resData.serialize();

      res.render('overview.html', {
        sites: sites
      });
  });
});

app.get('/admin/site/:siteId/idea/:ideaId',
  ideaMw.oneForSite,
  siteMw.withOne,
  (req, res) => {
    res.render('site/idea/form.html');
  }
);

app.get('/admin/site/:siteId/idea',
  siteMw.withOne,
  (req, res) => {
    res.render('site/idea/form.html');
  }
);

app.post('/admin/site/:siteId/idea/:ideaId',
  ideaMw.oneForSite,
  siteMw.withOne,
  (req, res, next) => {


    const body = {};

    if (req.body.title) {
      body.title = req.body.title;
    }

    if (req.body.description) {
      body.description = req.body.description;
    }

    if (req.body.summary) {
      body.summary = req.body.summary;
    }

    if (req.body.location) {
      body.location = req.body.location;
    }

    if (req.body.thema) {
      body.thema = req.body.thema;
    }

    if (req.body.status) {
      body.status = req.body.status;
    }


    const options = {
       method: 'PUT',
        uri:  apiUrl + `/api/site/${req.params.siteId}/idea/${req.params.ideaId}`,
        headers: {
            'Accept': 'application/json',
            "X-Authorization" : ` Bearer ${req.session.jwt}`,
        },
        body: body,
        json: true // Automatically parses the JSON string in the response
    };

    console.log('===> req.body', req.body);

    console.log('===> options', options);

    rp(options)
      .then(function (response) {
        console.log('===> response', response);
         const redirectTo = req.header('Referer')  || appUrl
         res.redirect(redirectTo);
      })
      .catch(function (err) {
        console.log('===> err', err);

         res.redirect(req.header('Referer')  || appUrl);
      });
  }
);


app.post('/admin/site/:siteId/idea/:ideaId/delete',
  (req, res, next) => {
    rp({
       method: 'DELETE',
        uri:  apiUrl + `/api/site/${req.params.siteId}/idea/${req.params.ideaId}`,
        headers: {
            'Accept': 'application/json',
            "X-Authorization" : ` Bearer ${req.session.jwt}`,
        },
        json: true // Automatically parses the JSON string in the response
    })
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
    let auth = `Bearer ${req.session.jwt}`;

    //image upload
    const body = {
      title: req.body.title,
      description: req.body.description,
      summary: req.body.summary,
      location: req.body.location,
  //    status: req.body.status,
  //    modBreak: req.body.modBreak,
      thema: req.body.thema
    };

    const options = {
        uri:  apiUrl + `/api/site/${req.params.siteId}/idea`,
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            "X-Authorization" : ` Bearer ${req.session.jwt}`,
        },
        body: body,
        json: true // Automatically parses the JSON string in the response
    };

    console.log('====> options', options);

    rp(options)
      .then(function (response) {
         req.flash('success', { msg: 'Aangemaakt!'});
         res.redirect(`/admin/site/${req.params.siteId}/ideas`);
         res.redirect(redirectTo);
      })
      .catch(function (err) {
        console.log('===> err', err);

        req.flash('error', { msg: 'Er gaat iets mis!'});
        res.redirect(req.header('Referer')  || appUrl);
      });
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
    console.log('Hit it');
    res.render('site/'+ req.params.page + '.html');
  }
);

app.get('/admin/site/:siteId/idea/:ideaId',
  ideaMw.oneForSite,
  siteMw.withOne,
  (req, res) => {
    res.render('site/'+ req.params.page + '.html');
  }
);

app.get('/admin/copy/:oldName/:newName', (req, res) => {
  copyDb(req.params.oldName, req.params.newName)
    .then(() => {
      res.status(200).json({ success: 'Copied DB'});
    })
    .catch((e) => {
      res.status(500).json({ error: 'An error occured: ' + e });
    });
});

app.post('/site', (req, res) => {
  const type = req.body.type;
  const stagingUrl = slugify(req.body.stagingName) + '.' + process.env.WILDCARD_HOST;
  const productionUrl = cleanUrl(req.body.productionUrl);

  dbExists(type)
    .then((exists) => {
      const dbName = exists ? type : process.env.DEFAULT_DB;
      const stagingUrlDB = stagingUrl.replace(/\./g, '');

      /**
       * Create database for stagingUrl
       */
      copyDb(dbName, stagingUrlDB)
        .then((response) => {
          new Site({
            'name': req.body.siteName,
            'productionUrl': productionUrl,
            'stagingUrl': stagingUrl,
            'stagingName': req.body.stagingName,
            'fromEmail': req.body.fromEmail,
            'fromName': req.body.fromName,
          })
          .save()
          .then((site) => { res.redirect('https://' + stagingUrl); });
        })
        .catch((e) => {
          res.status(500).json({ error: 'An error occured copying the DB: ' + e.msg });
        });
    })
    .catch((e) => {
      console.log(e);
      res.status(500).json({ error: 'An error occured checking if the DB exists: ' + e.msg });
    })
});

app.post('/site/:siteId', (req, res) => {
  const siteId = req.params.siteId;
  const type = req.body.type;
  //const stagingUrl = slugify(req.body.stagingName) + '.' + process.env.WILDCARD_HOST;
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

app.get('/login', (req, res, next) => {
  res.render('login.html');
});

app.get('/oauth/login', (req, res, next) => {
  const fullUrl = appUrl + '/admin' //+ req.originalUrl;
  const redirectUrl = `${apiUrl}/oauth/login?redirectUrl=${fullUrl}`;
  console.log('====>redirectUrl', redirectUrl);
  res.redirect(redirectUrl);
});

app.get('/logout', (req, res, next) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.listen(process.env.PORT, function() {
  console.log('Express server listening on port ' + process.env.PORT);
});

module.exports = app;
