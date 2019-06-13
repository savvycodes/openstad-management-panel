const apiUrl = process.env.API_URL;
const rp = require('request-promise');

const fetchUserData = (req, res, next) => {
  const jwt = req.query.jwt ? req.query.jwt : req.session.jwt;

  if (!jwt) {
    next();
  } else {
    rp({
        uri: `${apiUrl}/oauth/me`,
        headers: {
            'Accept': 'application/json',
            "X-Authorization" : `Bearer ${jwt}`,
            "Cache-Control": "no-cache"
        },
        json: true // Automatically parses the JSON string in the response
    })
      .then(function (user) {

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
   //if (req.user && req.user.role === 'admin') {
  if (req.isAuthenticated && req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(500).json({ error: 'Huidige account heeft geen rechten' });
  }
}

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated) {
    next();
  } else {
  //  console.log('login redirected', redirectUrl);
    res.redirect('/login');
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
