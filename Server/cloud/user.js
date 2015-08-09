/*
 * GET user login.
 */

var LOG = function(message) {
 console.log("LOGIN - " + message);
}

exports.login = function(username, password) {
  LOG("Login with username: " + username);
  var promise = new Parse.Promise();
  Parse.User.logIn(username, password, {
    success: function(user) {
      LOG("Login succeded");
      promise.resolve();
    },
    error: function(user, error) {
      promise.reject(error);
      LOG("Login failed with error: " + error.message);
    }
  });
  return promise;
};

exports.isLoggedIn = function() {
  return Parse.User.current() != undefined;
}
