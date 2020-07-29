const merge = require('merge');
const siteApi = require('../services/siteApi');
const choicesGuideApi = require('../services/choicesGuideApi');

exports.getChoiceGuides = async (siteId) => {
  const choicesGuides = await choicesGuideApi.fetchAll(siteId);

  const promises = choicesGuides.map(async choiceGuide => {
    return await choicesGuideApi.fetch(siteId, choiceGuide.id);
  });

  return Promise.all(promises);
};

exports.createSite = async (newSite, site, oauthClients) => {
  // create site in API
  const siteConfig = merge.recursive(site.config, {
    allowedDomains: [...site.config.allowedDomains, newSite.getDomain()],
    cms: {
      dbName: newSite.getCmsDatabaseName()
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

exports.createChoiceGuides = (siteId, choiceGuides) => {
  const promises = choiceGuides.map(async (choiceGuide) => {
    return await choicesGuideApi.create(siteId, choiceGuide)
  });

  return Promise.all(promises)
};
