
// search for DIAL devices

var ssdp = require('../index.js');

var client = ssdp.createClient(1901, function(err, client) {

    if (err) {
        return console.log(err);
    }

    client.search('urn:dial-multiscreen-org:service:dial:1');

});

client.on('response', function(headers) {

    console.log(headers);
    console.log('\n');

});