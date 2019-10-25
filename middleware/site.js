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
  let defaultClient = req.site.config.oauth.default ? req.site.config.oauth.default : req.site.config.oauth;
  req.authClientId = defaultClient["auth-client-id"];
  res.locals.authClientId = defaultClient["auth-client-id"];
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
