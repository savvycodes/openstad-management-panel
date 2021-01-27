const Site              = require('../models').Site;
const siteApiService    = require('../services/siteApi');
const moment            = require('moment-timezone');
const cacheLifespan     = 10*60;   // set lifespan of 5 minutes;
const cache             = require('../services/cache').cache;

const removeProtocol = (url) => {
  return url ? url.replace('http://', '').replace('https://', '').replace(/\/$/, "") : '';
}

const removeWww = (url) => {
  return url ? url.replace('www.', '') : '';
}

const defaultDomain  = removeWww(removeProtocol(process.env.FRONTEND_URL));

exports.withOne = (req, res, next) => {
  siteApiService
    .fetch(req.params.siteId)
    .then((site) => {
      req.site = site;
      req.siteData = site;
      res.locals.site = req.siteData;

      if (site.domain === defaultDomain) {
        res.locals.isDefaultSite = true;
      }

      next();
    })
    .catch((err) => {
      next(err);
    });
}

exports.addStats = (req, res, next) => {

  if (req.site.config.admin && req.site.config.admin.turnOffStats) {
    res.locals.voteStatsActive = false;
  } else {
    // set stats to active
    res.locals.voteStatsActive = true;
    let totalVotesByUser = cache.get('totalVotesByUser' + req.params.siteId);
    let votesPerDay = cache.get('votesPerDay'+ req.params.siteId);
    let votesPerDayDays = cache.get('votesPerDayDays'+ req.params.siteId);
    let votesPerDayCount = cache.get('votesPerDayCount'+ req.params.siteId);
    let totalVoteCount = cache.get('totalVoteCount'+ req.params.siteId);

    // if not total votes isset assume cache is empty
    if (!totalVoteCount) {

      totalVoteCount = req.votes.filter(vote => (vote.checked === true || vote.checked === null) ).length;

      let usersVoted = {};
      votesPerDay = {};


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

      totalVotesByUser = Object.keys(usersVoted).length;
      votesPerDay = votesPerDay;
      votesPerDayDays = votesPerDay ? votesPerDay.map((voteDate) => { let dateMoment = moment(voteDate.date); return dateMoment.format('Do, MMM');  } ) : '';
      votesPerDayCount = votesPerDay ? votesPerDay.map(voteDate => voteDate.votes.length) : '';


      cache.set('totalVoteCount'+ req.params.siteId, totalVoteCount, { life: cacheLifespan });
      cache.set('votesPerDay'+ req.params.siteId, votesPerDay, { life: cacheLifespan });
      cache.set('votesPerDayDays'+ req.params.siteId, votesPerDayDays, { life: cacheLifespan });
      cache.set('totalVotesByUser'+ req.params.siteId, totalVotesByUser, { life: cacheLifespan });
      cache.set('votesPerDayCount'+ req.params.siteId, votesPerDayCount, { life: cacheLifespan });
    }


    res.locals.totalVoteCount = totalVoteCount;
    res.locals.votesPerDay = votesPerDay;
    res.locals.votesPerDayDays = votesPerDayDays;
    res.locals.totalVotesByUser = totalVotesByUser;
    res.locals.votesPerDayCount = votesPerDayCount;
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
    .fetchAll()
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
      console.log('err', sites)

      next(err);
    });
}
