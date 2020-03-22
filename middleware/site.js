const Site = require('../models').Site;
const siteApiService = require('../services/siteApi');
const moment = require('moment-timezone');


exports.withOne = (req, res, next) => {
  siteApiService
    .fetch(req.session.jwt, req.params.siteId)
    .then((site) => {
      req.site = site;
      req.siteData = site;
      res.locals.site = req.siteData;
      next();
    })
    .catch((err) => {
      next(err);
    });
}

exports.addStats = (req, res, next) => {

  if (req.site.config.admin && req.site.config.admin.displayStats) {
    let totalVoteCount = 0;
    res.locals.voteStatsActive = true;
    res.locals.totalVoteCount = req.votes.filter(vote => (vote.checked === true || vote.checked === null) ).length;

    let usersVoted = {};
    let votesPerDay = {}
    if (req.votes) {
      req.votes.forEach((vote) => {
        if (!usersVoted[vote.userId] && (vote.checked === true || vote.checked === null)) {
          usersVoted[vote.userId] = true;
          let date = vote.createdAt.slice(0, 10);

          if (!votesPerDay[date]) {
            votesPerDay[date] = [vote];
          } else {
            votesPerDay[date].push(vote);
          }
        }
      });
    }

    votesPerDay = Object.keys(votesPerDay).map((voteDate) => {
      return {
          date: voteDate,
          votes: votesPerDay[voteDate]
      };
    })
    .sort((a,b) => {
      return new Date(a.date) - new Date(b.date);
    });

    res.locals.totalVotesByUser = Object.keys(usersVoted).length;
    res.locals.votesPerDay = votesPerDay;
    res.locals.votesPerDayDays = votesPerDay ? votesPerDay.map((voteDate) => { let dateMoment = moment(voteDate.date); return dateMoment.format('Do, MMM');  } ) : '';
    res.locals.votesPerDayCount = votesPerDay ? votesPerDay.map(voteDate => voteDate.votes.length) : '';
  } else {
    res.locals.voteStatsActive = false;
  }

  next();
}

exports.addAuthClientId = (req, res, next) => {
  let defaultClient = req.site.config.oauth.default ? req.site.config.oauth.default : req.site.config.oauth;
  req.authClientId = defaultClient["auth-client-id"];
  res.locals.authClientId = defaultClient["auth-client-id"];
  next();
}

exports.withAll = (req, res, next) => {
  siteApiService
    .fetchAll(req.session.jwt)
    .then((sites) => {
      sites = sites.sort((a, b) => {
        if (a.title < b.title) {
          return -1;
        }
        if (b.title < a.title) {
          return 1;
        }

        return 0;
      });
      req.sites = sites;
      res.locals.sites = req.sites;
      next();
    })
    .catch((err) => {
      next(err);
    });
}
