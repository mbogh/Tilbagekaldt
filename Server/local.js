process.env.NODE_PATH = __dirname;
require('module').Module._initPaths();
var unirest = require('unirest');

var config = require('config/global.json');

GLOBAL.Parse = require('parse').Parse;
Parse.initialize(config.applications.Tilbagekaldt.applicationId, config.applications.Tilbagekaldt.javascriptKey);

Parse.Cloud.httpRequest = function(request) {
  var post_options = {
    host: request.url,
    port: '80',
    path: '',
    method: request.method,
    headers: request.headers
  };

  unirest.post(request.url)
    .headers(request.headers)
    .send(request.body)
    .end(function(response) {
      response.text = response.body;
      if (response.code == 200) {
        request.success(response);
      }
      else {
        request.error(response);
      }
    });
};

var fvst = require('cloud/fvst/fvst.js');
fvst.getAllIssues();
