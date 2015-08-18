var Async = require('async');
var Request = require('./request');

module.exports = function (server, primus, options) {

  // This route purposely mirrors primus's path
  server.route({
    method: 'GET',
    path: options.primus.path,
    config: {
      id: 'primus',
      auth: options.auth
    },
    handler: function (request, reply) {

      reply(request.auth);
    }
  });

  primus.authorize(function (sparkRequest, next) {

    var route = server.lookup('primus');
    var req = Request({ request: sparkRequest, route: route });

    // Give 'er a try!
    server.inject(req, function (res) {

      if (res.statusCode !== 200) {
        return next(new Error('Authentication failed.'));
      }

      sparkRequest._hapiio = {
        auth: res.request.auth
      };

    });

  });

  // At this point, the auth info should be set
  primus.on('connection', function (spark) {

    var request = spark.request;

    // Attach it to the spark for convenience
    spark.auth = request._hapiio && request._hapiio.auth;

  });

};
