const rp = require('request-promise');
const apiUrl = process.env.USER_API;
const clientId = process.env.USER_API_CLIENT_ID;
const clientSecret = process.env.USER_API_CLIENT_SECRET;
const apiCredentials = {
    client_id: clientId,
    client_secret: clientSecret,
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
  console.log('==> options', options);
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
  return rp({
      method: 'POST',
      uri: `${apiUrl}/user`,
      headers: {
          'Accept': 'application/json'
      },
      body: Object.assign(data, apiCredentials),
      json: true // Automatically parses the JSON string in the response
  });
}

exports.update = (token, userId, data) => {
  return rp({
    method: 'POST',
    uri: `${apiUrl}/user/${userId}`,
    headers: {
        'Accept': 'application/json',
        'Authorization' : `Bearer ${token}`,
    },
    body: Object.assign(data, apiCredentials),
    json: true // Automatically parses the JSON string in the response
  });
}

exports.delete = (token, userId, data) => {
  return rp({
    method: 'POST',
    uri: `${apiUrl}/user/${userId}/delete`,
    json: true, // Automatically parses the JSON string in the response
    body: Object.assign(data, apiCredentials),
  });
}
