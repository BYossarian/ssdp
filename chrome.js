// module interface for chrome os

var ssdp = require('./lib/ssdp-chrome.js');

module.exports = {
    createClient: require('./lib/client.js')(ssdp),
    createDevice: require('./lib/device.js')(ssdp)
};