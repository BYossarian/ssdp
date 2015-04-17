// module interface for node

var ssdp = require('./lib/ssdp-node.js');

module.exports = {
    createClient: require('./lib/client.js')(ssdp),
    createDevice: require('./lib/device.js')(ssdp)
};