
var dgram = require('dgram');

var httpu = require('./httpu/httpu.js'),
    httpParser = require('./httpu/http-parser.js');

function SsdpSocket(udpSocket) {

    this._socket = udpSocket;

}

SsdpSocket.prototype.send = function(msg, ip, port) {

    var msgBuffer = new Buffer(msg);
    this._socket.send(msgBuffer, 0, msgBuffer.length, port, ip);

}

SsdpSocket.prototype.respond = function () {

    httpu.respond.apply(this, arguments);

}

SsdpSocket.prototype.request = function () {

    httpu.request.apply(this, arguments);

}

// TODO: think about https://github.com/joyent/node/issues/5425
SsdpSocket.prototype.bindAndJoin = function (options, callback) {

    var socket = this._socket,
        that = this;

    socket.bind(options.port, function() {

        socket.setMulticastTTL(options.ttl);
        socket.addMembership(options.multicastIp);

        callback(null, that);

    });

}

// creates a UDP socket that has events and methods for HTTPU
function create(onMsg, onCreated) {

    var udpSocket = dgram.createSocket('udp4'),
        socket = new SsdpSocket(udpSocket);

    udpSocket.on('message', function(msg, rinfo) {

        var parsedMsg = httpParser.parse(msg.toString());

        if (!parsedMsg) {
            // not a HTTPU message
            return;
        }

        onMsg(parsedMsg, rinfo);

    });

    // fake async
    setTimeout(function() {

        onCreated(null, socket);

    }, 0);

    return socket;

}

module.exports = {
    create: create
};