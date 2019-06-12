const rp = require('request-promise');
const apiUrl = process.env.API_URL + '/api';

exports.fetch = (token, siteId) => {
  return rp({
    method: 'GET',
    uri: `${apiUrl}/site/${siteId}`,
    headers: {
        'Accept': 'application/json',
        'Authorization' : `Bearer ${token}`,
    },
    json: true // Automatically parses the JSON string in the response
  })
//.then(response => response.json());
}

exports.fetchAll = (token) => {
  console.log('token', token);

  return rp({
    method: 'GET',
    uri: `${apiUrl}/site`,
    headers: {
        'Accept': 'application/json',
        'Authorization' : `Bearer ${token}`,
    },
    json: true // Automatically parses the JSON string in the response
  })
//  .then(response => response.json());
}

exports.deleteSite = (token, siteId) => {
  return rp({
    method: 'DELETE',
    uri: `${apiUrl}/site/${siteId}`,
    headers: {
        'Accept': 'application/json',
        'Authorization' : `Bearer ${token}`,
    },
    json: true // Automatically parses the JSON string in the response
  })
  .then(response => response.json());
}

exports.update = (token, siteId, data) => {
  return rp({
    method: 'PUT',
    uri: `${apiUrl}/site/${siteId}`,
    headers: {
        'Accept': 'application/json',
        'Authorization' : `Bearer ${token}`,
    },
    body: data,
    json: true // Automatically parses the JSON string in the response
  })
  .then(response => response.json());
}
