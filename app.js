// Load environment variables from .env file
var dotenv = require('dotenv');
dotenv.load();
const express     = require('express');
const isDev       = process.env.ENVIRONMENT === 'development';
const Site        = require('./models').Site;
const bodyParser  = require('body-parser');
const cookieParser                = require('cookie-parser');
const expressSession              = require('express-session')
const nunjucks    = require('nunjucks');
const flash       = require('express-flash');
const app         = express();
const cleanUrl = (url) => {
  return url.replace(['http://', 'https://'], '');
}

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
  secret            : 'aasdas',//config.session.secret,
//  store             : new MemoryStore(),
//  store             : new FileStore({
//    ttl: 3600 * 24 * 31
//  }),
  key               : 'authorization.sid',
  cookie            : {
  //  maxAge: config.session.maxAge,
    secure: process.env.COOKIE_SECURE_OFF === 'yes' ? false : true,
    httpOnly: true,
    sameSite: false
  },

}));
app.use(flash());


app.use((req, res, next) => {
  res.locals.productionServerIp = process.env.PRODUCTION_SERVER_IP;
  res.locals.wildcardHost = process.env.WILDCARD_HOST;
  next();
});


app.get('/', (req, res) => {
  Site
    .fetchAll()
    .then(function (resData) {
      const sites = resData.serialize();

      res.render('overview.html', {
        sites: sites
      });
  });
});

app.get('/beheer/site/:siteId', (req, res) => {
  new Site({
    id: req.params.siteId
  })
    .fetch()
    .then(function (site) {
      res.render('site/main.html', {
        site: site.serialize()
      });
    });
});

app.get('/beheer/site/:siteId/:page', (req, res) => {
  new Site({
    id: req.params.siteId
  })
    .fetch()
    .then(function (site) {
      res.render('site/'+ req.params.page + '.html', {
        site:  site.serialize()
      });
    });
});

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

      console.log('stagingUrlDB', stagingUrlDB);
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

app.listen(process.env.PORT, function() {
  console.log('Express server listening on port ' + process.env.PORT);
});

module.exports = app;
