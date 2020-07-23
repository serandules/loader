var request = require('request');

var utils = require('utils');
var model = require('model');

var Clients = require('model-clients');
var Tokens = require('model-tokens');
var Tiers = require('model-tiers');

var adminToken = null;

var tokens = {};
var tokensPending = {};

var token = function (user, done) {
  Clients.findOne({
    name: utils.domain()
  }, function (err, client) {
    if (err) {
      return done(err);
    }
    if (!client) {
      return done(new Error('!client'));
    }
    Tokens.findOne({
      user: user.id,
      client: client.id
    }, function (err, token) {
      if (err) {
        return done(err);
      }
      var expires;
      if (token) {
        expires = token.accessibility();
        if (expires > 20 * 1000) {
          return done(null, {
            id: token.id,
            access: token.access,
            refresh: token.refresh,
            expires: expires
          });
        }
      }
      Tiers.findOne({name: 'basic'}, function (err, tier) {
        if (err) {
          return done(err);
        }
        model.create({
          user: user,
          model: Tokens,
          overrides: {},
          data: {
            client: client.id,
            visibility: [],
            permissions: [],
            _: {},
            tier: tier.id
          }
        }, function (err, token) {
          if (err) {
            return done(err);
          }
          done(null, {
            id: token.id,
            access: token.access,
            refresh: token.refresh,
            expires: token.accessible
          });
        });
      });
    });
  });
};

exports.findToken = function (user, done) {
  if (tokens[user.id]) {
    return done(null, tokens[user.id]);
  }
  if (tokensPending[user.id]) {
    return tokensPending[user.id].push(done);
  }
  tokensPending[user.id] = [done];

  token(user, function (err, token) {
    tokens[user.id] = token;
    tokensPending[user.id].forEach(function (done) {
      done(err, token);
    });
  });
};

exports.random = function (enums) {
  return enums[Math.round(Math.random() * 1000) % enums.length]
};

exports.adminToken = function (done) {
  if (adminToken) {
    return done(null, adminToken);
  }
  request({
    uri: utils.resolve('apis:///v/users?data=' + JSON.stringify({
      query: {
        username: 'admin'
      }
    })),
    method: 'GET',
    json: true
  }, function (e, r, b) {
    if (e) {
      return done(e);
    }
    exports.findToken(b[0], function (err, token) {
      if (err) {
        return done(err);
      }
      adminToken = token;
      done(null, token);
    });
  });
}

exports.transit = function (model, id, user, action, done) {
  request({
    uri: utils.resolve('apis:///v/' + model + '/' + id),
    method: 'POST',
    headers: {
      'X-Action': 'transit'
    },
    auth: {
      bearer: user
    },
    json: {
      action: action
    }
  }, function (e, r, b) {
    if (e) {
      return done(e);
    }
    done();
  });
};

exports.traverse = function (model, id, user, actions, done) {
  async.whilst(function () {
    return actions.length;
  }, function (whilstDone) {
    var action = actions.shift();
    exports.transit(model, id, user, action, whilstDone);
  }, done);
};

exports.publish = function (model, id, token, done) {
  exports.adminToken(function (err, reviewer) {
    if (err) {
      return done(err);
    }
    exports.transit(model, id, token, 'review', function (err) {
      if (err) {
        return done(err);
      }
      exports.transit(model, id, reviewer.access, 'approve', function (err) {
        if (err) {
          return done(err);
        }
        exports.transit(model, id, token, 'publish', done);
      });
    });
  });
};