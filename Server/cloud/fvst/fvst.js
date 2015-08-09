(function() {
  var url = "http://www.foedevarestyrelsen.dk/Nyheder/Aktuelt/_vti_bin/Lists.asmx";
  var Issue = require('cloud/issue.js');
  var fs = require('fs');
  var user = require('cloud/user.js');

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
          var issues = [];
          for (var i = 0; i < rows.count(); i++) {
            issues.push(rows.at(i).attributes());
          }
          promise.resolve(issues);
        });
      },
      error: function(httpResponse) {
        promise.reject('Request failed with response code ' + httpResponse.status + ' ' + httpResponse.text);
      }
    });
    return promise;
  }

  var SOAPResponse = function(issues) {
    LOG("Found " + issues.length + " issues");
    LOG("Processing issues...");
    var promises = [];
    for (var i = 0; i < issues.length; i++) {
      var data = issues[i];
      if (i % 20 == 0 || LOCAL) LOG("Processing " + (i + 1) + "/" + issues.length + " - " + data.ows_Title);
      var uuid = data.ows_ID;
      var issue = new Array();
      issue["uuid"] = uuid;
      issue["title"] = data.ows_Title;
      issue["url"] = data.ows_EncodedAbsUrl.replace(/%20/gi, " ");
      issue["publishedAt"] = data.ows_ArticleDateTime;
      issue["modifiedAt"] = data.ows_Modified;
      issue["content"] = data.ows_MetaInfo_PublishingPageContent;
      issue["summary"] = data.ows_MetaInfo_PublishingPageManchet;
      promises.push(Issue.updateIssue(uuid, issue));
    };
    return Parse.Promise.when(promises);
  }

  var LOG = function(message) {
    console.log("FVST - " + message);
  }

  module.exports = {
    getAllIssues: function() {
      LOG("Get all issues");
      if (!user.isLoggedIn()) { LOG("Not logged In!!!"); return; }

      var allRequest = 'cloud/fvst/all.xml';
      return SOAPRequest(allRequest).then(SOAPResponse);
    },
    getNewestIssues: function() {
      LOG("Get newest issues");
      var newestRequest = 'cloud/fvst/newest.xml';
      return SOAPRequest(newestRequest).then(SOAPResponse);
    },
    version: '1.0.0'
  }
})();
