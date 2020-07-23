var log = require('logger')('loader:index');
var nconf = require('nconf').argv().env();
var mongoose = require('mongoose');
var async = require('async');

mongoose.Promise = global.Promise;

var env = nconf.get('ENV');

nconf.defaults(require('./env/' + env + '.json'));

var mongourl = nconf.get('MONGODB_URI');

var ssl = !!nconf.get('MONGODB_SSL');

mongoose.connect(mongourl, {
  authSource: 'admin',
  ssl: ssl
});

var db = mongoose.connection;

db.on('error', function (err) {
  log.error('db:errored', err);
});

db.once('open', function () {
  log.info('db:opened');
  load(function (err) {
    if (err) {
      console.error(err)
      return log.error('loading:errored', err);
    }
    mongoose.disconnect(function () {
      log.info('db:loaded');
    });
  });
});

var load = function (done) {
  var models = {
    users: 1,
    vehicles: 10,
    realestates: 10
  };

  async.eachSeries(Object.keys(models), function (model, eachDone) {
    log.info('loader:loading', model);
    var loader = require('./models/' + model);
    loader.load({
      count: models[model]
    }, eachDone);
  }, done);
};
