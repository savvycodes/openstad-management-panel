const newsletterApiService = require('../services/newsletterApi');

exports.allForSite = (req, res, next) => {
  newsletterApiService
    .fetchAll(req.site.id)
    .then((newsletterSubsribers) => {
      req.newsletterSubsribers = newsletterSubsribers;
      res.locals.newsletterSubsribers = newsletterSubsribers;
      next();
    })
    .catch((err) => {
      next(err);
    });
}
