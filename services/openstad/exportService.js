const fs = require('fs').promises;
const tar = require('tar');
const fetch = require('node-fetch');

const lookupDns = require('../../utils/lookupDns');
const protocol = process.env.FORCE_HTTP ? 'http' : 'https';

/**
 * Export Openstad environment to a tar file
 * @param openstadData
 * @param domain
 * @param requestBody
 * @param dir
 * @param filename
 *
 * @returns {Promise<*>}
 */
exports.export = async (openstadData, domain, requestBody, dir, filename) => {

  // write choiceGuide to file
  if (requestBody['choice-guides'] && openstadData.apiData.choiceGuides) {
    await Promise.all(openstadData.apiData.choiceGuides.map(async (choiceGuide) => {
      const json = JSON.stringify(choiceGuide);
      return await fs.writeFile(dir + `/api/choicesguide-${choiceGuide.id}.json`, json)
    }));
  }

  if (requestBody['cms-attachments'] && openstadData.cmsData.attachments) {
    const domainIsUp = await lookupDns(domain, 3000);
    if (domainIsUp === false) {
      throw new Error('Not able to fetch attachments because the current site is down');
    }
    const cmsUrl = protocol + '://' + domain;
    await Promise.all(openstadData.cmsData.attachments.map(async (filename) => {
      const res = await fetch(cmsUrl + '/uploads/attachments/' + filename)
      return await fs.writeFile(dir + '/attachments/' + filename, await res.buffer());
    }));
  }

  //mv mongo export to export-dir/mongo
  await fs.rename(openstadData.cmsData.mongoPath, dir + '/' + 'mongo');

  //export oauth clients
  await openstadData.oauthData.clients.map(async (oauth) => {
    const {key, data} = oauth;
    const json = JSON.stringify(data);
    return await fs.writeFile(dir + '/oauth/' + key + '.json', json + '\n')
  });

  // export site data
  await fs.writeFile(dir + '/api/site.json', JSON.stringify(openstadData.apiData.site));

  // export tar
  await tar.create(
    {
      gzip: true,
      cwd: dir,
      file: filename,
    },
    ['.']);

  return filename;
};
