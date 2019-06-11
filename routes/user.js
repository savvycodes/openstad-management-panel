const userMw = require('../../middleware/user');

app.get('/admin/users',
  userMw.withAll,
  (req, res) => {
    res.render('users/overview.html');
  }
);

app.get('/admin/user',
  (req, res) => {
    res.render('users/form.html');
  }
);

app.get('/admin/user/:userId',
  userMw.withOne,
  (req, res) => {
    res.render('users/form.html');
  }
);
