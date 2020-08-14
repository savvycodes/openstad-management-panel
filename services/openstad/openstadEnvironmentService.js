const fs = require('fs').promises;

const apiProvider = require('../../providers/apiProvider');
const cmsProvider = require('../../providers/cmsProvider');
const oauthProvider = require('../../providers/oauthProvider');

const siteApi = require('../siteApi');
const k8Ingress = require('../k8/ingress');

const SiteData = require('./models/siteData');

const lookupDns = require('../../utils/lookupDns');
const removeFolderRecursive = require('../../utils/removeFolderRecursive');

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
    console.log('domain is up: ', isDomainUp);
    await validateInput(apiData, oauthData, cmsData);


    console.log('creating oauth clients');
    const oauthClients = await oauthProvider.createOauth(newSite, oauthData.clients);
    console.log('done');

    console.log('import cms database');
    await cmsProvider.importCmsDatabase(newSite, cmsData.mongoPath);
    console.log('done');

    console.log('creating site in api');
    const site = await apiProvider.createSite(newSite, apiData.site, oauthClients);
    console.log('done');


    if (apiData.choiceGuides) {
      console.log('creating choiceguides in api');
      await apiProvider.createChoiceGuides(site.id, apiData.choiceGuides);
      console.log('done');
    }

    if (apiData.site.config.oauth.default.id) {
      console.log('make user site admin');
      await oauthProvider.makeUserSiteAdmin(user.externalUserId, apiData.site.config.oauth.default.id);
      console.log('done');
    }

    if (isDomainUp && cmsData.attachments && cmsData.attachments.length > 0) {
      console.log('import cms attachments');
      const frontendUploadDomain = process.env.FRONTEND_URL; // Use the default frontend url for now because the new site doesn't have an ingress yet
      await cmsProvider.importCmsAttachments(frontendUploadDomain, newSite.getTmpDir(), cmsData.attachments);
      console.log('done');
    }

    // Try to remove import files
    try {
      removeFolderRecursive(newSite.getTmpDir());
    } catch(error) {
      console.error(error);
    }

    if (process.env.KUBERNETES_NAMESPACE) {
      // Todo: Move this to the a cronjob (api or admin).
      const domainIp = await lookupDns(newSite.getDomain(), 2000);
      if(k8Ingress.getExternalIps().some(ip => ip === domainIp)) {
        await k8Ingress.add(newSite);
      }
    }

    console.log('return new site: ', site);
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

  // Todo: check if there are images and the frontend url is available
  if(cmsData.attachments && cmsData.attachments.length > 0) {
    const frontendIsUp = await lookupDns(process.env.FRONTEND_URL, 2000);
    if(frontendIsUp === false) {
      throw new Error(`Frontend url (${process.env.FRONTEND_URL}) is not reachable`);
    }
  }

  return true;
};
