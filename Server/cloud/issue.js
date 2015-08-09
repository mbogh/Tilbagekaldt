(function() {
  var IssueClass = Parse.Object.extend("Issue");
  var GetIssue = function(uuid) {
    // console.log("issue - GetIssue with uuid: " + uuid);
    var promise = new Parse.Promise();
    var query = new Parse.Query(IssueClass);
    query.equalTo("uuid", uuid);
    query.first().then(function(object) {
      promise.resolve(object);
    });
    return promise;
  };
  var _ = require('underscore');

  module.exports = {
    updateIssue: function(uuid, data) {
      var promise = new Parse.Promise();
      GetIssue(uuid).then(function(issue) {
        if (issue === undefined) {
          issue = new IssueClass();
          issue.set("uuid", uuid);
        }

        var modifiedAt = new Date(data.modifiedAt);
        if (issue.get('modifiedAt') !== undefined && issue.get('modifiedAt').getTime() == modifiedAt.getTime()) {
          promise.resolve();
          return;
        }

        // console.log("issue - data: " + data);
        issue.set("title", data.title);
        issue.set("url", data.url);
        issue.set("publishedAt", new Date(data.publishedAt));
        issue.set("modifiedAt", modifiedAt);
        issue.set("content", _.unescape(data.content).replace(/%20/gi, " ").replace(/\"\/SiteCollectionDocuments/gi, "\"http://www.foedevarestyrelsen.dk/SiteCollectionDocuments"));
        issue.set("summary", data.summary);

        issue.save().then(function() {
          promise.resolve();
        });
      });
      return promise;
    },
    version: '1.0.0'
  }
})();
