
// emulate a DIAL device

var ssdp = require('../index.js');

var device = ssdp.createDevice({
    uuid: '2fac1234-31f8-11b4-a222-08002b34c003',
    serviceList: ['upnp:rootdevice', 'urn:dial-multiscreen-org:device:dial:1', 'urn:dial-multiscreen-org:service:dial:1'],
    location: 'http://url.to.your/device.description.xml'
}, function(err, device) {

    if (err) {
        return console.log(err);
    }

    device.start();

});