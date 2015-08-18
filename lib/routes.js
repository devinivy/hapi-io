var Request = require('./request');

module.exports = function (server, spark) {

  var routingTable = server.table();

  routingTable.forEach(function (connection) {

    var routes = connection.table.filter(function (item) {

      return item.settings &&
             item.settings.plugins &&
             item.settings.plugins['hapi-io'];
    });

    routes.forEach(function (route) {

      var hapiio = route.settings.plugins['hapi-io'];
      var event = typeof hapiio === 'string' ? hapiio : hapiio.event;

      spark.on(event, function (data, respond) {

        if (typeof data === 'function') {
          respond = data;
          data = undefined;
        }

        var req = Request({ request: spark.request, route: route, data: data });

        server.inject(req, function (res) {

          var responder = function (err, result) {

            if (!respond) {
              return;
            }

            if (err) {
              // Should we be responding with the error?
              return respond(err);
            }

            respond(result || res.result);
          };

          var context = {
            primus: server.plugins['hapi-io'].primus,
            spark: spark,
            event: event,
            data: data,
            req: req,
            res: res,
            result: res.result
          };

          if (hapiio.post) {
            return hapiio.post(context, responder);
          }

          return responder();
        });
      });
    });
  });
};
