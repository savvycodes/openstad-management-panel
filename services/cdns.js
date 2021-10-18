exports.contructReactAdminCdn = async function() {

  // construct cdn urls
  let openstadReactAdminCdn = process.env.OPENSTAD_REACT_ADMIN_CDN || 'https://cdn.jsdelivr.net/npm/openstad-react-admin@{version}/dist';
  if (openstadReactAdminCdn.match('{version}')) {

    try {
      const fs = require('fs').promises;
      const util = require('util');
      const exec = util.promisify(require('child_process').exec);
      
      let { stdout, stderr } = await exec('git rev-parse --abbrev-ref HEAD');
      let branch = stdout && stdout.toString();
      branch = branch.trim();

      let tag = 'alpha';
      if (branch == 'release') tag = 'beta';
      if (branch == 'master') tag = 'latest';
      
      // get current published version
      ({ stdout, stderr } = await exec('npm view --json openstad-react-admin'));
      let info = stdout && stdout.toString();
      info = JSON.parse(info)
      let version = info['dist-tags'][tag];
      if (!version) {
        // fallback
        let packageFile = fs.readFileSync(`${__dirname}/package.json`).toString() || '';
        let match = packageFile && packageFile.match(/"openstad-react-openstadComponentsCdn":\s*"(?:[^"\d]*)((?:\d+\.)*\d+)"/);
        version = match && match[1] || null;
      }
      openstadReactAdminCdn = openstadReactAdminCdn.replace('{version}', version);
    } catch (err) {console.log('Error constructing cdn url', err);}

  }

  return openstadReactAdminCdn;
  
}
