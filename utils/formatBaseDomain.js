const { URL } = require('url');
const ensureUrlHasProtocol = require('./ensureUrlHasProtocol')

module.exports = (domain) => {
  domain = ensureUrlHasProtocol(domain)
//  const hostname = domain.startsWith('localhost') ? 'localhost' : new URL(domain).hostname;
  const hostname = new URL(domain).hostname;
  return hostname;
}
