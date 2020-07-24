var request = require('request');
var async = require('async');
var faker = require('faker');
var moment = require('moment');
var nconf = require('nconf');

var utils = require('utils');

var loaderUtils = require('../utils');
var users = require('../users');
var binaries = require('../binaries');
var locations = require('../locations');
var contacts = require('../contacts');

var getRealEstate = function (user, done) {
  contacts.create(user, function (err, contact) {
    if (err) {
      return done(err);
    }
    locations.create(user, function (err, location) {
      if (err) {
        return done(err);
      }
      binaries.create(user, 'realestates', function (err, binary1) {
        if (err) {
          return done(err);
        }
        binaries.create(user, 'realestates', function (err, binary2) {
          if (err) {
            return done(err);
          }
          binaries.create(user, 'realestates', function (err, binary3) {
            if (err) {
              return done(err);
            }
            binaries.create(user, 'realestates', function (err, binary4) {
              if (err) {
                return done(err);
              }
              binaries.create(user, 'realestates', function (err, binary5) {
                if (err) {
                  return done(err);
                }
                var commercial = loaderUtils.random([true, false]);
                var residential = commercial ? loaderUtils.random([true, false]) : true;
                var realEstate = {
                  contact: contact.id,
                  location: location.id,
                  type: loaderUtils.random([
                    'annex',
                    'apartment',
                    'building',
                    'house',
                    'land',
                    'room'
                  ]),
                  residential: residential,
                  commercial: commercial,
                  offer: loaderUtils.random(['sell', 'rent']),
                  extent: Math.round(Math.random() * 100) / 2,
                  area: Math.round(Math.random() * 10000),
                  floors: Math.round(Math.random() * 5),
                  bedrooms: Math.round(Math.random() * 10),
                  bathrooms: Math.round(Math.random() * 10),
                  parking: Math.round(Math.random() * 10),
                  description: faker.lorem.paragraphs(),
                  price: Math.round(Math.random() * 1000) * 10000,
                  currency: 'LKR',
                  images: [binary1.id, binary2.id, binary3.id, binary4.id, binary5.id]
                };
                done(null, realEstate);
              });
            });
          });
        });
      });
    });
  });
};

var createRealEstate = function (user, done) {
  getRealEstate(user, function (err, realEstate) {
    if (err) {
      return done(err);
    }
    loaderUtils.findToken(user, function (err, token) {
      if (err) {
        return done(err);
      }
      request({
        uri: utils.resolve('apis:///v/realestates'),
        method: 'POST',
        auth: {
          bearer: token.access
        },
        json: realEstate
      }, function (e, r, b) {
        if (e) {
          return done(e);
        }
        loaderUtils.publish('contacts', b.contact, token.access, function (err) {
          if (err) {
            return done(err);
          }
          loaderUtils.publish('locations', b.location, token.access, function (err) {
            if (err) {
              return done(err);
            }
            loaderUtils.publish('realestates', b.id, token.access, function (err) {
              if (err) {
                return done(err);
              }
              console.log('realestate created: %s', b.id);
              done(null, b);
            });
          });
        });
      });
    });
  });
};

var createRealEstates = function (o, done) {
  users.find(function (err, users) {
    if (err) {
      return done(err);
    }
    async.eachLimit(users, 5, function (user, userDone) {
      async.timesLimit(o.count, nconf.get('CONCURRENCY'), function (n, timesDone) {
        createRealEstate(user, timesDone);
      }, userDone);
    }, done);
  });
};

exports.load = function (o, done) {
  createRealEstates(o, done);
};
