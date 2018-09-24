exports.addUserData = function (req, res, next) {

}

exports.addAuth = function (req, res, next) {

}

exports.ensureAdmin = function (req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(500).json({ error: 'Forbidden' });
  }
}

exports.ensureAuthenticated = function(req, res, next) {
  if (req.isAuthenticated) {
    next();
  } else {
    res.redirect('/login');
  }
};
