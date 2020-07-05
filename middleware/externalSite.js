const siteApiService = require('../services/externalSiteApi');

exports.withAll = (req, res, next) => {
  siteApiService
    .fetchAll()
    .then((externalSites) => {
      req.externalSites = externalSites;
      res.locals.externalSites = req.externalSites;
      next();
    })
    .catch((err) => {
      console.log('err', err);
      next(err);
    });
}
