(function() {
    var url = "http://www.foedevarestyrelsen.dk/Nyheder/Aktuelt/_vti_bin/Lists.asmx";
    var Incident = require('cloud/incident.js');

    var SOAPMessage = function(content) {
        var message =   '<?xml version="1.0" encoding="utf-8"?>'
                    +   '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
                    +       '<soap:Body>'
                    +           content
                    +       '</soap:Body>'
                    +   '</soap:Envelope>';
        return message;
    };

    var SOAPData = function(content) {
        var Buffer = require('buffer').Buffer;
        buffer = new Buffer(SOAPMessage(content));
        return buffer;
    };

    var SOAPRequest = function(content) {
        var promise = new Parse.Promise();
        Parse.Cloud.httpRequest({
            method: 'POST',
            url: url,
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'Accept': 'text/xml; charset=utf-8'
            },
            body: SOAPData(content),
            success: function(httpResponse) {
                var xmlreader = require('cloud/libs/xmlreader.js');
                xmlreader.read(httpResponse.text, function (err, res){
                    if (err) {
                        promise.reject(err); 
                        return;
                    }

                    var rows = res["soap:Envelope"]["soap:Body"].GetListItemsResponse.GetListItemsResult.listitems["rs:data"]["z:row"];
                    var incidents = [];
                    for(var i = 0; i < rows.count(); i++) {
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

    module.exports = {
        getAllIncidents: function() {
            console.log("fvst - Get all incidents");
            var content =   '<GetListItems xmlns="http://schemas.microsoft.com/sharepoint/soap/">'
                        +       '<listName>Sider</listName>'
                        +       '<rowLimit>1000000</rowLimit>'
                        +       '<query>'
                        +           '<Query>'
                        +               '<Where>'
                        +                   '<Or>'
                        +                       '<Eq>'
                        +                           '<FieldRef Name="Nyhedstype"/>'
                        +                           '<Value Type="Text">Tilbagetrukne fødevarer</Value>'
                        +                       '</Eq>'
                        +                       '<Eq>'
                        +                           '<FieldRef Name="Dokumenttyper"/>'
                        +                           '<Value Type="Text">Tilbagetrukne fødevarer</Value>'
                        +                       '</Eq>'
                        +                   '</Or>'
                        +               '</Where>'
                        +           '</Query>'
                        +       '</query>'
                        +       '<viewFields>'
                        +           '<ViewFields xmlns="" Properties="True">'
                        +               '<FieldRef Name="ID"/>'
                        +               '<FieldRef Name="DocId"/>'
                        +               '<FieldRef Name="Title"/>'
                        +               '<FieldRef Name="LinkFilename"/>'
                        +               '<FieldRef Name="ArticleDateTime"/>'
                        +               '<FieldRef Name="Modified"/>'
                        +               '<FieldRef Name="ModerationStatus"/>'
                        +               '<FieldRef Name="Path"/>'
                        +               '<FieldRef Name="EncodedAbsUrl"/>'
                        +               '<FieldRef Name="MetaInfo"/>'
                        +           '</ViewFields>'
                        +       '</viewFields>'
                        +       '<queryOptions>'
                        +           '<QueryOptions xmlns="">'
                        +               '<IncludeMandatoryColumns>FALSE</IncludeMandatoryColumns>'
                        +               '<ViewFieldsOnly>TRUE</ViewFieldsOnly>'
                        +               '<ViewAttributes Scope="RecursiveAll"/>'
                        +           '</QueryOptions>'
                        +       '</queryOptions>'
                        +   '</GetListItems>';
            return SOAPRequest(content).then(function(incidents) {
                console.log("fvst - Found " + incidents.length + " incidents");
                console.log("fvst - Processing incidents...");
                var promises = [];
                for (var i = 0; i < incidents.length; i++) {
                    if (i % 20 == 0) console.log("fvst - Processing " + i + "/" + incidents.length);
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
            });
        },
        getNewestIncidents: function() {
            console.log("fvst - Get newest incidents");
            var content =   '<GetListItems xmlns="http://schemas.microsoft.com/sharepoint/soap/">'
                        +       '<listName>Sider</listName>'
                        +       '<rowLimit>20</rowLimit>'
                        +       '<query>'
                        +           '<Query>'
                        +               '<Where>'
                        +                   '<Or>'
                        +                       '<Eq>'
                        +                           '<FieldRef Name="Nyhedstype"/>'
                        +                           '<Value Type="Text">Tilbagetrukne fødevarer</Value>'
                        +                       '</Eq>'
                        +                       '<Eq>'
                        +                           '<FieldRef Name="Dokumenttyper"/>'
                        +                           '<Value Type="Text">Tilbagetrukne fødevarer</Value>'
                        +                       '</Eq>'
                        +                   '</Or>'
                        +               '</Where>'
                        +               '<OrderBy>'
                        +                   '<FieldRef Name="ArticleDateTime" Ascending="FALSE"/>'
                        +               '</OrderBy>'
                        +           '</Query>'
                        +       '</query>'
                        +       '<viewFields>'
                        +           '<ViewFields xmlns="" Properties="True">'
                        +               '<FieldRef Name="ID"/>'
                        +               '<FieldRef Name="DocId"/>'
                        +               '<FieldRef Name="Title"/>'
                        +               '<FieldRef Name="LinkFilename"/>'
                        +               '<FieldRef Name="ArticleDateTime"/>'
                        +               '<FieldRef Name="Modified"/>'
                        +               '<FieldRef Name="ModerationStatus"/>'
                        +               '<FieldRef Name="Path"/>'
                        +               '<FieldRef Name="EncodedAbsUrl"/>'
                        +               '<FieldRef Name="MetaInfo"/>'
                        +           '</ViewFields>'
                        +       '</viewFields>'
                        +       '<queryOptions>'
                        +           '<QueryOptions xmlns="">'
                        +               '<IncludeMandatoryColumns>FALSE</IncludeMandatoryColumns>'
                        +               '<ViewFieldsOnly>TRUE</ViewFieldsOnly>'
                        +               '<ViewAttributes Scope="RecursiveAll"/>'
                        +           '</QueryOptions>'
                        +       '</queryOptions>'
                        +   '</GetListItems>';
            return SOAPRequest(content).then(function(incidents) {
                console.log("fvst - Found " + incidents.length + " incidents");
                console.log("fvst - Processing incidents...");
                var promises = [];
                for (var i = 0; i < incidents.length; i++) {
                    console.log("fvst - Processing " + i + "/" + incidents.length);
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
            });
        },
        version: '1.0.0'
    }
})();