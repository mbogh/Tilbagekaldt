(function() {
  var url = "http://www.foedevarestyrelsen.dk/Nyheder/Aktuelt/_vti_bin/Lists.asmx";
  var Incident = require('cloud/incident.js');
  var fs = require('fs');

  var SOAPMessage = function(filePath) {
    return fs.readFileSync(filePath, 'utf8');
  };

  var SOAPData = function(filePath) {
    var Buffer = require('buffer').Buffer;
    buffer = new Buffer(SOAPMessage(filePath));
    return buffer;
  };

  var SOAPRequest = function(filePath) {
    var promise = new Parse.Promise();
    Parse.Cloud.httpRequest({
      method: 'POST',
      url: url,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'Accept': 'text/xml; charset=utf-8'
      },
      body: SOAPData(filePath),
      success: function(httpResponse) {
        var xmlreader = require('cloud/libs/xmlreader.js');
        xmlreader.read(httpResponse.text, function(err, res) {
          if (err) {
            promise.reject(err);
            return;
          }

          var rows = res["soap:Envelope"]["soap:Body"].GetListItemsResponse.GetListItemsResult.listitems["rs:data"]["z:row"];
          var incidents = [];
          for (var i = 0; i < rows.count(); i++) {
            incidents.push(rows.at(i).attributes());
          }
          promise.resolve(incidents);
        });
      },
      error: function(httpResponse) {
        promise.reject('Request failed with response code ' + httpResponse.status + ' ' + httpResponse.text);
      }
    });
    return promise;
  }

  var SOAPResponse = function(incidents) {
    LOG("Found " + incidents.length + " incidents");
    LOG("Processing incidents...");
    var promises = [];
    for (var i = 0; i < incidents.length; i++) {
      if (i % 20 == 0) LOG("Processing " + i + "/" + incidents.length);
      var data = incidents[i];
      var uuid = data.ows_ID;
      var incident = new Array();
      incident["uuid"] = uuid;
      incident["title"] = data.ows_Title;
      incident["url"] = data.ows_EncodedAbsUrl.replace(/%20/gi, " ");
      incident["publishedAt"] = data.ows_ArticleDateTime;
      incident["modifiedAt"] = data.ows_Modified;
      incident["content"] = data.ows_MetaInfo_PublishingPageContent;
      incident["summary"] = data.ows_MetaInfo_PublishingPageManchet;
      promises.push(Incident.updateIncident(uuid, incident));
    };
    return Parse.Promise.when(promises);
  }

  var LOG = function(message) {
    console.log("fvst - " + message);
  }

  module.exports = {
    getAllIssues: function() {
      LOG("Get all incidents");
      var allRequest = 'cloud/fvst/all.xml';
      return SOAPRequest(allRequest).then(SOAPResponse);
    },
    getNewestIssues: function() {
      LOG("Get newest incidents");
      var newestRequest = 'cloud/fvst/newest.xml';
      return SOAPRequest(newestRequest).then(SOAPResponse);
    },
    version: '1.0.0'
  }
})();
