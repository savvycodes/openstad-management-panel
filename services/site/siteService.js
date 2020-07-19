const tmpDir = process.env.TMPDIR || './tmp';
const fs = require('fs').promises;
const choicesGuideApi = require('../../services/choicesGuideApi');
const mongoService = require('../../services/mongo');
const userClientApi = require('../../services/userClientApi');

exports.getSiteData = async (jwt, site) => {
  // prepare
  console.log('Export prepare');
  let id = Math.round(new Date().getTime() / 1000);
  // get Config
  const config = {
    id,
    dir: tmpDir + '/' + id,
    filename: tmpDir + '/' + id + '.export.tgz',
    dbName: site.config && site.config.cms && site.config.cms.dbName,
    site: site,
  };

  if (!config.dbName) {
    throw new Error('site not found');
  }

  // Create dirs
  const dir = await fs.mkdir(config.dir);

  // await fs.mkdir(dir + '/oauth');
  // await fs.mkdir(dir + '/attachments');
  // await fs.mkdir(dir + '/api');


  // Do async?

  const choiceGuides = await getChoicesGuide(jwt, site.id);
  const attachments = await getCmsAttachments(config.dbName);
  const oauthData = await getOauthData(site.config && site.config.oauth || {});

  // Todo: create mongo backup
  // Todo: get more info like ideas etc.


  console.log(site, choiceGuides, attachments, oauthData);
};

exports.getChoicesGuide = async (jwt, siteId) => {
  const choicesGuides = await choicesGuideApi.fetchAll(jwt, siteId);

  const promises = choicesGuides.map(async choiceGuide => {
    return await choicesGuideApi.fetch(jwt, siteId, choiceGuide.id);
  });

  return Promise.all(promises);
};

exports.getCmsAttachments = async (dbName) => {
  const aposDocuments = await mongoService.query(dbName, 'aposDocs');

  const files = [];
  aposDocuments.forEach((entry) => {
    if (entry.published === true && entry.trash === false) {
      if (entry.type === 'apostrophe-file' || entry.type === 'apostrophe-image') {
        files.push(entry.attachment._id + '-' + entry.attachment.name + '.' + entry.attachment.extension);
      }
      if (entry.type === 'apostrophe-image') {
        ['.full', '.max', '.one-half', '.one-sixth', '.one-third', '.two-thirds'].forEach((size) => {
          files.push(entry.attachment._id + '-' + entry.attachment.name + size + '.' + entry.attachment.extension);
        });
      }
    }
  });

  return files;
};

const createMongoBackup = async (dbName, dir) => {
  await mongoService.export(dbName, dir);

  return fs.rename(dir + '/' + dbName, dir + '/' + 'mongo');
};

exports.getOauthData = async (oauthConfig) => {
  const promises = Object.keys(oauthConfig).map(async key => {
    return {
      key,
      data: await userClientApi.fetch(oauthConfig[key]['auth-client-id'])
    };
  });

  return await Promise.all(promises)
};
