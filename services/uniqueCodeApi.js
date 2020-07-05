const rp = require('request-promise');
const apiUrl = process.env.USER_API + '/api/admin';
const httpBuildQuery = require('../utils/httpBuildQuery')

const apiCredentials = {
    client_id:  process.env.USER_API_CLIENT_ID,
    client_secret: process.env.USER_API_CLIENT_SECRET,
}

exports.fetch = (uniqueCodeId) => {
  const options = {
    method: 'GET',
    uri: `${apiUrl}/unique-code/${uniqueCodeId}`,
    headers: {
        'Accept': 'application/json'
    },
    body: apiCredentials,
    json: true // Automatically parses the JSON string in the response
  }

  return rp(options);
//  .then(response => response.json());
}

exports.fetchAll = (params) => {
  const query = httpBuildQuery(params);

  const options = {
    method: 'GET',
    uri: `${apiUrl}/unique-codes?${query}`,
    headers: {
        'Accept': 'application/json'
    },
    body: apiCredentials,
    json: true // Automatically parses the JSON string in the response
  }

  return rp(options);
//  .then(response => response.json());
}

exports.create =  (params) => {
  const query = httpBuildQuery(params);

  return rp({
      method: 'POST',
      uri: `${apiUrl}/unique-code?${query}`,
      headers: {
          'Accept': 'application/json'
      },
      body: apiCredentials,
      json: true // Automatically parses the JSON string in the response
  });
}

exports.reset = (uniqueCodeId) => {
  return rp({
    method: 'POST',
    uri: `${apiUrl}/unique-code/${uniqueCodeId}/reset`,
    json: true, // Automatically parses the JSON string in the response
    body: Object.assign(apiCredentials),
  });
}

exports.delete = (uniqueCodeId) => {
  return rp({
    method: 'POST',
    uri: `${apiUrl}/unique-code/${uniqueCodeId}/delete`,
    json: true, // Automatically parses the JSON string in the response
    body: Object.assign(apiCredentials),
  });
}
