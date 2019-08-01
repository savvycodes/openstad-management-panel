const Site = require('../models').Site;
const siteApiService = require('../services/siteApi');


exports.withOne = (req, res, next) => {
  siteApiService
    .fetch(req.session.jwt, req.params.siteId)
    .then((site) => {
      req.site = site;
      req.siteData = site;
      res.locals.site = req.siteData;
      next();
    })
    .catch((err) => {
      next(err);
    });
}

exports.addAuthClientId = (req, res, next) => {
  req.authClientId = req.site.config.oauth["auth-client-id"];
  res.locals.authClientId = req.site.config.oauth["auth-client-id"];
  next();
}

exports.withAll = (req, res, next) => {
  siteApiService
    .fetchAll(req.session.jwt)
    .then((sites) => {
      req.sites = sites;
      res.locals.sites = req.sites;
      next();
    })
    .catch((err) => {
      next(err);
    });
}
