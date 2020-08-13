const siteApiService = require('../services/externalSiteApi');

exports.withAll = (req, res, next) => {
  siteApiService
    .fetchAll()
    .then((externalSites) => {
      if (typeof externalSites == 'string') {
        try {
          req.externalSites = JSON.parse(externalSites);
        } catch(err) {}
      } else {
        req.externalSites = externalSites;
      }
      res.locals.externalSites = req.externalSites;
      return next();
    })
    .catch((err) => {
      console.log('err', err);
      req.externalSites = [];
      res.locals.externalSites = req.externalSites;
      next();
    });
}
