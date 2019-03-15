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

const cleanUrl = (url) => {
  return url.replace(['http://', 'https://'], '');
}

const apiUrl = process.env.API_URL;

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

const copyDb = require('./services/mongo').copyMongoDb;
const dbExists = require('./services/mongo').dbExists;
const deleteMongoDb =  require('./services/mongo').deleteDb;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

app.use(cookieParser());

// Session Configuration
app.use(expressSession({
  saveUninitialized : true,
  resave            : true,
  secret            : process.env.SESSION_SECRET,
//  store             : new MemoryStore(),
  store             : new FileStore({
    ttl: 3600 * 24 * 31
  }),
  key               : 'authorization.sid',
  cookie            : {
  //  maxAge: config.session.maxAge,
    secure: process.env.COOKIE_SECURE_OFF === 'yes' ? false : true,
    httpOnly: true,
    sameSite: false
  },

}));
app.use(flash());

app.use(enrichMw.run);

// redirect the index page to the admin section
app.get('/', (req, res) => {
  res.redirect('/beheer');
});

app.use(
  authMw.check,
  authMw.fetchUserData
);

/**
 * Make sure user is isAuthenticated & has rights to access
 */
app.use('/beheer',
  authMw.ensureAuthenticated,
  authMw.ensureRights
);

app.get('/beheer', (req, res) => {
  Site
    .fetchAll()
    .then(function (resData) {
      const sites = resData.serialize();

      res.render('overview.html', {
        sites: sites
      });
  });
});

app.get('/beheer/site/:siteId/idea/:ideaId',
  ideaMw.oneForSite,
  siteMw.withOne,
  (req, res) => {
    res.render('site/idea/form.html');
  }
);

app.get('/beheer/site/:siteId/idea',
  siteMw.withOne,
  (req, res) => {
    res.render('site/idea/form.html');
  }
);

app.post('/beheer/site/:siteId/idea/:ideaId',
  ideaMw.oneForSite,
  siteMw.withOne,
  (req, res, next) => {
    let auth = ` Bearer ${req.session.jwt}`;

    //image upload
    const body = {
      title: req.body.title,
      description: req.body.description,
      summary: req.body.summary,
      location: req.body.location,
      status: req.body.status,
      modBreak: req.body.modBreak,
      thema: req.body.thema
    }

    const options = {
       method: 'POST',
        uri:  apiUrl + `/api/site/${req.params.siteId}/idea/${req.params.ideaId}`,
        headers: {
            'Accept': 'application/json',
            "Authorization" : auth,
        },
        body: body,
        json: true // Automatically parses the JSON string in the response
    };



    rp(options)
      .then(function (response) {
        console.log('===> response', response);
         const redirectTo = req.header('Referer')  || appUrl
         res.redirect(redirectTo + '/#arg'+response.id);
      })
      .catch(function (err) {
        console.log('===> err', err);

         res.redirect(req.header('Referer')  || appUrl);
      });
  }
);

app.post('/beheer/site/:siteId/idea',
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
      status: req.body.status,
      modBreak: req.body.modBreak,
      thema: req.body.thema
    };

    const options = {
        uri:  apiUrl + `/api/site/${req.params.siteId}/idea`,
        headers: {
            'Accept': 'application/json',
            "Authorization" : auth,
        },
        body: body,
        json: true // Automatically parses the JSON string in the response
    };

    console.log('====> options', options);

    rp(options)
      .then(function (response) {
        console.log('===> response', response);

         req.flash('success', { msg: 'Opgeslagen!'});
         const redirectTo = req.header('Referer')  || appUrl;
         res.redirect(redirectTo + '/#arg'+response.id);
      })
      .catch(function (err) {
        console.log('===> err', err);

        req.flash('error', { msg: 'Er gaat iets mis!'});
        res.redirect(req.header('Referer')  || appUrl);
      });
  }
);

app.get('/beheer/site/:siteId',
  siteMw.withOne,
  (req, res) => {
    res.render('site/main.html');
  }
);

app.get('/beheer/site/:siteId/:page',
  siteMw.withOne,
  (req, res) => {
    res.render('site/'+ req.params.page + '.html');
  }
);

app.get('/beheer/site/:siteId/idea/:ideaId',
  ideaMw.oneForSite,
  siteMw.withOne,
  (req, res) => {
    res.render('site/'+ req.params.page + '.html');
  }
);

app.get('/beheer/copy/:oldName/:newName', (req, res) => {
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
        res.redirect('/beheer/site/' + site.id + '/settings');
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
  const fullUrl = req.protocol + '://' + req.get('host') + '/beheer' //+ req.originalUrl;
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
