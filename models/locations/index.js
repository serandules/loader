var request = require('request');

var utils = require('utils');

var loaderUtils = require('../utils');
var users = require('../users');

var getLocation = function () {
  var cities = ['Colombo', 'Kottawa', 'Pannipitiya', 'Galle', 'Akmeemana', 'Karapitiya', 'Walasmulla', 'Hakmana', 'Panadura', 'Kalutara'];
  var city = loaderUtils.random(cities);
  var index = cities.indexOf(city);

  var postal = ['00700', '10230', '10230', '00200', '04050', '05603', '30045', '45001', '60001', '40010'][index];
  var district = ['Colombo', 'Colombo', 'Colombo', 'Galle', 'Galle', 'Galle', 'Hambantota', 'Matara', 'Kalutara', 'Kaluthara'][index];
  var province = ['Western', 'Western', 'Western', 'Southern', 'Southern', 'Southern', 'Southern', 'Southern', 'Western', 'Western'][index];

  return {
    latitude: 6.9102825,
    longitude: 79.8712862,
    name: 'Bandaranaike Memorial International Conference Hall',
    line1: 'BMICH Office',
    line2: 'Bauddhaloka Mawatha',
    city: city,
    postal: postal,
    district: district,
    province: province,
    state: province,
    country: 'LK'
  };
};

exports.create = function (user, done) {
  loaderUtils.findToken(user, function (err, token) {
    if (err) {
      return done(err);
    }
    request({
      uri: utils.resolve('apis:///v/locations'),
      method: 'POST',
      auth: {
        bearer: token.access
      },
      json: getLocation()
    }, function (e, r, b) {
      if (e) {
        return done(e);
      }
      console.log('location created: %s', b.id);
      done(null, b);
    });
  });
};
