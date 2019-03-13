const fs = require('fs');
const request = require('request');

module.exports.download = (uri, filename, callback) => {
    return new Promise((resolve, reject) => {
        request.head(uri, (err, res, body) => {
            request(uri).pipe(fs.createWriteStream(filename)).on('close', () => resolve());
        });
    })
};