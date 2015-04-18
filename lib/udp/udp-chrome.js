
var udp = chrome.sockets.udp;

var utf8Parser = require('../modules/utf8-parser.js');

var udpPrototype = Object.create(null);

udpPrototype.send = function(msg, ip, port) {

    var msgBuffer = utf8Parser.toBuffer(msg);

    // send text msg to port and ip
    udp.send(this._id, msgBuffer, ip, port, function(resultCode) {

        if (resultCode !== 0) {
            // TODO handle error
        }

    });

};

udpPrototype.bindAndJoin = function (options, callback) {

    var id = this._id,
        that = this;

    udp.setMulticastTimeToLive(id, options.ttl, function(result) {

        if (result < 0) {
            // err
            return callback(new Error('setMulticastTTL error: ' + result));
        }

        udp.bind(id, '0.0.0.0', options.port, function(result) {

            if (result < 0) {
                // err
                return callback(new Error('Socket binding error: ' + result));
            }

            udp.joinGroup(id, options.multicastIp, function(result) {

                if (result < 0) {
                    // err
                    return callback(new Error('addMembership error: ' + result));
                }
                
                callback(null, that);
            
            });

        });

    });

};

function create(onMsg, onCreated) {

    var udpSocket = Object.create(udpPrototype);

    udp.create({}, function(socketInfo) {

        udpSocket._socketInfo = socketInfo;
        udpSocket._id = socketInfo.socketId;

        udp.onReceive.addListener(function(msg) {

            if (msg.socketId !== udpSocket._id) {
                // not for this socket
                return;
            }

            var msgString = utf8Parser.toString(msg.data),
                rinfo = {
                    address: msg.remoteAddress,
                    port: msg.remotePort
                };

            onMsg(msgString, rinfo);

        });

        onCreated(null, udpSocket);

    });

}

module.exports = create;