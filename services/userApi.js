const rp = require('request-promise');
const apiUrl = process.env.USER_API;
const nestedObjectAssign = require('nested-object-assign');

const apiCredentials = {
    client_id:  process.env.USER_API_CLIENT_ID,
    client_secret: process.env.USER_API_CLIENT_SECRET,
}

exports.fetch = (userId) => {
  const options = {
    method: 'GET',
    uri: `${apiUrl}/user/${userId}`,
    headers: {
        'Accept': 'application/json'
    },
    body: apiCredentials,
    json: true // Automatically parses the JSON string in the response
  }

  return rp(options);
//  .then(response => response.json());
}

exports.fetchAll = () => {
  const options = {
    method: 'GET',
    uri: `${apiUrl}/users`,
    headers: {
        'Accept': 'application/json'
    },
    body: apiCredentials,
    json: true // Automatically parses the JSON string in the response
  }

  console.log('===> options', options);
  return rp(options);
//  .then(response => response.json());
}

exports.create = (data) => {
  let body = nestedObjectAssign(data, apiCredentials);
  console.log('===>>> body', body);
  return rp({
      method: 'POST',
      uri: `${apiUrl}/user`,
      headers: {
          'Accept': 'application/json'
      },
      body: body,
      json: true // Automatically parses the JSON string in the response
  });
}

exports.update = (userId, data) => {
  console.log('===>>> body', data);

  return rp({
    method: 'POST',
    uri: `${apiUrl}/user/${userId}`,
    headers: {
        'Accept': 'application/json',
    },
    body: nestedObjectAssign(data, apiCredentials),
    json: true // Automatically parses the JSON string in the response
  });
}

exports.delete = (userId, data) => {
  return rp({
    method: 'POST',
    uri: `${apiUrl}/user/${userId}/delete`,
    json: true, // Automatically parses the JSON string in the response
    body: nestedObjectAssign(data, apiCredentials),
  });
}
