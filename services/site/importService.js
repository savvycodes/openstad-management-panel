
const { createReadStream } = require('fs');
const fetch = require('node-fetch');

const mongoService = require('../mongo');
const choicesGuideApi = require('../choicesGuideApi');

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
