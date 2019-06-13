const userClientApi = require('../services/userClientApi');

exports.withOne = (req, res, next) => {
  userClientApi
    .fetch(req.params.clientId)
    .then((client) => {
      req.userApiClient = client;
      res.locals.userApiClient = req.client;
      next();
    })
    .catch((err) => {
      next(err);
    });
}

exports.withAll = (req, res, next) => {
  userClientApi
    .fetchAll()
    .then((clients) => {
      req.userApiClients = clients;
      res.locals.userApiClients = req.userApiClients;
      next();
    })
    .catch((err) => {
      next(err);
    });
}
