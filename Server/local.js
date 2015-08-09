process.env.NODE_PATH = __dirname;
require('module').Module._initPaths();

GLOBAL.LOCAL = true

var unirest = require('unirest');

var config = require('config/global.json');

GLOBAL.Parse = require('parse').Parse;
Parse.User.enableUnsafeCurrentUser();
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

var user = require('cloud/user.js');
user.login('root', 'vr4DujsoNNv3dTJ').then(function() {
  var fvst = require('cloud/fvst/fvst.js');
  fvst.getAllIssues();
});
