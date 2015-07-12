(function() {
	var IncidentClass = Parse.Object.extend("Incident");
	var GetIncident = function(uuid) {
		// console.log("incident - GetIncident with uuid: " + uuid);
		var promise = new Parse.Promise();
		var query = new Parse.Query(IncidentClass);
		query.equalTo("uuid", uuid);
    	query.first().then(function(object) {
    		promise.resolve(object);
    	});
    	return promise;
	};
	var _ = require('underscore');

	module.exports = {
		getIncident: function(uuid) {
        	return GetIncident(uuid);
		},
		updateIncident: function(uuid, data) {
			var promise = new Parse.Promise();
			GetIncident(uuid).then(function(incident) {
				if (incident === undefined) {
                	incident = new IncidentClass();
                	incident.set("uuid", uuid);
            	}

            	var modifiedAt = new Date(data.modifiedAt);
            	if (incident.get('modifiedAt') !== undefined && incident.get('modifiedAt').getTime() == modifiedAt.getTime() ) {
            		promise.resolve();
            		return;
            	}

            	// console.log("incident - data: " + data);
            	incident.set("title", data.title);
            	incident.set("url", data.url);
            	incident.set("publishedAt", new Date(data.publishedAt));
            	incident.set("modifiedAt", modifiedAt);
            	incident.set("content", _.unescape(data.content).replace(/%20/gi, " ").replace(/\"\/SiteCollectionDocuments/gi, "\"http://www.foedevarestyrelsen.dk/SiteCollectionDocuments"));
            	incident.set("summary", data.summary);

            	incident.save().then(function() {
                	promise.resolve();
            	});
			});
			return promise;
		},
        version: '1.0.0'
    }
})();