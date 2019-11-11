const rp = require('request-promise');
const apiUrl = process.env.API_URL;

exports.allForSite = (req, res, next) => {
  var options = {
      uri: `${apiUrl}/api/site/${req.params.siteId}/vote`,
      headers: {
          'Accept': 'application/json',
          "X-Authorization": process.env.SITE_API_KEY
      },
      json: true // Automatically parses the JSON string in the response
  };

  rp(options)
    .then(function (votes) {
       const allVotes = votes;
       const userVotedCount = votes;
       req.votes = allVotes;
       res.locals.votes = allVotes;
       next();
    })
    .catch(function (err) {
      console.log('-->>>> err', err);
      next();
    });
}
