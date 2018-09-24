const knex = require('../knex/knex.js');
const bookshelf = require('bookshelf')(knex);

exports.Site = bookshelf.Model.extend({
  tableName: 'sites',
  hasTimestamps: true,
  hasTimestamps: ['created_at', 'updated_at']
});
