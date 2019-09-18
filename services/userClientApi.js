const rp = require('request-promise');
const apiUrl = process.env.USER_API;
const nestedObjectAssign = require('nested-object-assign');

const apiCredentials = {
    client_id:  process.env.USER_API_CLIENT_ID,
    client_secret: process.env.USER_API_CLIENT_SECRET,
}

exports.fetch = (clientId) => {
  console.log('=>>>clientId', clientId);
  return rp({
    method: 'GET',
    uri: `${apiUrl}/client/${clientId}`,
    headers: {
        'Accept': 'application/json'
    },
    body: apiCredentials,
    json: true // Automatically parses the JSON string in the response
  })
//  .then(response => response.json());
}

exports.fetchAll = () => {
  return rp({
    method: 'GET',
    uri: `${apiUrl}/clients`,
    headers: {
        'Accept': 'application/json'
    },
    body: apiCredentials,
    json: true // Automatically parses the JSON string in the response
  })
//  .then(response => response.json());
};


exports.create = (data) => {
  let body = nestedObjectAssign(data, apiCredentials);

  return rp({
      method: 'POST',
      uri: `${apiUrl}/client`,
      headers: {
          'Accept': 'application/json'
      },
      body: body,
      json: true // Automatically parses the JSON string in the response
  });
}

exports.update = (clientId, data) => {
  return rp({
    method: 'POST',
    uri: `${apiUrl}/client/${clientId}`,
    headers: {
        'Accept': 'application/json',
    },
    body: nestedObjectAssign(data, apiCredentials),
    json: true // Automatically parses the JSON string in the response
  });
}

exports.delete = (clientId) => {
  return rp({
    method: 'POST',
    uri: `${apiUrl}/client/${clientId}/delete`,
    json: true, // Automatically parses the JSON string in the response
    body: apiCredentials,
  });
}
