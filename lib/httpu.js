
var httpParser = require('./modules/http-parser.js');

var udpFactory = null;

function request(options, headers, body) {
    // NB: assumes the context (i.e. this) will have a send method

    var msg = '';

    if (!options || !options.hostname) {
        throw new Error('HTTPU request message requires hostname.');
    }

    options.method = options.method || 'GET';
    options.port = options.port || 80;
    options.path = options.path || '/';

    headers = headers || {};

    // add Host header (required for HTTP/1.1)
    headers.Host = options.hostname + ':' + options.port;

    msg = httpParser.stringify({
        method: options.method,
        path: options.path
    }, headers, body);

    this.send(msg, options.hostname, options.port);

}

function respond(options, headers, body) {
    // NB: assumes the context (i.e. this) will have a send method

    var msg = '';

    if (!options || !options.hostname) {
        throw new Error('HTTPU response message requires hostname.');
    }

    options.status = options.status || 200;
    options.port = options.port || 80;

    headers = headers || {};

    // add Date header (required for HTTP/1.1)
    headers.Date = (new Date()).toUTCString();

    msg = httpParser.stringify({
        status: options.status
    }, headers, body);

    this.send(msg, options.hostname, options.port);

}

function create(onMsg, onCreated) {

    udpFactory(function(msg, rinfo) {

        var parsedMsg = httpParser.parse(msg);

        if (!parsedMsg) {
            // not a HTTPU message
            return;
        }

        onMsg(parsedMsg, rinfo);

    }, function(err, socket) {

        socket.request = request;
        socket.respond = respond;

        onCreated(err, socket);

    });

}

module.exports = function(udp) {

    udpFactory = udp;

    return create;

};