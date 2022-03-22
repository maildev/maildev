/**
 * This is a modified version of a file from libmime v3.1.0
 * 
 * Original:
 * https://github.com/nodemailer/libmime/blob/v3.1.0/lib/libmime.js
 * Copyright (c) 2014-2017 Andris Reinman
 * 
 * Modifications:
 * Copyright (c) 2017 Ross Johnson
 * 
 * MIT licensed.
 */
'use strict';

var charset = require('../charset');
var libqp = require('../libqp');

const decodeBase64 = (str) => Buffer.from(str || '', 'base64');

var libmime = module.exports = {
    /**
     * Decodes a string from a format=flowed soft wrapping.
     *
     * @param {String} str Plaintext string with format=flowed to decode
     * @param {Boolean} [delSp] If true, delete leading spaces (delsp=yes)
     * @return {String} Mime decoded string
     */
    decodeFlowed: function (str, delSp) {
        str = (str || '').toString();

        return str.
        split(/\r?\n/).
            // remove soft linebreaks
            // soft linebreaks are added after space symbols
        reduce(
                function (previousValue, currentValue, index) {
                    var body = previousValue;
                    if (delSp) {
                        // delsp adds spaces to text to be able to fold it
                        // these spaces can be removed once the text is unfolded
                        body = body.replace(/[ ]+$/, '');
                    }
                    if (/ $/.test(previousValue) && !/(^|\n)\-\- $/.test(previousValue) || index === 1) {
                        return body + currentValue;
                    } else {
                        return body + '\n' + currentValue;
                    }
                }
            ).
            // remove whitespace stuffing
            // http://tools.ietf.org/html/rfc3676#section-4.4
        replace(/^ /gm, '');
    },

    /**
     * Decode a complete mime word encoded string
     *
     * @param {String} str Mime word encoded string
     * @return {String} Decoded unicode string
     */
    decodeWord: function (str) {
        str = (str || '').toString().trim();

        var fromCharset, encoding, match;

        match = str.match(/^\=\?([\w_\-\*]+)\?([QqBb])\?([^\?]*)\?\=$/i);
        if (!match) {
            return str;
        }

        // RFC2231 added language tag to the encoding
        // see: https://tools.ietf.org/html/rfc2231#section-5
        // this implementation silently ignores this tag
        fromCharset = match[1].split('*').shift();

        encoding = (match[2] || 'Q').toString().toUpperCase();
        str = (match[3] || '');

        if (encoding === 'Q') {
            // remove spaces between = and hex char, this might indicate invalidly applied line splitting
            str = str.replace(/=\s+([0-9a-fA-F])/, '=$1');
        }

        // convert all underscores to spaces
        str = str.replace(/_/g, ' ').replace(/ $/, '=20');

        if (encoding === 'B') {
            return charset.decode(decodeBase64(str), fromCharset);
        } else if (encoding === 'Q') {
            return charset.decode(libqp.decode(str), fromCharset);
        } else {
            return str;
        }
    },

    /**
     * Decode a string that might include one or several mime words
     *
     * @param {String} str String including some mime words that will be encoded
     * @return {String} Decoded unicode string
     */
    decodeWords: function (str) {
        const s1 = (str || '').toString();

        // find base64 words that can be joined
        const s2 = s1.replace(/(=\?([^?]+)\?[Bb]\?[^?=]*\?=)\s*(?==\?([^?]+)\?[Bb]\?[^?]*\?=)/g,
            function (match, left, chLeft, chRight) {
                // only mark b64 chunks to be joined if charsets match
                if (charset.normalizeCharset(chLeft || '').toLowerCase().trim() === charset.normalizeCharset(chRight || '').toLowerCase().trim()) {
                    // set a joiner marker
                    return left + '__\x00JOIN\x00__';
                }
                return match;
            });

        // find QP words that can be joined
        const s3 = s2.replace(/(=\?([^?]+)\?[Qq]\?[^?]*\?=)\s*(?==\?([^?]+)\?[Qq]\?[^?]*\?=)/g,
            function (match, left, chLeft, chRight) {
                // only mark QP chunks to be joined if charsets match
                if (charset.normalizeCharset(chLeft || '').toLowerCase().trim() === charset.normalizeCharset(chRight || '').toLowerCase().trim()) {
                    // set a joiner marker
                    return left + '__\x00JOIN\x00__';
                }
                return match;
            });

        // join base64 encoded words
        const s4 = s3.replace(/(\?=)?__\x00JOIN\x00__(=\?([^?]+)\?[QqBb]\?)?/g, '');

        // remove spaces between mime encoded words
        const s5 = s4.replace(/(=\?[^?]+\?[QqBb]\?[^?]*\?=)\s+(?==\?[^?]+\?[QqBb]\?[^?]*\?=)/g, '$1');

        // decode words
        const s6 = s5.replace(/\=\?([\w_\-\*]+)\?([QqBb])\?[^\?]*\?\=/g, function (mimeWord) {
            return libmime.decodeWord(mimeWord);
        });

        return s6;
    },

    /**
     * Splits a string by :
     * The result is not mime word decoded, you need to do your own decoding based
     * on the rules for the specific header key
     *
     * @param {String} headerLine Single header line, might include linebreaks as well if folded
     * @return {Object} And object of {key, value}
     */
    decodeHeader: function (headerLine) {
        var line = (headerLine || '').toString().replace(/(?:\r?\n|\r)[ \t]*/g, ' ').trim(),
            match = line.match(/^\s*([^:]+):(.*)$/),
            key = (match && match[1] || '').trim().toLowerCase(),
            value = (match && match[2] || '').trim();

        return {
            key: key,
            value: value
        };
    },

    /**
     * Parses a block of header lines. Does not decode mime words as every
     * header might have its own rules (eg. formatted email addresses and such)
     *
     * @param {String} headers Headers string
     * @return {Object} An object of headers, where header keys are object keys. NB! Several values with the same key make up an Array
     */
    decodeHeaders: function (headers) {
        var lines = headers.split(/\r?\n|\r/),
            headersObj = {},
            header,
            i, len;

        for (i = lines.length - 1; i >= 0; i--) {
            if (i && lines[i].match(/^\s/)) {
                lines[i - 1] += '\r\n' + lines[i];
                lines.splice(i, 1);
            }
        }

        for (i = 0, len = lines.length; i < len; i++) {
            header = libmime.decodeHeader(lines[i]);
            if (!headersObj[header.key]) {
                headersObj[header.key] = [header.value];
            } else {
                headersObj[header.key].push(header.value);
            }
        }

        return headersObj;
    },

    /**
     * Parses a header value with key=value arguments into a structured
     * object.
     *
     *   parseHeaderValue('content-type: text/plain; CHARSET='UTF-8'') ->
     *   {
     *     'value': 'text/plain',
     *     'params': {
     *       'charset': 'UTF-8'
     *     }
     *   }
     *
     * @param {String} str Header value
     * @return {Object} Header value as a parsed structure
     */
    parseHeaderValue: function (str) {
        var response = {
                value: false,
                params: {}
            },
            key = false,
            value = '',
            type = 'value',
            quote = false,
            escaped = false,
            chr;

        for (var i = 0, len = str.length; i < len; i++) {
            chr = str.charAt(i);
            if (type === 'key') {
                if (chr === '=') {
                    key = value.trim().toLowerCase();
                    type = 'value';
                    value = '';
                    continue;
                }
                value += chr;
            } else {
                if (escaped) {
                    value += chr;
                } else if (chr === '\\') {
                    escaped = true;
                    continue;
                } else if (quote && chr === quote) {
                    quote = false;
                } else if (!quote && chr === '"') {
                    quote = chr;
                } else if (!quote && chr === ';') {
                    if (key === false) {
                        response.value = value.trim();
                    } else {
                        response.params[key] = value.trim();
                    }
                    type = 'key';
                    value = '';
                } else {
                    value += chr;
                }
                escaped = false;

            }
        }

        if (type === 'value') {
            if (key === false) {
                response.value = value.trim();
            } else {
                response.params[key] = value.trim();
            }
        } else if (value.trim()) {
            response.params[value.trim().toLowerCase()] = '';
        }

        // handle parameter value continuations
        // https://tools.ietf.org/html/rfc2231#section-3

        // preprocess values
        Object.keys(response.params).forEach(function (key) {
            var actualKey, nr, match, value;
            if ((match = key.match(/(\*(\d+)|\*(\d+)\*|\*)$/))) {
                actualKey = key.substr(0, match.index);
                nr = Number(match[2] || match[3]) || 0;

                if (!response.params[actualKey] || typeof response.params[actualKey] !== 'object') {
                    response.params[actualKey] = {
                        charset: false,
                        values: []
                    };
                }

                value = response.params[key];

                if (nr === 0 && match[0].substr(-1) === '*' && (match = value.match(/^([^']*)'[^']*'(.*)$/))) {
                    response.params[actualKey].charset = match[1] || 'iso-8859-1';
                    value = match[2];
                }

                response.params[actualKey].values[nr] = value;

                // remove the old reference
                delete response.params[key];
            }
        });

        // concatenate split rfc2231 strings and convert encoded strings to mime encoded words
        Object.keys(response.params).forEach(function (key) {
            var value;
            if (response.params[key] && Array.isArray(response.params[key].values)) {
                value = response.params[key].values.map(function (val) {
                    return val || '';
                }).join('');

                if (response.params[key].charset) {
                    // convert "%AB" to "=?charset?Q?=AB?="
                    response.params[key] = '=?' +
                        response.params[key].charset +
                        '?Q?' +
                        value.
                        // fix invalidly encoded chars
                    replace(/[=\?_\s]/g,
                            function (s) {
                                var c = s.charCodeAt(0).toString(16);
                                if (s === ' ') {
                                    return '_';
                                } else {
                                    return '%' + (c.length < 2 ? '0' : '') + c;
                                }
                            }
                        ).
                        // change from urlencoding to percent encoding
                    replace(/%/g, '=') +
                        '?=';
                } else {
                    response.params[key] = value;
                }
            }
        }.bind(this));

        return response;
    }
};
