var log = require('logger')('loader');
var nconf = require('nconf');
var faker = require('faker');
var async = require('async');
var request = require('request');

var utils = require('utils');

var Users = require('model-users');

var loaderUtils = require('../utils');
var binaries = require('../binaries');

var createUser = function (usr, done) {
  utils.encrypt(usr.password, function (err, password) {
    if (err) {
      return done(err);
    }
    utils.group('public', function (err, pub) {
      if (err) {
        return done(err);
      }
      usr.password = password;
      usr.status = 'registered';
      usr.createdAt = new Date();
      usr.modifiedAt = new Date();
      usr.visibility = [];
      usr.permissions = [];
      usr.groups = [pub.id];
      usr._ = {};
      Users.create(usr, function (err, user) {
        if (err) {
          return done(err);
        }
        utils.workflow('model-users', function (err, workflow) {
          if (err) {
            return done(err);
          }
          var usr = utils.json(user);
          utils.toPermissions(usr.id, workflow, 'registered', usr, function (err, permissions) {
            if (err) {
              return done(err);
            }
            utils.toVisibility(usr.id, workflow, 'registered', usr, function (err, visibility) {
              if (err) {
                return done(err);
              }
              Users.findOneAndUpdate({_id: usr.id}, {
                permissions: permissions,
                visibility: visibility
              }).exec(function (err, usr) {
                if (err) {
                  return done(err);
                }
                done(null, utils.json(usr));
              });
            });
          });
        });
      });
    });
  });
};

var createUsers = function (o, done) {
  async.timesLimit(o.count, nconf.get('CONCURRENCY'), function (n, timesDone) {
    var firstname = faker.name.firstName()
    var lastname = faker.name.lastName();
    var username = (firstname + lastname).toLowerCase();
    var email = username + '@serandives.com';
    createUser({
      email: email,
      password: password(),
      username: username,
      name: firstname + ' ' + lastname
    }, function (err, user) {
      if (err) {
        return timesDone(err);
      }
      binaries.create(user, 'avatars', function (err, avatar) {
        if (err) {
          return timesDone(err);
        }
        Users.update({_id: user.id}, {
          avatar: avatar.id
        }, timesDone);
      });
    });
  }, done);
};

var password = function () {
  return '1@2.Com';
};

exports.find = function (done) {
  request({
    uri: utils.resolve('apis:///v/users'),
    method: 'GET',
    json: true
  }, function (e, r, b) {
    if (e) {
      return done(e);
    }
    var excluded = ['admin', 'support', 'talk'];
    var included = []
    b.forEach(function (user) {
      if (excluded.indexOf(user.username) === -1) {
        included.push(user);
      }
    });
    done(null, included);
  });
};

exports.load = function (o, done) {
  createUsers(o, done);
};
