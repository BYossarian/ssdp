// module interface for chrome os

var udp = require('./lib/udp/udp-chrome.js');

module.exports = {
    createClient: require('./lib/client.js')(udp),
    createDevice: require('./lib/device.js')(udp)
};