const rp = require('request-promise');
const apiUrl = process.env.USER_API;

const create = (token, data) => {
  return rp({
        method: 'POST',
        uri: `${apiUrl}/client`,
        headers: {
            'Accept': 'application/json',
            'X-Authorization' : `Bearer ${token}`,
        },
        body: data,
        json: true // Automatically parses the JSON string in the response
  })
  .then(response => response.json());
}

const update = (token, clientId, data) => {
  return rp({
    method: 'PUT',
    uri: `${apiUrl}/client/${clientId}`,
    headers: {
        'Accept': 'application/json',
        'X-Authorization' : `Bearer ${token}`,
    },
    body: data,
    json: true // Automatically parses the JSON string in the response
  })
  .then(response => response.json());
}

const deleteClient = (token, clientId) => {
  return rp({
    method: 'DELETE',
    uri: `${apiUrl}/client/${clientId}`,
    headers: {
        'Accept': 'application/json',
        'X-Authorization' : `Bearer ${token}`,
    },
    json: true // Automatically parses the JSON string in the response
  })
  .then(response => response.json());
}

exports = {
  create,
  update,
  delete: deleteClient
}
