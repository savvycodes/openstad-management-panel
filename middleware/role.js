const userRoleApi = require('../services/userRoleApi');

exports.withAll = (req, res, next) => {
  userRoleApi
    .fetchAll()
    .then((roles) => {
      req.roles = roles;
      res.locals.roles = req.roles;
      next();
    })
    .catch((err) => {
      next(err);
    });
}
