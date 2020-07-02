const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const host = process.env.MONGO_DB_HOST || 'localhost';
const port = process.env.MONGO_DB_PORT ||27017;
const MongoServer = new mongodb.Server(host, port);
const mongoBackup = require('mongodb-backup-4x');
const mongoRestore = require('mongodb-restore');
const url = 'mongodb://' + host + ':' + port;

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

  return new Promise((resolve, reject) => {
    MongoClient.connect(url, (err, db) => {
      if (err) {
        reject(err);
      } else {
        var adminDb = db.admin();

        // List all the available databases
        adminDb.listDatabases(function(err, dbs) {
          const found = dbs.databases.find((dbObject) => {
            return dbName === dbObject.name;
          });

          db.close();
          resolve(!!found)
        });
      }
    });
  });
}

exports.deleteDb = (dbName) => {

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

exports.query = (dbName, collectionName) => {

  return new Promise((resolve, reject) => {

    MongoClient.connect(url, function(err, db) {
      if (err) throw err;
      var dbo = db.db(dbName);
      dbo.collection(collectionName).find({}).toArray(function(err, result) {
        if (err) throw err;
        db.close();
        resolve(result)
      });
    });

  });

}

exports.export = (dbName, dirname) => {

  return new Promise((resolve, reject) => {

    let uri = url + '/' + dbName;
    dirname = dirname || './tmp';

    mongoBackup({
      uri: uri,
      root: dirname,
      callback: (err, result) => {
        resolve();
      }
    });


  });
}

exports.import = (dbName, dirname) => {

  return new Promise((resolve, reject) => {

    let uri = url + '/' + dbName;
    dirname = dirname || './tmp';

    mongoRestore({
      uri: uri,
      root: dirname,
      callback: (err, result) => {
        resolve();
      }
    });


  });
}
