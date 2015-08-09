var IssueClass = Parse.Object.extend("Issue");

var login = function(username, password) {
    console.log("login - Login with username: " + username);
    var promise = new Parse.Promise();
    Parse.User.logIn(username, password, {
        success: function(user) {
            console.log("login - Login succeded");
            promise.resolve();
        },
        error: function(user, error) {
            promise.reject(error);
            console.log("login - Login failed with error: " + error);
        }
    });
    return promise;
}

Parse.Cloud.afterSave('Issue', function(request) {
    var issue = request.object;
    if (issue.existed()) return;

    console.log("###############################");
    console.log("Cloud afterSave: Issue - Initiate");
    console.log("###############################");
    var now = new Date();
    if (now.getTime() - issue.get('publishedAt').getTime() > 12*60*60*1000) return;

    console.log("Cloud afterSave: Issue - Send push");
    Parse.Push.send({
        channels: [ 'active' ],
        data: { alert: issue.get('title') }
    },
    {
        success: function() {
            console.log("Cloud afterSave: Issue - Success");
        },
        error: function(error) {
            console.log("Cloud afterSave: Issue - Failed with error: " + error);
        }
    });
});

Parse.Cloud.job("fvst_all", function(request, status) {
    console.log("###############################");
    console.log("Cloud Job: fvst_all - Initiate");
    console.log("###############################");
    login(request.params.username, request.params.password).then(function() {
        var fvst = require('cloud/fvst.js');
        fvst.getAllIssues().then(function() {
            console.log("Cloud Job: fvst_all - Ended with SUCCESS");
            status.success("Cloud Job: fvst_all - Ended with SUCCESS");
        }, function(error) {
            console.log("Cloud Job: fvst_all - Ended with ERROR: " + error);
            status.error("Cloud Job: fvst_all - Ended with ERROR: " + error);
        });
    });
});

Parse.Cloud.job("fvst_newest", function(request, status) {
    console.log("##################################");
    console.log("Cloud Job: fvst_newest - Initiate");
    console.log("##################################");
    login(request.params.username, request.params.password).then(function() {
        var fvst = require('cloud/fvst.js');
        fvst.getNewestIssues().then(function() {
            console.log("Cloud Job: fvst_newest - Ended with SUCCESS");
            status.success("Cloud Job: fvst_newest - Ended with SUCCESS");
        }, function(error) {
            console.log("Cloud Job: fvst_newest - Ended with ERROR: " + error);
            status.error("Cloud Job: fvst_newest - Ended with ERROR: " + error);
        });
    });
});

Parse.Cloud.job("fix_links", function(request, status) {
    console.log("##################################");
    console.log("Cloud Job: fix_links - Initiate");
    console.log("##################################");
    login(request.params.username, request.params.password).then(function() {
		fixLinks().then(function() {
            console.log("Cloud Job: fix_links - Ended with SUCCESS");
            status.success("Cloud Job: fix_links - Ended with SUCCESS");
		}, function(error) {
            console.log("Cloud Job: fix_links - Ended with ERROR: " + error);
            status.error("Cloud Job: fix_links - Ended with ERROR: " + error);
        });
    });
});

var fixLinks = function() {
	var promises = [];
	var promise = new Parse.Promise();
	promises.push(promise);
	var IssueClass = Parse.Object.extend("Issue");
	var _ = require('underscore');
	var query = new Parse.Query(IssueClass);
	query.limit(1000);
	query.find().then(function(issues) {
		for (var i = 0; i < issues.length; i++) {
			var issue = issues[i];
			var content = issue.get("content");
			if (content.indexOf("SiteCollectionDocuments") != -1) {
				content = content.replace(/%20/gi, " ").replace(/\"\/SiteCollectionDocuments/gi, "\"http://www.foedevarestyrelsen.dk/SiteCollectionDocuments");
				issue.set("content", content);
				promises.push(issue.save());
			}
		}
		promise.resolve();
	});
	return Parse.Promise.when(promises);
};
