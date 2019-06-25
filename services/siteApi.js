const rp = require('request-promise');
const apiUrl = process.env.API_URL + '/api';

exports.fetch = (token, siteId) => {
  return rp({
    method: 'GET',
    uri: `${apiUrl}/site/${siteId}`,
    headers: {
        'Accept': 'application/json',
        'X-Authorization' : `Bearer ${token}`,
    },
    json: true // Automatically parses the JSON string in the response
  });
}

exports.fetchAll = (token) => {
  return rp({
    method: 'GET',
    uri: `${apiUrl}/site`,
    headers: {
        'Accept': 'application/json',
        'X-Authorization' : `Bearer ${token}`,
    },
    json: true // Automatically parses the JSON string in the response
  });
}

exports.deleteSite = (token, siteId) => {
  return rp({
    method: 'DELETE',
    uri: `${apiUrl}/site/${siteId}`,
    headers: {
        'Accept': 'application/json',
        'X-Authorization' : `Bearer ${token}`,
    },
    json: true // Automatically parses the JSON string in the response
  });
}

exports.update = (token, siteId, data) => {
  //data = JSON.stringify(data);

  const options = {
    method: 'PUT',
    uri: `${apiUrl}/site/${siteId}`,
    headers: {
        'Accept': 'application/json',
        'X-Authorization' : `Bearer ${token}`,
    },
    body: data,
    json: true // Automatically parses the JSON string in the response
  };

  return rp(options);
}


exports.create = (token, data) => {
  //data = JSON.stringify(data);

  const options = {
    method: 'POST',
    uri: `${apiUrl}/site`,
    headers: {
        'Accept': 'application/json',
        'X-Authorization' : `Bearer ${token}`,
    },
    body: data,
    json: true // Automatically parses the JSON string in the response
  };

  return rp(options);
}
