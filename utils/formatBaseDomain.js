const { URL } = require('url');

module.exports = (domain) => {
//  const hostname = domain.startsWith('localhost') ? 'localhost' : new URL(domain).hostname;
  const hostname = domain.startsWith('localhost') ? 'localhost' : domain;
  return hostname;
}
