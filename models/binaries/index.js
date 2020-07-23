var request = require('request');
var fs = require('fs');
var path = require('path');
var faker = require('faker');
var _ = require('lodash');

var utils = require('utils');

var loaderUtils = require('../utils');

var binaries = {
  vehicles: fs.readdirSync(path.join(__dirname, 'vehicles')).filter(function (name) {
    return name.indexOf('.jpeg') !== -1 || name.indexOf('.jpg') !== -1
  }),
  realestates: fs.readdirSync(path.join(__dirname, 'realestates')).filter(function (name) {
    return name.indexOf('.jpeg') !== -1 || name.indexOf('.jpg') !== -1
  })
};

var findBinary = function (type) {
  if (type === 'avatars') {
    return request(faker.internet.avatar());
  }
  var candiates = binaries[type];
  return fs.createReadStream(path.join(__dirname, type, loaderUtils.random(candiates)));
};

exports.create = function (user, type, done) {
  loaderUtils.findToken(user, function (err, token) {
    if (err) {
      return done(err);
    }
    request({
      uri: utils.resolve('apis:///v/binaries'),
      method: 'POST',
      formData: {
        data: JSON.stringify({
          type: 'image'
        }),
        content: findBinary(type)
      },
      auth: {
        bearer: token.access
      },
      json: true
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      done(null, b);
    });
  });
};
