
var EventEmitter = require('events').EventEmitter;

var httpu = require('node-httpu'),
    shared = require('./shared.js');

var SSDP_MULTICAST_IP = shared.SSDP_MULTICAST_IP,
    SSDP_PORT = shared.SSDP_PORT;

// TODO:
// 1) provide higher level monitoring of device state?
// 2) have serach() return an event emitter from which
//      'response' messages are received?

function SsdpClient(port) {

    // extend eventemitter
    EventEmitter.call(this);

    // create socket & attach httpu message handlers
    var client = this,
        socket = httpu.createSocket('udp4', function(msg, rinfo) {

            if (msg.type === 'res' && msg.headers.location) {

                client.emit('response', msg.headers, rinfo);

            } else if (msg.type === 'req' && msg.method === 'NOTIFY') {

                client.emit('notification', msg.headers, rinfo);

            }

        });

    socket.bind(port, function() {

        socket.setMulticastTTL(1);
        socket.addMembership(SSDP_MULTICAST_IP);

    });

    this._socket = socket;

}

// extend eventemitter
SsdpClient.prototype = Object.create(EventEmitter.prototype);

SsdpClient.prototype.search = function(st) {

    this._socket.request({
            method: 'M-SEARCH',
            path: '*',
            hostname: SSDP_MULTICAST_IP,
            port: SSDP_PORT
        }, {
            MAN: '"ssdp:discover"',
            ST: st || 'ssdp:all',
            MX: 3
        });

};

function createClient(port) {

    // TODO: think about https://github.com/joyent/node/issues/5425
    return new SsdpClient(port || SSDP_PORT);

}

module.exports = createClient;