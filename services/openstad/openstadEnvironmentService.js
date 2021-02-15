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

    // in case localhost domain skip the DNS lookup, will otherwise fail
    const isDomainUp = newSite.getDomain().includes('localhost') ? true : await lookupDns(newSite.getDomain(), 3000);

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
      const frontendUploadDomain = process.env.FRONTEND_URL; // Use the default frontend url for now because the new site doesn't have an ingress yet

      try {
        let response = await cmsProvider.importCmsAttachments(frontendUploadDomain, newSite.getTmpDir(), cmsData.attachments);;
      } catch(err) {
        console.log('Error while uploading the images', err); // TypeError: failed to fetch
      }
    }

    // Try to remove import files
    try {
      removeFolderRecursive(newSite.getTmpDir());
    } catch(error) {
      console.error('Error removing tmp dir for uploading', error);
    }

    if (process.env.KUBERNETES_NAMESPACE) {
      try {
        await k8Ingress.add(newSite);

        // Todo: Move this to the a cronjob (api or admin).
        //const domainIp = await lookupDns(newSite.getDomain(), 2000);

        //if(process.env.PUBLIC_IP === domainIp) {

        //}
      } catch(error) {
        console.error(error);
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
  console.log('validateInput', apiData, oauthData, cmsData);

  if (!cmsData.mongoPath) {
    console.log('No mongo path found');
    throw new Error('No mongo path found');
  }

  const mongoFiles = await fs.readdir(cmsData.mongoPath);
  if(mongoFiles.length === 0) {
    console.log('No mongo path empty');

    throw new Error('No mongo path is empty');
  }

  if (!apiData.site || !apiData.site.config) {
    console.log('Site or site config is empty');

    throw new Error('Site or site config is empty');
  }
  if (!oauthData || !oauthData.clients) {
    console.log('No Oauth clients found');

    throw new Error('No Oauth clients found');
  }

  // Todo: check if there are images and the frontend url is available
  if(cmsData.attachments && cmsData.attachments.length > 0) {
    // in case of localhost, skip the DNS check, will fail
    const frontendIsUp = process.env.FRONTEND_URL.includes('localhost') ? true : await lookupDns(process.env.FRONTEND_URL, 10000);

    if(frontendIsUp === false) {
      console.log('Frontend url (${process.env.FRONTEND_URL}) is not reachable');

      throw new Error(`Frontend url (${process.env.FRONTEND_URL}) is not reachable`);
    }
  }

  return true;
};
