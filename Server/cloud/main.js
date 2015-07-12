var IncidentClass = Parse.Object.extend("Incident");
Parse.Cloud.job("read_rss", function(request, status) {
    login(request.params.username, request.params.password).then(function() {
        var RSSParser = require('cloud/rssparser.js');
        RSSParser.initialize('https://www.foedevarestyrelsen.dk/_layouts/feed.aspx?xsl=1&web=/&page=ecad1b68-d4b1-4648-95ca-e8d87e9d4c43&wp=eac01848-ff60-4224-bdc4-7a74d884aa50&pageurl=/Sider/TilbagetrukneFoedevarer.aspx', 'Incident');
        RSSParser.parse(function() {
            status.success("SUCCESSOR!");
        },
        function (httpResponse) {
            status.error('Request failed with response code ' + httpResponse.status);
        },
        function(item) {
            var processedItem = new Array();
            var link = item['link'];
            var n = link.lastIndexOf("/Arkiv-") + 1;
            var uuid = link.slice(n);
            uuid = uuid.replace('.aspx', '').replace('/', '-').toLowerCase();
            console.log(item['title'] + ' ' + uuid);
            processedItem['uuid'] = uuid;
            processedItem['title'] = item['title'];
            processedItem['url'] = item['link'];
            processedItem['publishedAt'] =  new Date(item['pubDate']);
            return processedItem;
        });
    }); 
});

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