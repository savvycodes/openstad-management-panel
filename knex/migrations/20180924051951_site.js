exports.up = function(knex, Promise) {
  return knex.schema.createTable('sites', function(table) {
    table.increments();
    table.string('name').notNullable();
    table.string('productionUrl').notNullable();
    table.string('stagingUrl').notNullable();
    table.string('fromEmail').notNullable();
    table.string('fromName').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('sites');
};
