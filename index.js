// module interface for node

var udp = require('./lib/udp/udp-node.js');

module.exports = {
    createClient: require('./lib/client.js')(udp),
    createDevice: require('./lib/device.js')(udp)
};