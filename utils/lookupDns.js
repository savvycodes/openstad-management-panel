const dns = require('dns');
const cleanUrl = require('./cleanUrl');

module.exports = async (domain, timeout) => {
  return new Promise((resolve, reject) => {
    console.log('domain 1', domain)

    domain = cleanUrl(domain);
    console.log('domain 2', domain)
    setTimeout(() => {
      console.log('custom DNS timeout')
      resolve(false);
    }, timeout);

    dns.lookup(, (err, address, family) => {
      console.log('err', err)
      if(err) resolve(false);
      resolve(address);
    });
  });
};
