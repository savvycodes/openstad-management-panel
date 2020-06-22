const rp = require('request-promise');
const apiUrl = process.env.API_URL;
const siteApiKey =  process.env.SITE_API_KEY;

exports.fetchAll = (token, siteId) => {
  return rp({
    method: 'GET',
    uri:  `${apiUrl}/api/site/${siteId}/choicesguide`,
    headers: {
        'Accept': 'application/json',
      //  'Authorization' : `Bearer ${token}`,
        "X-Authorization": siteApiKey
    },
    json: true // Automatically parses the JSON string in the response
  });
}

exports.fetch = (token, siteId, choicesGuideId) => {
  return rp({
    method: 'GET',
    uri:  `${apiUrl}/api/site/${siteId}/choicesguide/${choicesGuideId}?includeChoices=1&includeQuestions=1`,
    headers: {
        'Accept': 'application/json',
      //  'Authorization' : `Bearer ${token}`,
        "X-Authorization": siteApiKey
    },
    json: true // Automatically parses the JSON string in the response
  });
}

exports.create = (token, siteId, json) => {

  let promises = [];

  let choices = json.choices || [];
  delete json.choices;
  let questiongroups = json.questiongroups || [];
  delete json.questiongroups;
  delete json.id;
  json.siteId = siteId;

  const options = {
    uri:  `${apiUrl}/api/site/${siteId}/choicesguide`,
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      "X-Authorization": siteApiKey
    },
    body: json,
    json: true
  };
  return rp(options)
    .then(result => {

      let promises = [];
      let choicesGuideId = result.id

      choices.forEach((choice) => {
        delete choice.id;
        choice.choicesGuideId = choicesGuideId;
        const options = {
          uri:  `${apiUrl}/api/site/${siteId}/choicesguide/${choicesGuideId}/choice`,
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            "X-Authorization": siteApiKey
          },
          body: choice,
          json: true
        };
        promises.push(
          rp(options)
        );
      });      

      questiongroups.forEach((questiongroup) => {
        let choices = questiongroup.choices || [];
        delete questiongroup.choices;
        let questions = questiongroup.questions || [];
        delete questiongroup.questions;
        questiongroup.choicesGuideId = choicesGuideId;
        const options = {
          uri:  `${apiUrl}/api/site/${siteId}/choicesguide/${choicesGuideId}/questiongroup`,
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            "X-Authorization": siteApiKey
          },
          body: questiongroup,
          json: true
        };
        promises.push(
          rp(options)
            .then(result => {
              let subpromises = [];
              let questionGroupId = result.id
              choices.forEach((choice) => {
                delete choice.id;
                choice.questionGroupId = questionGroupId;
                const options = {
                  uri:  `${apiUrl}/api/site/${siteId}/choicesguide/${choicesGuideId}/questiongroup/${questionGroupId}/choice`,
                  method: 'POST',
                  headers: {
                    'Accept': 'application/json',
                    "X-Authorization": siteApiKey
                  },
                  body: choice,
                  json: true
                };
                subpromises.push(
                  rp(options)
                );
              });      
              questions.forEach((question) => {
                delete question.id;
                question.questionGroupId = questionGroupId;
                const options = {
                  uri:  `${apiUrl}/api/site/${siteId}/choicesguide/${choicesGuideId}/questiongroup/${questionGroupId}/question`,
                  method: 'POST',
                  headers: {
                    'Accept': 'application/json',
                    "X-Authorization": siteApiKey
                  },
                  body: question,
                  json: true
                };
                subpromises.push(
                  rp(options)
                );
              });
              return subpromises;
            })
            .then(subpromises => {
              return Promise
                .all(subpromises)
            })
          
        );
      });
      return promises;
    })
    .then(promises => {
      return Promise
        .all(promises)
    })
}

exports.delete = (token, siteId, choicesGuideId) => {
  return rp({
     method: 'DELETE',
      uri:  apiUrl + `/api/site/${siteId}/choicesguide/${choicesGuideId}`,
      headers: {
          'Accept': 'application/json',
        //  "X-Authorization" : ` Bearer ${token}`,
          "X-Authorization": siteApiKey
      },
      json: true // Automatically parses the JSON string in the response
  });
}

exports.update = (token, siteId, data) => {
  console.log('update.:', token, siteId, data.extraData);
  return rp({
    method: 'PUT',
    uri: `${apiUrl}/api/site/${siteId}/choicesguide/${data.id}`,
    headers: {
        'Accept': 'application/json',
      //  'Authorization' : `Bearer ${token}`,
        "X-Authorization": siteApiKey
    },
    body: data,
    json: true // Automatically parses the JSON string in the response
  });
}
