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

exports.withOneForSite = (req, res, next) => {
  const site          = req.site;
  const authClientId  = req.site.config.oauth["auth-client-id"];

  userClientApi
    .fetch(authClientId)
    .then((client) => {
      req.userApiClient = client;
      res.locals.userApiClient = req.userApiClient;
      res.locals.userApiClient.requiredUserFields = res.locals.userApiClient.requiredUserFields ? res.locals.userApiClient.requiredUserFields : [];
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
