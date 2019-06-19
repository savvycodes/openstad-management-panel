const mapConfig = require('../config/map').default;
const authTypes = require('../config/auth').types;

exports.run = (req, res, next) => {
  res.locals.assetsUrl            = process.env.API_URL + '/upload';
  res.locals.ssoUrl               = process.env.SSO_URL;
  res.locals.ssoLoginUrl          = process.env.SSO_LOGIN_URL
  res.locals.ssoAccountUrl        = process.env.SSO_ACCOUNT_URL;
  res.locals.productionServerIp   = process.env.PRODUCTION_SERVER_IP;
  res.locals.wildcardHost         = process.env.WILDCARD_HOST;
  res.locals.appUrl               = process.env.APP_URL;
  res.locals.apiUrl               = process.env.API_URL;
  res.locals.emailAssetsUrl       = process.env.EMAIL_ASSETS_URL;
  res.locals.authTypes            = authTypes;
  res.locals.config               = { openStadMap: mapConfig }
  next();
}
