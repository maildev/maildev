/**
 * This is a modified version of a file from libmime v3.1.0
 * 
 * Original:
 * https://github.com/nodemailer/libmime/blob/v3.1.0/test/libmime-test.js
 * Copyright (c) 2014-2023 Andris Reinman
 * 
 * Modifications:
 * Copyright (c) 2023 Ross Johnson
 * 
 * MIT licensed.
 */
'use strict';

const charset = require('../lib/charset/index');

var chai = require('chai');
var expect = chai.expect;
chai.config.includeStack = true;

describe('#charset', () => {
    describe('#decode', () => {
        it('should decode UTF-8 Buffer to string', () => {
            const input = new Buffer.from([0xEC, 0x8B, 0xA0]);
            const output = '신';

            expect(charset.decode(input)).to.deep.equal(output);
        });

        it('should decode non UTF-8 Buffer', () => {
            const input = new Buffer.from([0xBD, 0xC5]);
            const encoding = 'ks_c_5601-1987';
            const output = '신';

            expect(charset.decode(input, encoding)).to.deep.equal(output);
        });
    });
});
