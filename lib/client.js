
var EventEmitter = require('events').EventEmitter;

var httpu = require('./httpu.js'),
    shared = require('./ssdp-constants.js'),
    httpuSocketFactory = null;

var SSDP_MULTICAST_IP = shared.SSDP_MULTICAST_IP,
    SSDP_PORT = shared.SSDP_PORT;

function SsdpClient(port, callback) {

    // extend eventemitter
    EventEmitter.call(this);

    // create socket & attach httpu message handlers
    var client = this;

    httpuSocketFactory(function(msg, rinfo) {
        // on message

        if (msg.type === 'res' && typeof msg.headers.location === 'string') {

            client.emit('response', msg.headers, rinfo);

        } else if (msg.type === 'req' && msg.method === 'NOTIFY') {

            client.emit('notification', msg.headers, rinfo);

        }

    }, function(err, socket) {
        // on socket creation

        if (err) {
            return callback(err);
        }

        client._socket = socket;

        socket.bindAndJoin({
            port: port,
            ttl: 1,
            multicastIp: SSDP_MULTICAST_IP
        }, function(err) {

            if (err) {
                return callback(err);
            }

            callback(null, client);

        });

    });

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

function createClient(port, callback) {

    if (typeof port === 'function') {
        callback = port;
        port = 0;
    }

    new SsdpClient(port || SSDP_PORT, function(err, client) {

        if (typeof callback === 'function') {
            callback(err, client);
        }

    });

}

module.exports = function(udp) {

    httpuSocketFactory = httpu(udp);

    return createClient;

};
