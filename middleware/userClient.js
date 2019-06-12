

const userClientApi = require('../services/userClientApi');

exports.withOne = (req, res, next) => {
  userClientApi
    .fetch(req.session.jwt, req.params.clientId)
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
    .fetchAll(req.session.jwt)
    .then((clients) => {
      req.userApiClients = clients;
      res.locals.userApiClients = req.clients;
      next();
    })
    .catch((err) => {
      next(err);
    });
}
