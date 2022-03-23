/**
 * This is a modified version of a file from libqp v1.1.0
 * 
 * Original:
 * https://github.com/nodemailer/libqp/blob/v1.1.0/lib/libqp.js
 * Copyright (c) 2014 Andris Reinman
 * 
 * Modifications:
 * Copyright (c) 2017 Ross Johnson
 * 
 * MIT licensed.
 */
'use strict';

var stream = require('stream');
var util = require('util');
var Transform = stream.Transform;

// expose to the world
module.exports = {
    decode: decode,
    Decoder: Decoder
};

/**
 * Decodes a Quoted-Printable encoded string to a Buffer object
 *
 * @param {String} str Quoted-Printable encoded string
 * @returns {Buffer} Decoded value
 */
function decode(str) {
    str = (str || '').toString().
        // remove invalid whitespace from the end of lines
    replace(/[\t ]+$/gm, '').
        // remove soft line breaks
    replace(/\=(?:\r?\n|$)/g, '');

    var encodedBytesCount = (str.match(/\=[\da-fA-F]{2}/g) || []).length,
        bufferLength = str.length - encodedBytesCount * 2,
        chr, hex,
        buffer = new Buffer.alloc(bufferLength),
        bufferPos = 0;

    for (var i = 0, len = str.length; i < len; i++) {
        chr = str.charAt(i);
        if (chr === '=' && (hex = str.substr(i + 1, 2)) && /[\da-fA-F]{2}/.test(hex)) {
            buffer[bufferPos++] = parseInt(hex, 16);
            i += 2;
            continue;
        }
        buffer[bufferPos++] = chr.charCodeAt(0);
    }

    return buffer;
}

/**
 * Creates a transform stream for decoding Quoted-Printable encoded strings
 *
 * @constructor
 * @param {Object} options Stream options
 */
function Decoder(options) {
    // init Transform
    this.options = options || {};
    this._curLine = '';

    this.inputBytes = 0;
    this.outputBytes = 0;

    Transform.call(this, this.options);
}
util.inherits(Decoder, Transform);

Decoder.prototype._transform = function(chunk, encoding, done) {
    var qp, buf, _self = this;

    chunk = chunk.toString('ascii');

    if (!chunk || !chunk.length) {
        return done();
    }

    this.inputBytes += chunk.length;

    qp = (this._curLine + chunk);
    this._curLine = '';
    qp = qp.replace(/=[^\n]?$/, function(lastLine) {
        _self._curLine = lastLine;
        return '';
    });

    if (qp) {
        buf = decode(qp);
        this.outputBytes += buf.length;
        this.push(buf);
    }

    done();
};

Decoder.prototype._flush = function(done) {
    var qp, buf;
    if (this._curLine) {
        buf = decode(this._curLine);
        this.outputBytes += buf.length;
        this.push(buf);
    }
    done();
};