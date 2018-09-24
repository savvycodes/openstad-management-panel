// Load environment variables from .env file
var dotenv = require('dotenv');
dotenv.load();
const express = require('express');
const isDev = process.env.ENVIRONMENT === 'development';
const Site = require('./models').Site;
const bodyParser = require('body-parser');
const app = express();
const nunjucks = require('nunjucks');

//app.set('views', __dirname + '/templates');

const nunjucksEnv = nunjucks.configure('templates', {
  autoescape: true,
  express: app
});

const copyDb = require('./services/mongo').copyMongoDb;
const dbExists = require('./services/mongo').dbExists;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

const cleanUrl = (url) => {
  return url.replace(['http://', 'https://'], '');
}

app.get('/', (req, res) => {
  console.log('---> 1');

  Site.fetchAll().then(function (resData) {
    const sites = resData;
    console.log('---> 2', resData);

    res.render('overview.html', {
      sites: sites
    });
  });
});

app.get('/beheer/site/:siteId', (req, res) => {
  Site.fetch(req.params.siteId).then(function (site) {
    res.render('site.html', {
      site: site
    });
  });
});

app.get('/beheer/copy/:oldName/:newName', (req, res) => {
  copyDb(req.params.oldName, req.params.newName)
    .then(() => {
      res.status(200).json({ success: 'Copied DB'});
    })
    .catch(() => {
      res.status(500).json({ error: 'An error occured: ' + e.msg });
    });
});

app.post('/site', (req, res) => {
  const type = req.body.type;
  const stagingUrl = cleanUrl(req.body.stagingUrl);
  const productionUrl = cleanUrl(req.body.productionUrl);
  dbExists(type)
    .then((exists) => {
      const dbName = exists ? type : 'default';

      /**
       * Create database for stagingUrl
       */
      copyDb(dbName, stagingUrl)
        .then(() => {
          Site.add({
            'name': req.body.siteName,
            'productionUrl': productionUrl,
            'stagingUrl': stagingUrl,
            'fromEmail': req.body.fromEmail,
            'fromName': req.body.fromName,
          }).then(function (site) {
            res.redirect(stagingUrl);
          });
        })
        .catch((e) => {
          res.status(500).json({ error: 'An error occured copying the DB: ' + e.msg });
        });
    })
    .catch(() => {

    })
});

app.listen(3000, function() {
  console.log('Express server listening on port ' + 3000);
});

module.exports = app;
