const choicesGuideApi = require('../choicesGuideApi');
const mongoService = require('../mongo');
const userClientApi = require('../userClientApi');
const siteApi = require('../siteApi');

exports.getSiteData = async(newSite, siteIdToCopy) => {
  const siteToCopy = await siteApi.fetch(siteIdToCopy);

  //Todo: Validate necessary site data.

  const [choiceGuides, attachments, oauthClients, mongoPath] = await Promise.all([
    getChoicesGuide(siteToCopy.id),
    getCmsAttachments(siteToCopy.config && siteToCopy.config.cms && siteToCopy.config.cms.dbName),
    getOauthData(siteToCopy.config && siteToCopy.config.oauth || {}),
    exportCmsDatabase(newSite, siteToCopy.config.cms.dbName)
  ]);

  const apiData = {site: siteToCopy, choiceGuides: choiceGuides};
  const cmsData = {attachments: attachments, mongoPath};
  const oauthData = {clients: oauthClients};

  return {apiData, cmsData, oauthData};
};

const getChoicesGuide = async (siteId) => {
  const choicesGuides = await choicesGuideApi.fetchAll(siteId);

  const promises = choicesGuides.map(async choiceGuide => {
    return await choicesGuideApi.fetch(siteId, choiceGuide.id);
  });

  return Promise.all(promises);
};

const getCmsAttachments = async (dbName) => {
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

const getOauthData = async (oauthConfig) => {
  const promises = Object.keys(oauthConfig).map(async key => {
    return {
      key,
      data: await userClientApi.fetch(oauthConfig[key]['auth-client-id'])
    };
  });

  return await Promise.all(promises)
};

const exportCmsDatabase = async (newSite, dbName) => {
  const tmpDir = process.env.TMPDIR || './tmp';
  const mongoPath = tmpDir + newSite.getUniqueSiteId();
  await mongoService.export(dbName, mongoPath);

  return `${mongoPath}/${dbName}`;
}
