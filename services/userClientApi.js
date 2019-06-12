const rp = require('request-promise');
const apiUrl = process.env.USER_API;

exports.fetch = (token, clientId) => {
  return rp({
    method: 'GET',
    uri: `${apiUrl}/client/${clientId}`,
    headers: {
        'Accept': 'application/json',
        'Authorization' : `Bearer ${token}`,
    },
    json: true // Automatically parses the JSON string in the response
  })
//  .then(response => response.json());
}

exports.fetchAll = (token) => {
  return rp({
    method: 'GET',
    uri: `${apiUrl}/clients`,
    headers: {
        'Accept': 'application/json',
        'Authorization' : `Bearer ${token}`,
    },
    json: true // Automatically parses the JSON string in the response
  })
//  .then(response => response.json());
};
