const dns = require('dns');
module.exports = async (domain, timeout) => {
  console.log(domain);
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(false), timeout);

    dns.lookup(domain, (err, address, family) => {
      if(err) resolve(false);
      resolve(true);
    });
  });
};
