const dns = require('dns');
module.exports = async (domain) => {
  return new Promise((resolve, reject) => {
    dns.lookup(domain, (err, address, family) => {
      if(err) reject(err);
      resolve(address);
    });
  });
};
