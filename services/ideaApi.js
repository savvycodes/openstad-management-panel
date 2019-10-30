const rp = require('request-promise');
const apiUrl = process.env.API_URL;

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

exports.create = (token, siteId, body) => {
  const options = {
      uri:  `${apiUrl}/api/site/${siteId}/idea`,
      method: 'POST',
      headers: {
          'Accept': 'application/json',
          "X-Authorization" : ` Bearer ${token}`,
      },
      body: body, //JSON.stringify(body),
      json: true // Automatically parses the JSON string in the response
  };

  return rp(options);
}

exports.fetchAll = (token, siteId) => {
  return rp({
    method: 'GET',
    uri:  `${apiUrl}/api/site/${siteId}/idea`,
    headers: {
        'Accept': 'application/json',
        'Authorization' : `Bearer ${token}`,
    },
    json: true // Automatically parses the JSON string in the response
  });
}

exports.delete = (token, siteId, ideaId) => {
  return rp({
     method: 'DELETE',
      uri:  apiUrl + `/api/site/${siteId}/idea/${ideaId}`,
      headers: {
          'Accept': 'application/json',
          "X-Authorization" : ` Bearer ${token}`,
      },
      json: true // Automatically parses the JSON string in the response
  });
}

exports.update = (token, siteId, data) => {
  console.log(data);
  return rp({
    method: 'PUT',
    uri: `${apiUrl}/api/site/${siteId}/idea/${data.id}`,
    headers: {
        'Accept': 'application/json',
        'Authorization' : `Bearer ${token}`,
    },
    body: data,
    json: true // Automatically parses the JSON string in the response
  });
}
