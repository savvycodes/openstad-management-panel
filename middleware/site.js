const Site              = require('../models').Site;


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
