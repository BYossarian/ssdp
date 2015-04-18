
function stringToBuffer(string) {
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

function bufferToString(buffer) {
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

module.exports = {
    toBuffer: stringToBuffer,
    toString: bufferToString
};
