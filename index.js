var log = require('logger')('loader:index');
var nconf = require('nconf').argv().env();
var mongoose = require('mongoose');
var async = require('async');

mongoose.Promise = global.Promise;

var env = nconf.get('ENV');

nconf.defaults(require('./env/' + env + '.json'));

var utils = require('utils');

var Tiers = require('model-tiers');

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

var unthrottle = function (done) {
  Tiers.update({name: {$in: ['free', 'basic']}}, {
    apis: {
      vehicles: {
        find: {
          second: Number.MAX_VALUE,
          day: Number.MAX_VALUE,
          month: Number.MAX_VALUE
        },
        create: {
          second: Number.MAX_VALUE,
          day: Number.MAX_VALUE,
          month: Number.MAX_VALUE
        }
      }
    },
    ips: {
      find: {
        second: Number.MAX_VALUE,
        minute: Number.MAX_VALUE,
        hour: Number.MAX_VALUE,
        day: Number.MAX_VALUE
      },
      create: {
        second: Number.MAX_VALUE,
        minute: Number.MAX_VALUE,
        hour: Number.MAX_VALUE,
        day: Number.MAX_VALUE
      }
    }
  }, {multi: true}, done);
};

var throttle = function (done) {
  Tiers.update({name: {$in: ['free', 'basic']}}, {
    apis: {
      contacts: {
        confirm: {
          minute: 2,
          day: 10,
          month: 30
        },
        verify: {
          minute: 2,
          day: 10,
          month: 30
        }
      },
      vehicles: {
        find: {
          second: 10,
          day: 10000,
          month: 100000
        },
        create: {
          second: 1,
          day: 10,
          month: 100
        },
        bumpup: {
          second: 1,
          day: 10,
          month: 100
        }
      },
      realestates: {
        find: {
          second: 10,
          day: 10000,
          month: 100000
        },
        create: {
          second: 1,
          day: 10,
          month: 100
        },
        bumpup: {
          second: 1,
          day: 10,
          month: 100
        }
      }
    },
    ips: {
      find: {
        second: 10,
        minute: 500,
        hour: 5000,
        day: 50000
      },
      create: {
        second: 10,
        minute: 100,
        hour: 500,
        day: 1000
      }
    }
  }, {multi: true}, done);
};

var load = function (done) {
  var models = {
    users: 10,
    vehicles: 10,
    realestates: 10
  };

  unthrottle(function (err) {
    if (err) {
      return done(err);
    }
    async.eachSeries(Object.keys(models), function (model, eachDone) {
      log.info('loader:loading', model);
      var loader = require('./models/' + model);
      loader.load({
        count: models[model]
      }, eachDone);
    }, function (err1) {
      throttle(function (err2) {
        done(err1 || err2);
      });
    });
  });
};
