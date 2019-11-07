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
  let totalVoteCount = 0;
  if (req.ideas) {
    req.ideas.forEach((idea) => {
      totalVoteCount += idea.yes;
      totalVoteCount += idea.no;
    });
  }

  res.locals.totalVoteCount = totalVoteCount;

  let usersVoted = {};
  let votesPerDay = {}
  if (req.votes) {
    req.votes.forEach((vote) => {
      if (!usersVoted[vote.userId]) {
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

  console.log('res.locals.votesPerDayDays', res.locals.votesPerDayDays);

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
      req.sites = sites;
      res.locals.sites = req.sites;
      next();
    })
    .catch((err) => {
      next(err);
    });
}
