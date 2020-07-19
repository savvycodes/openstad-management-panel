const merge = require('merge');
const dns = require('dns');
const { createReadStream } = require('fs');
const fetch = require('node-fetch');

const userClientApi = require('../userClientApi');
const mongoService = require('../mongo');
const choicesGuideApi = require('../choicesGuideApi');
const siteApi = require('../siteApi');

exports.importOauth = async(domain, protocol, site, oauthData) => {
  console.log('Import oauth');
  console.log(oauthData);
  let oauthConfigs = {};

  const promises = oauthData.map(async(oauth) => {
    const {data, key} = oauth;

    let client = {
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
    }
    if (client.config && client.config.backUrl) {
      client.config.backUrl = client.config.backUrl.replace(/^https?:\/\/[^\/]+/, protocol + '://' + domain);
    }
    console.log(data);
    return await userClientApi.create(client).then(result => {
      oauthConfigs[key] = {
        'id': result.id,
        'auth-client-id': result.clientId,
        'auth-client-secret': result.clientSecret,
      }
    });
  });

  return Promise.all(promises);
};

// Todo: fix too many arguments
exports.importSiteData = async (jwt, siteConfig, fromEmail, dbName, domain, title, id) => {
  // create site in API
  console.log('Import site in API');
  siteConfig.cms.dbName = dbName;
  siteConfig.allowedDomains.push(domain); // TODO
  siteConfig = merge.recursive(siteConfig, {
    "email": {
      siteaddress: fromEmail,
      thankyoumail: {
        from: fromEmail,
      }
    },
    "notifications": {
      "from": fromEmail,
      "to": fromEmail
    },
    "ideas": {
      "feedbackEmail": {
        "from": fromEmail,
      }
    },
    "newslettersignup": {
      "confirmationEmail": {
        "from": fromEmail,
      }
    },
  });
  return siteApi
    .create(jwt, {
      domain: domain,
      name: id + title,
      title: title,
      config: siteConfig,
    });
};

exports.makeRequestedUserAdmin = async(externalUserId, oauthDefaultId) => {
  // make the current user admin
  if (!req.import.site.config.oauth.default) return next();
  const url = process.env.USER_API + '/api/admin/user/' + externalUserId;

  const body = {
    client_id:  process.env.USER_API_CLIENT_ID,
    client_secret: process.env.USER_API_CLIENT_SECRET,
    roles: {},
  };
  body.roles[oauthDefaultId] = 1;

  return fetch(
    url,
    {
      headers: { "Content-type": "application/json" },
      method: 'POST',
      body: JSON.stringify(body)
    });
};

exports.importApostropheDatabase = async (dbName, dir) => {
  // create mongo db
  console.log('Import mongo db');
  return mongoService.import(dbName, dir + '/mongo');
};

exports.importChoiceGuides = (jwt, siteId, choiceGuides) => {
  const promises = choiceGuides.map(async (choiceGuide) => {
    return await choicesGuideApi.create(jwt, siteId, choiceGuide)
  });

  return Promise.all(promises)
};

exports.importCmsAttachments = async (domain, dir, attachments) => {

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
