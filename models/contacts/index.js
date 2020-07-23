var request = require('request');
var faker = require('faker');

var utils = require('utils');

var loaderUtils = require('../utils');

var getContact = function () {
  var name = faker.name.firstName();
  var username = name.toLowerCase();
  return {
    name: name,
    messenger: username,
    skype: username
  };
};

exports.create = function (user, done) {
  loaderUtils.findToken(user, function (err, token) {
    if (err) {
      return done(err);
    }
    request({
      uri: utils.resolve('apis:///v/contacts'),
      method: 'POST',
      auth: {
        bearer: token.access
      },
      json: getContact()
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      done(null, b);
    });
  });
};
