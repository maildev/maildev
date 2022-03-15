/**
 * This is a modified version of a file from libmime v3.1.0
 * 
 * Original:
 * https://github.com/nodemailer/libmime/blob/v3.1.0/lib/charset.js
 * Copyright (c) 2014-2017 Andris Reinman
 * 
 * Modifications:
 * Copyright (c) 2017 Ross Johnson
 * 
 * MIT licensed.
 */
'use strict';

const EventEmitter = require('events');
const iconvLite = require('iconv-lite');
// Load Iconv from an external file to be able to disable Iconv for webpack
// Add /\/iconv-loader$/ to webpack.IgnorePlugin to ignore it
const Iconv = require('./iconv-loader');
const charsets = require('./charsets');

/**
 * Character set encoding and decoding functions
 */
var charset = module.exports = {
    emitter: new EventEmitter(),

    /**
     * Decodes a string from Buffer to an unicode string using specified encoding
     * NB! Throws if unknown charset is used
     *
     * @param {Buffer} buf Binary data to be decoded
     * @param {String} [from='UTF-8'] Binary data is decoded into string using this charset
     * @return {String} Decded string
     */
    decode: function (buf, from) {
        const from2 = charset.normalizeCharset(from || 'UTF-8');

        if (/^(us\-)?ascii|utf\-8|7bit$/i.test(from2)) {
            return buf.toString('utf-8');
        }

        // First, try iconv-lite
        let result;
        try {
            result = charset._decodeIconvLite(buf, from2);
        } catch (err1) {
            try {
                if (!Iconv) {
                    throw err1;
                } 

                // Try Iconv
                result = charset._decodeIconv(buf, from2);
            } catch (err2) {
                charset.emitter.emit('charsetError', err2, from, from2);
                result = charset._decodeIconvLite(buf, 'ISO-8859-1');
            }
        }

        return result;
    },

    /**
     * Convert encoding of a string with node-iconv (if available)
     *
     * @param {Buffer} buf Binary data to be decoded
     * @param {String} from Encoding to be converted from
     * @return {String} Decoded string
     */
    _decodeIconv: function (buf, from) {
        const iconv = new Iconv(from, 'UTF-8//TRANSLIT//IGNORE');
        const response = iconv.convert(buf).toString('utf8');
        return response;
    },

    /**
     * Convert encoding of astring with iconv-lite
     *
     * @param {Buffer} buf Binary data to be decoded
     * @param {String} from Encoding to be converted from
     * @return {String} Decoded string
     */
    _decodeIconvLite: function (buf, from) {
        return iconvLite.decode(buf, from);
    },

    /**
     * Converts well known invalid character set names to proper names.
     * eg. win-1257 will be converted to WINDOWS-1257
     *
     * @param {String} charset Charset name to convert
     * @return {String} Canoninicalized charset name
     */
    normalizeCharset: function (charset) {
        charset = charset.toLowerCase().trim();

        // first pass
        if (charsets.hasOwnProperty(charset) && charsets[charset]) {
            return charsets[charset];
        }

        charset = charset.
            replace(/^utf[\-_]?(\d+)/, 'utf-$1').
            replace(/^(?:us[\-_]?)ascii/, 'windows-1252').
            replace(/^win(?:dows)?[\-_]?(\d+)/, 'windows-$1').
            replace(/^(?:latin|iso[\-_]?8859)?[\-_]?(\d+)/, 'iso-8859-$1').
            replace(/^l[\-_]?(\d+)/, 'iso-8859-$1');

        // updated pass
        if (charsets.hasOwnProperty(charset) && charsets[charset]) {
            return charsets[charset];
        }

        // unknown?
        return charset.toUpperCase();
        //return 'WINDOWS-1252';
    }
};
