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
  params.limit = req.query.limit ? req.query.limit  : 10000000;
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

exports.getGeneratorStatus =  (req, res, next) => {

  const params = req.query ? req.query : {};
  params.clientId = req.authClientId;

  let session = req.session;
  params.taskId = session.uniqueCodeGenerator && session.uniqueCodeGenerator.taskId;
  if (!params.taskId) return next();

  return uniqueCodeApiService
    .getGeneratorStatus(params)
    .then((result) => {
      let status = result;
      if (!result.amountOfCodes && !result.generatedCodes) throw 'Leeg';
      if (status.error && status.error.message) status.error = status.error.message;
      res.generatorStatus = status;
      res.locals.generatorStatus = res.generatorStatus;
      return next();
    })
    .catch(async (err) => {
      delete req.session.uniqueCodeGenerator;
      await req.session.save();
      return next(); // ignore in response
    });
}
