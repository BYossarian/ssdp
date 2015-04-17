
var udp = chrome.sockets.udp;

var httpu = require('./httpu/httpu.js'),
    httpParser = require('./httpu/http-parser.js');

function _stringToBuffer(string) {
    // NB: uses UTF-8

    var byteString = '',
        buffer = null,
        bufferView = null;

    if (typeof window.TextEncoder === 'function') {
        return (new TextEncoder('utf-8')).encode(string).buffer;
    } else {
        // fallback

        byteString = unescape(encodeURIComponent(string));
        buffer = new ArrayBuffer(byteString.length);
        bufferView = new Uint8Array(buffer);

        for (var i=0, l=byteString.length; i < l; i++) {
            bufferView[i] = byteString.charCodeAt(i);
        }

        return buffer;

    }

}

function _bufferToString(buffer) {
    // NB: uses UTF-8

    var bufferView = null,
        byteString = '';

    if (typeof window.TextDecoder === 'function') {
        return (new TextDecoder('utf-8')).decode(buffer);
    } else {
        // fallback

        bufferView = new Uint8Array(buffer);
        byteString = String.fromCharCode.apply(String, bufferView);

        return decodeURIComponent(escape(byteString));
    }

}

function SsdpSocket() {

}

SsdpSocket.prototype.send = function(msg, ip, port) {

    var msgBuffer = _stringToBuffer(msg);

    // send text msg to port and ip
    udp.send(this._id, msgBuffer, ip, port, function(resultCode) {

        if (resultCode !== 0) {
            // TODO handle error
        }

    });

};

SsdpSocket.prototype.respond = function () {

    httpu.respond.apply(this, arguments);

};

SsdpSocket.prototype.request = function () {

    httpu.request.apply(this, arguments);

};

SsdpSocket.prototype.bindAndJoin = function (options, callback) {

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

    var socket = new SsdpSocket();

    udp.create({}, function(socketInfo) {

        socket._socketInfo = socketInfo;
        socket._id = socketInfo.socketId;

        udp.onReceive.addListener(function(msg) {

            if (msg.socketId !== socket._id) {
                // not for this socket
                return;
            }

            var msgString = _bufferToString(msg.data),
                parsedMsg = httpParser.parse(msgString),
                rinfo = {
                    address: msg.remoteAddress,
                    port: msg.remotePort
                };

            if (!parsedMsg) {
                // not a HTTPU message
                return;
            }

            onMsg(parsedMsg, rinfo);

        });

        onCreated(null, socket);

    });

}

module.exports = {
    create: create
};