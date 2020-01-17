const rp = require('request-promise');
const apiUrl = process.env.API_URL;
const siteApiKey =  process.env.SITE_API_KEY;

exports.fetchAll = (siteId) => {
  return rp({
    method: 'GET',
    uri:  `${apiUrl}/api/site/${siteId}/newslettersignup`,
    headers: {
        'Accept': 'application/json',
      //  'Authorization' : `Bearer ${token}`,
        "X-Authorization": siteApiKey
    },
    json: true // Automatically parses the JSON string in the response
  });
}
