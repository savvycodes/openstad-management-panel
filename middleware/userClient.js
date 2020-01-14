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
  const authClientIdDefault = req.site.config && req.site.config.oauth && req.site.config.oauth.default ? req.site.config.oauth.default["auth-client-id"]  : false;
  const authClientId  = authClientIdDefault ? authClientIdDefault : (req.site.config && req.site.config.oauth ? req.site.config.oauth["auth-client-id"] : false);

  userClientApi
    .fetch(authClientId)
    .then((client) => {
      req.userApiClient = client;
      res.locals.userApiClient = req.userApiClient;
      res.locals.userApiClient.requiredUserFields = res.locals.userApiClient.requiredUserFields ? res.locals.userApiClient.requiredUserFields : [];
      next();
    })
    .catch((err) => {
  //   console.log('==>> err', err);
      next();
    });
}

exports.withAllForSite = (req, res, next) => {
  req.siteClients = [];
  const site          = req.site;
  const oauthConfig   = req.site.config.oauth;
  const fetchActions = [];
  const fetchClient = (req, oauthClientId) => {
    return new Promise((resolve, reject) => {
      return userClientApi
        .fetch(oauthClientId)
        .then((client) => {
          req.siteClients.push(client);
          resolve();
        })
        .catch((err) => {
          console.log('==>> err', oauthClientId, err.message);
          resolve();
        });
    })
  }

  if (oauthConfig && Object.keys(oauthConfig).length > 0) {
    Object.keys(oauthConfig).forEach((configKey) => {
      let oauthClientId = oauthConfig[configKey]["auth-client-id"];
      fetchActions.push(fetchClient(req, oauthClientId));
    })
  } else {
    fetchActions.push(fetchClient(req, oauthClientId));
  }

  return Promise
          .all(fetchActions)
          .then(() => { next(); })
          .catch(() => { next(); });
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
