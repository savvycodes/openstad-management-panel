const rp                = require('request-promise');
const apiUrl            = process.env.API_URL;
const cache             = require('../services/cache').cache;
const cacheLifespan     = 10*60;   // set lifespan of 10 minutes;

exports.allForSite = (req, res, next) => {
  let voteKey = 'votesForSite' + req.params.siteId;
  let votesForSite = cache.get(voteKey);

  if (votesForSite) {
    req.votes = votesForSite;
    res.locals.votes = votesForSite;
    next();
  } else {
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
         cache.set(voteKey, allVotes, { life: cacheLifespan });
         next();
      })
      .catch(function (err) {
        console.log('-->>>> err', err);
        next();
      });
    }
  }
