
// search for DIAL devices

var ssdp = require('../index.js');

ssdp.createClient(1901, function(err, client) {

    if (err) {
        return console.log(err);
    }

    client.on('response', function(headers) {

        console.log(headers);
        console.log('\n');

    });

    client.search('urn:dial-multiscreen-org:service:dial:1');

});