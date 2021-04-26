const dns = require('dns');
const cleanUrl = require('./cleanUrl');

module.exports = async (domain, timeout) => {
  return new Promise((resolve, reject) => {
    console.log('domain 1', domain, cleanUrl)

    let cleanDomain = cleanUrl(domain);
    console.log('domain 2', cleanDomain, cleanDomain.startsWith('localhost'));

    if (cleanDomain.startsWith('localhost')) {
      console.log('resolve 2', true);
      return resolve(true);
    }

    setTimeout(function(){
      console.log('custom DNS timeout')
      resolve(false);
    }, timeout);

    dns.lookup(cleanDomain, (err, address, family) => {
      console.log('err', err)
      if(err) resolve(false);
      resolve(address);
    });
  });
};
