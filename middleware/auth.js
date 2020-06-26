const apiUrl  = process.env.API_URL;
const siteId  = process.env.SITE_ID;
const rp      = require('request-promise');

const fetchUserData = (req, res, next) => {
  const jwt = req.query.jwt ? req.query.jwt : req.session.jwt;

  if (!jwt) {
    next();
  } else {
    const thisHost = req.headers['x-forwarded-host'] || req.get('host');
    const fullUrl = req.protocol + '://' + thisHost;

    const options = {
        uri: `${apiUrl}/oauth/site/${siteId}/me`,
        headers: {
            'Accept': 'application/json',
            "X-Authorization" : `Bearer ${jwt}`,
            "Cache-Control": "no-cache"
        },
        json: true // Automatically parses the JSON string in the response
    }

    console.log('user options', options)


    rp(options)
      .then(function (user) {

        console.log('user fetched', user)

        if (user) {
          req.user = user
          res.locals.user = user;
          next();
        } else {
          // if not valid clear the JWT and redirect
          req.session.jwt = '';

          req.session.save(() => {
            res.redirect('/');
            return;
          })
        }
      })
      .catch((e) => {
        // if not valid clear the JWT and redirect
        req.session.jwt = '';

        req.session.save(() => {
          res.redirect('/');
          return;
        })
      });
  }
}

const ensureRights = (req, res, next) => {
   //if (req.user && req.user.role === 'admin')
   console.log('req.user', req.user)
  if (req.isAuthenticated && req.user && req.user.role === 'admin') {
    next();
  } else {
    req.session.destroy(() => {
      //req.flash('error', { msg: 'Sessie is verlopen of de huidige account heeft geen rechten'});
      if (req.originalUrl !== '/admin/login') {
        res.redirect('/admin/login');
      }
    });
  }
}

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated) {
    next();
  } else {
    console.log('req.path', req.originalUrl)
    if (req.originalUrl !== '/admin/login') {
      res.redirect('/admin/login');
    } else {
      next();
    }
  }
};

const check = (req, res, next) => {
  const jwt = req.query.jwt;

  if (req.query.jwt) {
    req.session.jwt = req.query.jwt;
    req.isAuthenticated = true;

    req.session.save(() => {
      // redirect to remove JWT from url, otherwise browser history will save JWT, allowing people to login.
      res.redirect('/');
    })

  } else {
    /**
     * Add user call to make sure it's an active JWT.
     */
    req.isAuthenticated = !!req.session.jwt;
    next();
  }
};


exports.check = check;
exports.fetchUserData = fetchUserData;
exports.ensureAuthenticated = ensureAuthenticated;
exports.ensureRights = ensureRights;
