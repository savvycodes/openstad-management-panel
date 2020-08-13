const rp = require('request-promise');
const apiUrl = process.env.EXTERNAL_SITE_REPO || 'https://cdn.openstad.org/template/site';
const siteApiKey =  process.env.SITE_API_KEY;

exports.fetchAll = () => {
  return rp({
    method: 'GET',
    uri: `${apiUrl}`,
    headers: {
        'Accept': 'application/json',
        "X-Authorization": siteApiKey
    },
    json: true // Automatically parses the JSON string in the response
  });
}
