const merge = require('merge');
const siteApi = require('../services/siteApi');
const choicesGuideApi = require('../services/choicesGuideApi');

/**
 * Get choiceGuides by Site Id
 * @param siteId
 *
 * @returns {Promise<[any , any , any , any , any , any , any , any , any , any]>}
 */
exports.getChoiceGuides = async (siteId) => {
  const choicesGuides = await choicesGuideApi.fetchAll(siteId);

  const promises = choicesGuides.map(async choiceGuide => {
    return await choicesGuideApi.fetch(siteId, choiceGuide.id);
  });

  return Promise.all(promises);
};

/**
 * Create new site
 *
 * @param newSite
 * @param site
 * @param oauthClients
 *
 * @returns {Promise<*>}
 */
exports.createSite = async (newSite, site, oauthClients) => {
  // create site in API
  const siteConfig = merge.recursive(site.config, {
    allowedDomains: [...site.config.allowedDomains, newSite.getDomain()],
    basicAuth: {
      //check if set, default to true
      active: site.config.basicAuth && site.config.basicAuth.active ? site.config.basicAuth.active : true,
      user: site.config.basicAuth && site.config.basicAuth.user  ?  site.config.basicAuth.user : 'openstad_' + Math.random().toString(36).slice(-3),
      password: site.config.basicAuth && site.config.basicAuth.password ?  site.config.basicAuth.password : Math.random().toString(36).slice(-10),
    },
    cms: {
      dbName: newSite.getCmsDatabaseName(),
      url: newSite.getDomainWithProtocol(),
      hostname: newSite.getDomain(),
    },
    email: {
      siteaddress: newSite.getFromEmail(),
      thankyoumail: {
        from: newSite.getFromEmail(),
      }
    },
    notifications: {
      from: newSite.getFromEmail(),
      to: newSite.getFromEmail()
    },
    ideas: {
      feedbackEmail: {
        from: newSite.getFromEmail(),
      }
    },
    newslettersignup: {
      confirmationEmail: {
        from: newSite.getFromEmail(),
      }
    },
    oauth: oauthClients
  });
  return siteApi
    .create({
      domain: newSite.getDomain(),
      name: newSite.getUniqueSiteId() + newSite.getTitle(),
      title: newSite.getTitle(),
      config: siteConfig,
    });
};

/**
 * Create choiceGuides
 * @param siteId
 * @param choiceGuides
 *
 * @returns {Promise<[any , any , any , any , any , any , any , any , any , any]>}
 */
exports.createChoiceGuides = (siteId, choiceGuides) => {
  const promises = choiceGuides.map(async (choiceGuide) => {
    return await choicesGuideApi.create(siteId, choiceGuide)
  });

  return Promise.all(promises)
};
