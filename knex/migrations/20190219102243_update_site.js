
exports.up = function(knex, Promise) {
  return knex.schema.table('sites', function(table) {
    table.string('stagingName');
    table.string('dbName');
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('sites', function(table) {
    table.dropColumn('stagingName');
    table.dropColumn('dbName')
  });
};
