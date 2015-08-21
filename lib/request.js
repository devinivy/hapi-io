var Url = require('url');
var _ = require('lodash');

module.exports = function (options) {

  var sparkRequest = options.request || {};
  var route = options.route || {};
  var dataKeys;
  var data = options.data || {};

  var method = (route.method || 'get');
  var get = (method === 'get');
  var path = route.path || '/';
  var settings = route.settings || {};
  var validate = settings.validate || {};
  var plugins = settings.plugins || {};
  var hapiio = plugins['hapi-io'] || {};
  var mapping = hapiio.mapping || {};

  var headers = {};
  var payload = {};
  var query = {};

  var determineQueryObject = function(querystring) {

    return Url.parse(
      Url.format({search: querystring}),
      true
    ).query;
  };

  if (typeof data !== 'object') {

    data = String(data);

    if (get) {
      query = determineQueryObject(data);
    } else {
      payload = data;
    }

    dataKeys = [];
  } else {
    dataKeys = Object.keys(data);
  }

  // Build path, filling params
  var newPath = path.replace(/(?:\{(\w+)(\??)\})/g, function (group, key, type) {

    var index = dataKeys.indexOf(key);
    var optional = type === '?';

    if (index === -1) {
      if (optional) {
        return '';
      }

      return group;
    }

    dataKeys.splice(index, 1);
    return data[key];
  });

  _.each(dataKeys, function (key) {

    if (mapping.query && mapping.query.indexOf(key) !== -1) {
      query[key] = data[key];
      return;
    }

    if (mapping.payload && mapping.payload.indexOf(key) !== -1) {
      payload[key] = data[key];
      return;
    }

    if (mapping.headers && mapping.headers.indexOf(key) !== -1) {
      headers[key] = data[key];
      return;
    }

    if (validate.query && validate.query[key]) {
      query[key] = data[key];
      return;
    }

    if (validate.payload && validate.payload[key]) {
      payload[key] = data[key];
      return;
    }

    if (validate.headers && validate.headers[key]) {
      headers[key] = data[key];
      return;
    }

    if (get) {
      query[key] = data[key];
      return;
    }

    payload[key] = data[key];
  });

  headers = _.defaults(headers,
    _.omit(sparkRequest.headers, 'accept-encoding')
  );

  var uri = Url.parse(newPath, true);

  uri.query = _.extend({}, sparkRequest.uri.query, query, uri.query);
  delete uri.search;

  // Auto map "Authorization" attribute to Authorization header
  // TODO: Make this configurable?
  _.some(['Authorization'], function (value) {

    return _.some([value, value.toLowerCase()], function (header) {

      if (headers[header]) {
        return true;
      }
      if (payload[header]) {
        headers[header] = payload[header];
        return true;
      }
      if (uri.query[header]) {
        headers[header] = uri.query[header];
        return true;
      }

      return false;
    });
  });

  return {
    method: method,
    url: Url.format(uri),
    headers: headers,
    payload: JSON.stringify(payload)
  };
};
