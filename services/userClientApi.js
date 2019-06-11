const rp = require('request-promise');
const apiUrl = process.env.USER_API;

const create = (token) => {
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

const delete = (token, userId, data) => {
  return rp({
    method: 'DELETE',
    uri: `${apiUrl}/user/${userId}`,
    json: true // Automatically parses the JSON string in the response
  })
  .then(response => response.json());
}

exports = {
  create,
  update,
  delete
}
