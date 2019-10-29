const uniqueCodeApiService = require('../services/uniqueCodeApi');

exports.withOne = (req, res, next) => {
  uniqueCodeApiService
    .fetch(req.params.uniqueCodeId)
    .then((uniqueCode) => {
      req.uniqueCode = uniqueCode;
      res.locals.uniqueCode = req.uniqueCode;
      next();
    })
    .catch((err) => {
      next(err);
    });
}


exports.withAll = (req, res, next) => {
  uniqueCodeApiService
    .fetchAll(req.query.params)
    .then((uniqueCodes) => {
      req.uniqueCodes = uniqueCodes;
      res.locals.uniqueCodes = req.uniqueCodes;
      next();
    })
    .catch((err) => {
      next(err);
    });
}

exports.withAllForClient = (req, res, next) => {
  const params = req.query ? req.query : {};
  params.clientId = req.authClientId;

  uniqueCodeApiService
    .fetchAll(params)
    .then((uniqueCodes) => {
      req.uniqueCodes = uniqueCodes;
      res.locals.uniqueCodes = req.uniqueCodes;
      next();
    })
    .catch((err) => {
      next(err);
    });
}
