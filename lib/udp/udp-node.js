
var dgram = require('dgram');

var udpPrototype = Object.create(null);

udpPrototype.send = function(msg, ip, port) {

    var msgBuffer = new Buffer(msg);
    this._socket.send(msgBuffer, 0, msgBuffer.length, port, ip);

};

// TODO: think about https://github.com/joyent/node/issues/5425
udpPrototype.bindAndJoin = function (options, callback) {

    var socket = this._socket,
        that = this;

    socket.bind(options.port, function() {

        socket.setMulticastTTL(options.ttl);
        socket.addMembership(options.multicastIp);

        callback(null, that);

    });

};

function create(onMsg, onCreated) {

    var udpSocket = Object.create(udpPrototype);

    udpSocket._socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    udpSocket._socket.on('message', function(msg, rinfo) {

        onMsg(msg.toString(), rinfo);

    });

    // fake async
    setTimeout(function() {

        onCreated(null, udpSocket);

    }, 0);

}

module.exports = create;