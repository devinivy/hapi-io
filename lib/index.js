var _ = require('lodash');
var Primus = require('primus');
var Auth = require('./auth');
var Routes = require('./routes');

// Declare internals

var internals = {
  defaults: {
    primus: {
      plugin: {
        'primus-emitter': require('primus-emitter')
      },
      pathname: '/primus'
    }
  }
};

exports.register = function (server, options, next) {

  _.defaultsDeep(options, internals.defaults);

  var s = options.connectionLabel ?
          server.select(options.connectionLabel) : server;

  if (!s) {
    return next(new Error('hapi-io - no server'));
  }

  if (!s.connections.length) {
    return next(new Error('hapi-io - no connection'));
  }

  if (s.connections.length !== 1) {
    return next(new Error('hapi-io - multiple connections'));
  }

  var connection = s && s.connections.length && s.connections[0];

  if (!connection) {
    return next(new Error('No connection/listener found'));
  }

  var primus = new Primus(connection.listener, options.primus);

  s.expose('primus', primus);

  if (options.auth) {
    Auth(s, primus, options);
  }

  primus.on('connection', function (spark) {

    Routes(s, spark);
  });

  next();
};

exports.register.attributes = {
  pkg: require('../package.json')
};
