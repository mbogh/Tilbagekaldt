var IncidentClass = Parse.Object.extend("Incident");

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

Parse.Cloud.afterSave('Incident', function(request) {
    var incident = request.object;
    if (incident.existed()) return;

    console.log("###############################");
    console.log("Cloud afterSave: Incident - Initiate");
    console.log("###############################");
    var now = new Date();
    if (now.getTime() - incident.get('publishedAt').getTime() > 12*60*60*1000) return;

    console.log("Cloud afterSave: Incident - Send push");
    Parse.Push.send({
        channels: [ 'active' ],
        data: { alert: incident.get('title') }
    },
    {
        success: function() {
            console.log("Cloud afterSave: Incident - Success");
        },
        error: function(error) {
            console.log("Cloud afterSave: Incident - Failed with error: " + error);
        }
    });
});

Parse.Cloud.job("fvst_all", function(request, status) {
    console.log("###############################");
    console.log("Cloud Job: fvst_all - Initiate");
    console.log("###############################");
    login(request.params.username, request.params.password).then(function() {
        var fvst = require('cloud/fvst.js');
        fvst.getAllIncidents().then(function() {
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
        fvst.getNewestIncidents().then(function() {
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
	var IncidentClass = Parse.Object.extend("Incident");
	var _ = require('underscore');
	var query = new Parse.Query(IncidentClass);
	query.limit(1000);
	query.find().then(function(incidents) {
		for (var i = 0; i < incidents.length; i++) {
			var incident = incidents[i];
			var content = incident.get("content");
			if (content.indexOf("SiteCollectionDocuments") != -1) {
				content = content.replace(/%20/gi, " ").replace(/\"\/SiteCollectionDocuments/gi, "\"http://www.foedevarestyrelsen.dk/SiteCollectionDocuments");
				incident.set("content", content);
				promises.push(incident.save());
			}
		}
		promise.resolve();
	});
	return Parse.Promise.when(promises);
};
