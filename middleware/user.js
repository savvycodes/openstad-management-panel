const userApiService = require('../services/userApi');

exports.withOne = (req, res, next) => {
  userApiService
    .fetch(req.params.userId)
    .then((user) => {
      req.editUser = user;
      res.locals.editUser = req.editUser;
      next();
    })
    .catch((err) => {
      next(err);
    });
}


exports.withAll = (req, res, next) => {
  userApiService
    .fetchAll(req.query)
    .then((users) => {
      req.users = users;
      res.locals.users = req.users;
      next();
    })
    .catch((err) => {
      next(err);
    });
}
