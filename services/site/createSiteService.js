const fetch = require('node-fetch');
const merge = require('merge');

const lookupDns = require('../../utils/lookupDns');

const choicesGuideApi = require('../choicesGuideApi');
const userClientApi = require('../userClientApi');
const siteApi = require('../siteApi');
const mongo = require('../mongo');

const protocol = process.env.FORCE_HTTP ? 'http' : 'https';

exports.create = async (user, newSite, apiData, cmsData, oauthData) => {

  // Todo: First validate a few things before import.
  // Is domain valid and online?
  // Did you found complete oauth and site data?

  // Todo: do all necessary things or throw Error.

  console.log(oauthData.clients);
  const oauthClients = await createOauth(newSite.getDomain(), protocol, oauthData.clients);
  await importCmsDatabase(newSite, cmsData.mongoPath);

  const site = await createSite(newSite, apiData.site, oauthClients);
  await createChoiceGuides(site.id, apiData.choiceGuides);

  await makeUserSiteAdmin(user.externalUserId, apiData.site.config.oauth.default.id);
  try {
    await lookupDns(newSite.getDomain());
    // Todo: move this to cms service -> uploadAttachments
    await importCmsAttachments(newSite.getDomainWithProtocol(), newSite.getTmpDir(), cmsData.attachments);
  } catch(error) {
    console.log('not able to reach the frontend server');
    // Todo: notify user about not moved cms attachments and create option to retry.
  }

  return site;
};

//Todo: Move to cms service provider?
const importCmsDatabase = async (newSite, mongoPath) => {
  return mongo.import(newSite.getCmsDatabaseName(), mongoPath)
}

// Todo: Move this to a apiService provider?
const createSite = async (newSite, site, oauthClients) => {
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

// Todo: move to api service -> createChoiceGuides
const createChoiceGuides = (siteId, choiceGuides) => {
  const promises = choiceGuides.map(async (choiceGuide) => {
    return await choicesGuideApi.create(siteId, choiceGuide)
  });

  return Promise.all(promises)
};

// Todo: move to oauth service -> createOauth
const createOauth = async(domain, protocol, oauthData) => {
  const promises = oauthData.map(async(oauth) => {
    const {data, key} = oauth;

    const client = {
      name: data.name,
      description: data.description,
      authTypes: data.authTypes,
      requiredUserFields: data.requiredUserFields,
      exposedUserFields: data.exposedUserFields,
      siteUrl: data.siteUrl.replace(/^https?:\/\/[^\/]+/, protocol + '://' + domain),
      redirectUrl: data.siteUrl.replace(/^https?:\/\/[^\/]+/, protocol + '://' + domain),
      allowedDomains: [
        domain,
        process.env.API_URL.replace(/^https?:\/\//, ''),
      ],
      config: data.config,
    };

    if (client.config && client.config.backUrl) {
      client.config.backUrl = client.config.backUrl.replace(/^https?:\/\/[^\/]+/, protocol + '://' + domain);
    }
    const result = await userClientApi.create(client);

    return {[key]: {
      'id': result.id,
      'auth-client-id': result.clientId,
      'auth-client-secret': result.clientSecret,
    }};
  });

  return Promise.all(promises);
};

// Todo: move this to an cms service provider?
const importCmsAttachments = async (domain, dir, attachments) => {

  const formData = new FormData();

  const promises = attachments.map(async (attachment) => {
    formData.append('files', createReadStream(dir + '/attachments/' + attachment));

    return fetch(domain + '/attachment-upload', {
      headers: { "X-Authorization": process.env.SITE_API_KEY },
      method: 'POST',
      body: formData
    });
  });

  return Promise.all(promises);
};

const makeUserSiteAdmin = (externalUserId, oauthDefaultId) => {
  const url = process.env.USER_API + '/api/admin/user/' + externalUserId;
  const body = {
    client_id:  process.env.USER_API_CLIENT_ID,
    client_secret: process.env.USER_API_CLIENT_SECRET,
    roles: {},
  };
  // Todo: is admin role always 1???
  body.roles[oauthDefaultId] = 1;

  // Todo: check admin role
  // Todo: check if clientId exists
  // Todo: check if user got admin role.

  return fetch(
    url,
    {
      headers: { "Content-type": "application/json" },
      method: 'POST',
      body: JSON.stringify(body)
    });
}
