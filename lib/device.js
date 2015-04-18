
var os = require('os');

var httpu = require('./httpu.js'),
    shared = require('./ssdp-constants.js'),
    httpuSocketFactory = null;

var SSDP_MULTICAST_IP = shared.SSDP_MULTICAST_IP,
    SSDP_PORT = shared.SSDP_PORT;

var SERVER_STRING = os.type() + '/' + os.release() + '  UPnP/1.1 js-ssdp/' + require('../package.json').version;

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

// 2) sent initial ads twice (because udp is unreliable)

// 3) better/more thoughts on specs and options defaults
// i.e. a) defualt uuid? b) make sure cache time is 1800 min

function SsdpDevice(specs, options, callback) {

    var device = this;

    // create socket & listen for M-SEARCH requests
    httpuSocketFactory(function(msg, rinfo) {

        var searchTerm = '';

            if (msg.type === 'req' && msg.method === 'M-SEARCH' && typeof msg.headers.st === 'string') {

                searchTerm = msg.headers.st.trim();

                // check if device matches search term and respond as required:
                if (searchTerm === 'ssdp:all') {
                    device._respondForAll(rinfo.address, rinfo.port);
                } else if (device._serviceList.indexOf(searchTerm) !== -1) {
                    device._respond(rinfo.address, rinfo.port, searchTerm, 'uuid:' + device._uuid + '::' + searchTerm);
                } else if (searchTerm === 'uuid:' + device._uuid) {
                    device._respond(rinfo.address, rinfo.port, searchTerm, searchTerm);
                }

            }

    }, function(err, socket) {
        // on socket creation

        if (err) {
            return callback(err);
        }

        device._socket = socket;

        socket.bindAndJoin({
            port: options.port,
            ttl: 1,
            multicastIp: SSDP_MULTICAST_IP
        }, function(err) {

            if (err) {
                return callback(err);
            }

            callback(null, device);

        });

    });

    this._cacheId = Date.now() % 16777215;
    this._bootid = 0;
    this._location = specs.location;
    this._uuid = specs.uuid;
    this._cacheTime = options.cacheTime;
    this._serviceList = specs.serviceList;
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

    var device = this;

    device._serviceList.forEach(function(service) {

        device._sendNotifyForOne(type, service, 'uuid:' + device._uuid + '::' + service);

    });

    device._sendNotifyForOne(type, 'uuid:' + device._uuid, 'uuid:' + device._uuid);

};

SsdpDevice.prototype._respondForAll = function(ip, port) {

    var device = this;

    device._serviceList.forEach(function(service) {

        device._respond(ip, port, service, 'uuid:' + device._uuid + '::' + service);

    });

    device._respond(ip, port, 'uuid:' + device._uuid, 'uuid:' + device._uuid);

};

SsdpDevice.prototype.start = function() {

    // if this is the first time starting the device, then 
    // this._bootid === 0, so can use this to see if this 
    // is the first start or a restart:
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

function createDevice(specs, options, callback) {

    var err = null;

    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    if (typeof specs !== 'object' || !Array.isArray(specs.serviceList)) {

        err = new Error('SSDP: A device specification is required.');

        if (typeof callback === 'function') {
            callback(err);
        } else {
            throw err;
        }

    }

    specs.location = specs.location || '';
    specs.uuid = specs.uuid || '';

    // defaults
    options = options || {};
    options.port = options.port || SSDP_PORT;
    options.cacheTime = options.cacheTime || 1800;

    new SsdpDevice(specs, options, function(err, device) {

        if (typeof callback === 'function') {
            callback(err, device);
        }

    });

}

module.exports = function(udp) {

    httpuSocketFactory = httpu(udp);

    return createDevice;

};
