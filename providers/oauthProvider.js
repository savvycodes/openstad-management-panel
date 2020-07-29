const fetch = require('node-fetch');
const userClientApi = require('../services/userClientApi');

const protocol = process.env.FORCE_HTTP ? 'http' : 'https';

exports.getData = async (oauthConfig) => {
  const promises = Object.keys(oauthConfig).map(async key => {
    return {
      key,
      data: await userClientApi.fetch(oauthConfig[key]['auth-client-id'])
    };
  });

  return await Promise.all(promises)
};

exports.createOauth = async (newSite, oauthData) => {
  const clients = {};

  if (oauthData.length === 0) {
    // Create default clients
    oauthData = [
      {
        key: 'default',
        data: {
          name: newSite.getTitle(),
          authTypes: ['Url'],
          description: '',
          requiredUserFields: ["firstName", "lastName", "email"],
        }
      },
      {
        key: 'anonymous',
        data: {
          name: newSite.getTitle(),
          authTypes: ['Anonymous'],
          description: '',
          requiredUserFields: ["postcode"],
        }
      }
    ]
  }

  await Promise.all(oauthData.map(async (oauth) => {
    const {data, key} = oauth;

    const client = {
      name: data.name,
      description: data.description,
      authTypes: data.authTypes,
      requiredUserFields: data.requiredUserFields,
      exposedUserFields: data.exposedUserFields || [],
      siteUrl: newSite.getDomainWithProtocol(),
      redirectUrl: newSite.getDomainWithProtocol(),
      allowedDomains: [
        newSite.getDomain(),
        process.env.API_URL.replace(/^https?:\/\//, ''),
      ],
      config: data.config,
    };

    if (client.config && client.config.backUrl) {
      client.config.backUrl = client.config.backUrl.replace(/^https?:\/\/[^\/]+/, protocol + '://' + newSite.getDomain());
    }
    const result = await userClientApi.create(client);

    return clients[key] = {
      'id': result.id,
      'auth-client-id': result.clientId,
      'auth-client-secret': result.clientSecret,
    };
  }));

  return clients;
};

exports.makeUserSiteAdmin = (externalUserId, oauthDefaultId) => {
  const url = process.env.USER_API + '/api/admin/user/' + externalUserId;
  const body = {
    client_id: process.env.USER_API_CLIENT_ID,
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
      headers: {"Content-type": "application/json"},
      method: 'POST',
      body: JSON.stringify(body)
    });
}
