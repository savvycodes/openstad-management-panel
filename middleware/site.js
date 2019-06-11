const Site = require('../models').Site;
const siteApiService = require('../services/siteApi');

exports.withOne = (req, res, next) => {
  new Site({
    id: req.params.siteId
  })
  .fetch()
  .then((site) => {
    req.site = site;
    req.siteData = site.serialize();
    res.locals.site = req.siteData;
    next();
  })
  .catch((err) => {
    next(err);
  })
}

exports.withAll = (req, res, next) => {
  siteApiService
    .fetchAll()
    .then((sites) => {
      req.sites = sites;
      res.locals.sites = req.sites;
      next();
    })
    .catch((err) => {
      next(err);
    });
}
