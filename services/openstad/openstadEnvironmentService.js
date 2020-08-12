const fs = require('fs').promises;

const apiProvider = require('../../providers/apiProvider');
const cmsProvider = require('../../providers/cmsProvider');
const oauthProvider = require('../../providers/oauthProvider');

const siteApi = require('../siteApi');

const SiteData = require('./models/siteData');

const lookupDns = require('../../utils/lookupDns');

/**
 * Get all Openstad project data
 * @param uniqueSiteId
 * @param siteIdToCopy
 * @param includeChoiceGuide
 * @param includeCmsAttachments
 *
 * @returns {Promise<SiteData>}
 */
exports.get = async(uniqueSiteId, siteIdToCopy, includeChoiceGuide, includeCmsAttachments) => {
  const siteToCopy = await siteApi.fetch(siteIdToCopy);

  //Todo: Validate necessary site data.
  const [choiceGuides, attachments, oauthClients, mongoPath] = await Promise.all([
    includeChoiceGuide ? apiProvider.getChoiceGuides(siteToCopy.id) : null,
    includeCmsAttachments ? cmsProvider.getAttachments(siteToCopy.config && siteToCopy.config.cms && siteToCopy.config.cms.dbName) : null,
    oauthProvider.getData(siteToCopy.config && siteToCopy.config.oauth || {}),
    cmsProvider.exportDatabase(uniqueSiteId, siteToCopy.config.cms.dbName)
  ]);

  return new SiteData(siteToCopy, choiceGuides, attachments, mongoPath, oauthClients);
};

/**
 * Get all Openstad project data from import file
 * @param dir
 *
 * @returns {Promise<void>}
 */
exports.getFromFiles = async(dir) => {
  const siteData = await fs.readFile(dir + '/api/site.json');
  const siteToCopy = JSON.parse(siteData);

  const oauth = await fs.readdir(dir + '/oauth');

  const oauthClients = await Promise.all(oauth.map(async filename => {
    const result = await fs.readFile(dir + '/oauth/' + filename);

    const key = filename.replace(/.json$/, '');
    return {key, data: JSON.parse(result.toString())};
  }));

  const apiDir = await fs.readdir(dir + '/api');
  const choiceGuides = await Promise.all(
    apiDir.filter(filename => filename.match(/^choicesguide-/)).map(async filename => {
      const result = await fs.readFile(dir + '/api/' + filename);

      return JSON.parse(result.toString());
    })
  );
  const cmsAttachments = await fs.readdir(dir + '/attachments');

  return new SiteData(siteToCopy, choiceGuides, cmsAttachments, dir + '/mongo', oauthClients);
};

/**
 * Create new Opestad project
 * @param user
 * @param newSite
 * @param apiData
 * @param cmsData
 * @param oauthData
 *
 * @returns {Promise<*>}
 */
exports.create = async (user, newSite, apiData, cmsData, oauthData) => {

  try {
    const isDomainUp = await lookupDns(newSite.getDomain(), 3000);

    await validateInput(apiData, oauthData, cmsData);

    const oauthClients = await oauthProvider.createOauth(newSite, oauthData.clients);
    await cmsProvider.importCmsDatabase(newSite, cmsData.mongoPath);
    const site = await apiProvider.createSite(newSite, apiData.site, oauthClients);

    if (apiData.choiceGuides) {
      await apiProvider.createChoiceGuides(site.id, apiData.choiceGuides);
    }

    if (apiData.site.config.oauth.default.id) {
      await oauthProvider.makeUserSiteAdmin(user.externalUserId, apiData.site.config.oauth.default.id);
    }

    if (isDomainUp && cmsData.attachments && cmsData.attachments.length > 0) {
      await cmsProvider.importCmsAttachments(newSite.getDomainWithProtocol(), newSite.getTmpDir(), cmsData.attachments);
    }

    // Try to remove import files
    try {
      await fs.rmdir(newSite.getTmpDir(), {recursive: true});
    } catch(error) {
      console.error(error);
    }

    return site;
  } catch (error) {
    //Todo: rollback created entities?
    // Get oauth clients and remove them
    // Get api site and remove if exists
    // Get choiceguides and remove if exists

    console.error(error);
    throw error;
  }
};

const validateInput = async (apiData, oauthData, cmsData) => {
  if (!cmsData.mongoPath) {
    throw new Error('No mongo path found');
  }

  const mongoFiles = await fs.readdir(cmsData.mongoPath);
  if(mongoFiles.length === 0) {
    throw new Error('No mongo path is empty');
  }

  if (!apiData.site || !apiData.site.config) {
    throw new Error('Site or site config is empty');
  }
  if (!oauthData || !oauthData.clients) {
    throw new Error('No Oauth clients found');
  }

  return true;
};
