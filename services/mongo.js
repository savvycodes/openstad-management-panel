const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const port = 27017;
const MongoServer = new mongodb.Server("127.0.0.1", port);
const url = 'mongodb://localhost:' + port;

exports.copyMongoDb = (oldDbName, newDbName) => {
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, function(err, db) {
      if (err) {
        reject(err);
      } else {
        var mongoCommand = {
          copydb: 1,
          fromhost: "localhost",
          fromdb: oldDbName,
          todb: newDbName
        };
        var admin = db.admin();

        admin.command(mongoCommand, function(commandErr, data) {
          if (!commandErr) {
            console.log(data);
            resolve(data)
          } else {
            reject(commandErr.errmsg);
          }
          db.close();
        });
      }
    });
  });
}

exports.dbExists = (dbName) => {
  var url = 'mongodb://localhost:27017';

  return new Promise((resolve, reject) => {
    MongoClient.connect(url, (err, db) => {
      if (err) {
        reject(err);
      } else {
        var adminDb = db.admin();

        // List all the available databases
        adminDb.listDatabases(function(err, dbs) {
          const found = dbs.databases.find(name => dbName === name);
          db.close();
          resolve(!!found)
        });
      }
    });
  });
}

exports.deleteDb = (dbName) => {
  var url = 'mongodb://localhost:27017';

  return new Promise((resolve, reject) => {
    MongoClient.connect(url, (err, db) => {
      if (err) {
        reject(err);
      } else {
        var adminDb = db.admin();

        new mongodb.Db(dbName, MongoServer, {}).open(function (error, client) {
          console.log('---> err', error);
            if(error) callback(error);
            // drop the database
            client.dropDatabase(function(err, result) {
                if(err) callback(err);
                client.close();
            });
        });

        db.close();
        resolve();
      }
    });
  });
}
