const rp = require('request-promise');
const apiUrl = process.env.API_URL + '/api';
const siteApiKey =  process.env.SITE_API_KEY;

exports.fetch = (siteId) => {
  return rp({
    method: 'GET',
    uri: `${apiUrl}/site/${siteId}`,
    headers: {
        'Accept': 'application/json',
        "X-Authorization": siteApiKey
    },
    json: true // Automatically parses the JSON string in the response
  });
}

exports.fetchAll = () => {
  return rp({
    method: 'GET',
    uri: `${apiUrl}/site`,
    headers: {
        'Accept': 'application/json',
        "X-Authorization": siteApiKey
    },
    json: true // Automatically parses the JSON string in the response
  });
}

exports.anonymize = (token, siteId) => {
  return rp({
    method: 'PUT',
    uri: `${apiUrl}/site/${siteId}/do-anonymize-all-users`,
    headers: {
        'Accept': 'application/json',
        "X-Authorization": siteApiKey
    },
    json: true // Automatically parses the JSON string in the response
  });
}

exports.delete = (token, siteId) => {
  return rp({
    method: 'DELETE',
    uri: `${apiUrl}/site/${siteId}`,
    headers: {
        'Accept': 'application/json',
        "X-Authorization": siteApiKey
    },
    json: true // Automatically parses the JSON string in the response
  });
}

exports.update = (token, siteId, data) => {
  const options = {
    method: 'PUT',
    uri: `${apiUrl}/site/${siteId}`,
    headers: {
        'Accept': 'application/json',
        "X-Authorization": siteApiKey
    },
    body: data,
    json: true // Automatically parses the JSON string in the response
  };

  return rp(options);
}


exports.create = (data) => {
  const options = {
    method: 'POST',
    uri: `${apiUrl}/site`,
    headers: {
        'Accept': 'application/json',
        "X-Authorization": siteApiKey
    },
    body: data,
    json: true // Automatically parses the JSON string in the response
  };

  return rp(options).then(site => {
    return site
  });
}
