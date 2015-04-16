
// search for DIAL devices

var ssdp = require('../index.js');

var client = ssdp.createClient(1901);

client.on('response', function(headers) {

    console.log(headers);
    console.log('\n');

});

client.search('urn:dial-multiscreen-org:service:dial:1');