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

var allMakes;
var allMakesPending = [];

var allModels = {};
var allModelsPending = {};

var getMakes = function (done) {
  if (allMakes) {
    return done(null, allMakes);
  }
  if (allMakesPending.length) {
    return allMakesPending.push(done);
  }

  allMakesPending.push(done);

  request({
    uri: utils.resolve('apis:///v/vehicle-makes'),
    method: 'GET',
    query: JSON.stringify({
      data: {
        count: 100
      }
    }),
    json: true
  }, function (e, r, b) {
    allMakes = b;
    allMakesPending.forEach(function (done) {
      done(e, b);
    });
    allMakesPending = [];
  });
};

var getModels = function (make, done) {
  if (allModels[make]) {
    return done(null, allModels[make]);
  }
  if (allModelsPending[make]) {
    return allModelsPending[make].push(done);
  }

  allModelsPending[make] = [done];

  request({
    uri: utils.resolve('apis:///v/vehicle-models'),
    method: 'GET',
    query: JSON.stringify({
      data: {
        query: {
          make: make
        },
        count: 100
      }
    }),
    json: true
  }, function (e, r, b) {
    allModels[make] = b;
    allModelsPending[make].forEach(function (done) {
      done(e, b);
    });
    delete allModelsPending[make];
  });
};

var getVehicle = function (user, done) {
  getMakes(function (err, makes) {
    if (err) {
      return done(err);
    }

    var make = loaderUtils.random(makes);

    getModels(make.id, function (err, models) {
      if (err) {
        return done(err);
      }
      contacts.create(user, function (err, contact) {
        if (err) {
          return done(err);
        }
        locations.create(user, function (err, location) {
          if (err) {
            return done(err);
          }
          binaries.create(user, 'vehicles', function (err, binary1) {
            if (err) {
              return done(err);
            }
            binaries.create(user, 'vehicles', function (err, binary2) {
              if (err) {
                return done(err);
              }
              binaries.create(user, 'vehicles', function (err, binary3) {
                if (err) {
                  return done(err);
                }
                binaries.create(user, 'vehicles', function (err, binary4) {
                  if (err) {
                    return done(err);
                  }
                  binaries.create(user, 'vehicles', function (err, binary5) {
                    if (err) {
                      return done(err);
                    }
                    var vehicle = {
                      contact: contact.id,
                      location: location.id,
                      type: loaderUtils.random([
                        'bicycle',
                        'excavator',
                        'loader',
                        'bulldozer',
                        'digger',
                        'tractor',
                        'truck',
                        'cement-mixer',
                        'crane',
                        'road-roller',
                        'motorbike',
                        'three-wheeler',
                        'scooter',
                        'car',
                        'van',
                        'suv',
                        'cab',
                        'lorry',
                        'van',
                        'bus',
                        'other'
                      ]),
                      make: make.id,
                      model: loaderUtils.random(models).id,
                      edition: loaderUtils.random([null, 'XL', 'G', 'LX', 'Touring', '4x4', 'Premier', 'LS']),
                      manufacturedAt: moment({year: loaderUtils.random([2010, 2012, 2014, 2016, 2018, 2020])}),
                      fuel: loaderUtils.random(['none', 'petrol', 'diesel', 'electric', 'hybrid', 'other']),
                      transmission: loaderUtils.random(['manual', 'automatic', 'manumatic', 'other']),
                      driveType: loaderUtils.random(['front', 'rear', 'four', 'all', 'other']),
                      mileage: Math.round(Math.random() * 1000) * 100,
                      condition: loaderUtils.random(['brand-new', 'unregistered', 'used']),
                      engine: loaderUtils.random([600, 900, 1000, 1200, 1500, 1800, 2200, 2800]),
                      color: loaderUtils.random(['black', 'white', 'grey', 'silver', 'red', 'blue', 'green', 'orange', 'purple', 'brown', 'pink', 'yellow', 'other']),
                      description: faker.lorem.paragraphs(),
                      price: Math.round(Math.random() * 1000) * 10000,
                      currency: 'LKR',
                      images: [binary1.id, binary2.id, binary3.id, binary4.id, binary5.id]
                    };

                    done(null, vehicle);
                  });
                });
              });
            });
          });
        });
      });
    });
  });
};

var createVehicle = function (user, done) {
  getVehicle(user, function (err, vehicle) {
    if (err) {
      return done(err);
    }
    loaderUtils.findToken(user, function (err, token) {
      if (err) {
        return done(err);
      }
      request({
        uri: utils.resolve('apis:///v/vehicles'),
        method: 'POST',
        auth: {
          bearer: token.access
        },
        json: vehicle
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
            loaderUtils.publish('vehicles', b.id, token.access, function (err) {
              if (err) {
                return done(err);
              }
              done(null, b);
            });
          });
        });
      });
    });
  });
};

var createVehicles = function (o, done) {
  users.find(function (err, users) {
    if (err) {
      return done(err);
    }
    async.eachLimit(users, 5, function (user, userDone) {
      async.timesLimit(o.count, nconf.get('CONCURRENCY'), function (n, timesDone) {
        createVehicle(user, timesDone);
      }, userDone);
    }, done);
  });
};

exports.load = function (o, done) {
  createVehicles(o, done);
};
