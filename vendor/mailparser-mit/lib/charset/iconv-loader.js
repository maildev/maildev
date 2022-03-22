/**
 * This is a modified version of a file from encoding 0.1.12
 * 
 * Original:
 * https://github.com/andris9/encoding/blob/master/lib/iconv-loader.js
 * Copyright (c) 2012-2014 Andris Reinman
 * 
 * Modifications:
 * Copyright (c) 2017 Ross Johnson
 * 
 * MIT licensed.
 */
'use strict';

var iconv_package;
var Iconv;

try {
    // this is to fool browserify so it doesn't try (in vain) to install iconv.
    iconv_package = 'iconv';
    Iconv = require(iconv_package).Iconv;
} catch (E) {
    // node-iconv not present
}

module.exports = Iconv;
