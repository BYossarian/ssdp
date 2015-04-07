
var os = require('os');

var httpu = require('node-httpu'),
    shared = require('./shared.js');

var SSDP_MULTICAST_IP = shared.SSDP_MULTICAST_IP,
    SSDP_PORT = shared.SSDP_PORT;

var SERVER_STRING = os.type() + '/' + os.release() + '  UPnP/1.1 node_ssdp/1.0';

// uPnP spec notes:
// 1) Bootid.upnp.org should be an int that increases each time the device is booted
// 2) Configid.upnp.org is used as a cache control for the device description
//    i.e. if it stays the same, clients may assume the device description hasn't changed

// TODO:
// 1) spec advises that certain advertisements/responses be spread out over time to 
//    avoid network congestion. ie.
//      a) M-SEARCH responses should be delay by a random time up to num seconds in the MX field
//      b) unicast M-SEARCH should reply within 1 sec
//      c) ads should be spaced out evenly (except initial ad, which should be sent within 100ms)
// 2) check all messages conform to spec
// 3) sent initial ads twice (because udp is unreliable)

function SsdpDevice(specs, options) {

    var server = this,
        socket = null;

    // create socket & listen for M-SEARCH requests
    socket = httpu.createSocket('udp4', function(msg, rinfo) {

            if (msg.type === 'req' && msg.method === 'M-SEARCH') {

                // TODO: check if device has search term & respond

            }

        });

    socket.bind(options.port, function() {

        socket.setMulticastTTL(1);
        socket.addMembership(SSDP_MULTICAST_IP);

    });

    this._socket = socket;

    this._cacheId = Date.now() % 16777215;
    this._bootid = 0;
    this._location = options.location;
    this._cacheTime = options.cacheTime;
    this._specs = specs;
    this._adTimer = null;

}

SsdpDevice.prototype._respond = function(ip, port, st, usn) {

    this._socket.respond({
        hostname: ip,
        port: port,
        status: 200
    }, {
        'Cache-Control': ' max-age = ' + this._cacheTime,
        Ext: '', // required for backwards compatibility
        Location: this._location || '',
        Server: SERVER_STRING,
        St: st,
        Usn: usn,
        'Bootid.upnp.org': this._bootid
    });

};

SsdpDevice.prototype._sendNotifyForOne = function(type, nt, usn) {

    this._socket.request({
        hostname: SSDP_MULTICAST_IP,
        port: SSDP_PORT,
        method: 'NOTIFY',
        path: '*'
    }, {
        'Cache-Control': ' max-age = ' + this._cacheTime,
        Location: this._location || '',
        Nt: nt,
        Nts: 'ssdp:' + type,
        Usn: usn,
        Server: SERVER_STRING,
        'Bootid.upnp.org': this._bootid
    });

};

SsdpDevice.prototype._sendNotifyForAll = function(type) {

    var server = this;

    this._specs.forEach(function(spec) {

        server._sendNotifyForOne(type, spec.nt, spec.usn);

    });

};

SsdpDevice.prototype.start = function() {

    var update = !this._bootid,
        server = this;

    this._bootid = Date.now();

    // send initial notification
    this._sendNotifyForAll(update ? 'update' : 'alive');

    // set up advertisements - at an interval of 40% of cacheTime
    // (which is in seconds) so ad arrives before the old one expires
    // and two ads will be sent before the cache is potentially expired
    // (because UDP is unreliable)
    this._adTimer = setInterval(function() {

        server._sendNotifyForAll('alive');

    }, 400 * this._cacheTime);

};

SsdpDevice.prototype.stop = function() {

    // send byebye notify, and stop sending
    this._sendNotifyForAll('byebye');

    // cancel advertisements
    clearInterval(this._adTimer);

};

SsdpDevice.prototype.restart = function() {
    
    this.stop();
    this.start();

};

function createDevice(specs, options) {

    // TODO: better/more thoughts on specs and options defaults

    // defaults
    options = options || {};
    options.port = options.port || SSDP_PORT;
    options.location = options.location || '';
    options.cacheTime = options.cacheTime || 1800;

    return new SsdpDevice(specs, options);

}

module.exports = createDevice;