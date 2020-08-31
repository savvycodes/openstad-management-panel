const dns = require('dns');
const cleanUrl = require('./cleanUrl');

module.exports = async (domain, timeout) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(false), timeout);

    dns.lookup(cleanUrl(domain), (err, address, family) => {
      console.log('err')
      if(err) resolve(false);
      resolve(address);
    });
  });
};
