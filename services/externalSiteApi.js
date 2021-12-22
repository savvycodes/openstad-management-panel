const rp = require('request-promise');
const apiUrl = process.env.EXTERNAL_SITE_REPO || 'https://api.openstad.amsterdam.nl/api/repo';
const siteApiKey =  process.env.SITE_API_KEY;

exports.fetchAll = () => {
  return rp({
    method: 'GET',
    uri: `${apiUrl}`,
    headers: {
        'Accept': 'application/json',
//        "X-Authorization": siteApiKey
    },
    json: true // Automatically parses the JSON string in the response
  });
}
