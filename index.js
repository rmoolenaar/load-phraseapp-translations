/*
  Load in PhraseApp translations with v2 API.
  Must specify an API token, a locale, and a format.
  Default format returned is js for i18n-node-2.
*/

var request = require('request');
var fs = require('fs');
var _ = require('lodash');
var async = require('async');

var path = 'https://api.phraseapp.com/v2';

module.exports = {
    initialize: function(options, callback) {
        if (!options.access_token || !options.project_id) {
            throw new Error('Must supply a value for access_token and project_id');
        }

        if (!callback) {
            callback = function(err) {
                if (err) {
                    throw new Error(err);
                }
            };
        }

        var config = module.exports.configure(options);
        module.exports.download(config, callback);
    },

    configure: function(options) {
        var default_options = {
            file_format: "node_json",
            file_extension: "js",
            location: process.cwd(),
            transform: function(translations) {
                return translations;
            }
        };

        return _.extend({}, default_options, options);
    },

    download: function(options, callback) {
        module.exports.fetchLocales(options,
            function(err, locales) {
                console.log("Got locales", locales);
                if (!err) {
                    async.eachLimit(locales, 2, function(l, callback) {
                        module.exports.downloadTranslationFile(l, options, function(err, res) {
                            if (!err) {
                                console.log("Translation for " + l.name + " downloaded successfully.");
                                return callback(null);
                            } else {
                                console.error("Error downloading " + l.name + ".", err);
                                return callback(err);
                            }
                        });
                    }, callback);
                }
            });
    },

    fetchLocales: function(options, callback) {
        var locales;

        request(path + '/projects/' + options.project_id + '/locales?access_token=' + options.access_token, function(err, res, body) {
            if (!err && res.statusCode == 200) {
                locales = _.map(JSON.parse(body), function(locale) {
                    return {
                        id: locale.id,
                        name: locale.name,
                    };
                });
                return callback(null, locales);
            } else if (err) {
                console.error("An error occurred when fetching locales", err);
                return callback(err);
            }
        });
    },

    downloadTranslationFile: function(locale, options, callback) {
        var translationPath = path + '/projects/' + options.project_id + '/locales/' + locale.id + '/download?access_token=' + options.access_token + '&file_format=' + options.file_format;

        request(translationPath, function(err, res, body) {
            if (!err && res.statusCode >= 200 && res.statusCode < 300) {
                var transformed = options.transform(body);
                var fileName = options.location + "/" + locale.name + "." + options.file_extension;

                fs.writeFile(fileName, transformed, function(err) {
                    if (err) {
                        return console.error("An error occured when downloading translation file", err);
                    }

                    return callback(null, fileName);
                })
            } else {
                if (err) {
                    console.error("An error occured when downloading translation file", err);
                    return callback(err);
                }
                console.error("Got status code " + res.statusCode);
                return callback(true);
            }
        });
    }
}
