const rp = require('request-promise');
const apiUrl = process.env.USER_API;

const fetch = (token, userId) => {
  return rp({
    method: 'GET',
    uri: `${apiUrl}/users`,
    headers: {
        'Accept': 'application/json',
        'X-Authorization' : `Bearer ${token}`,
    },
    json: true // Automatically parses the JSON string in the response
  })
  .then(response => response.json());
}

const fetchAll = (token) => {
  return rp({
    method: 'GET',
    uri: `${apiUrl}/users`,
    headers: {
        'Accept': 'application/json',
        'X-Authorization' : `Bearer ${token}`,
    },
    json: true // Automatically parses the JSON string in the response
  })
  .then(response => response.json());
}

const create = (token) => {
  return rp({
      method: 'POST',
      uri: `${apiUrl}/user`,
      headers: {
          'Accept': 'application/json',
          'X-Authorization' : `Bearer ${token}`,
      },
      body: data,
      json: true // Automatically parses the JSON string in the response
  })
  .then(response => response.json());
}

const update = (token, userId, data) => {
  return rp({
    method: 'PUT',
    uri: `${apiUrl}/user/${userId}`,
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
  fetch,
  fetchAll,
  create,
  update,
  delete
}
