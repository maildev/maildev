/**
 * This is a modified version of a file from libqp v1.1.0
 * 
 * Original:
 * https://github.com/nodemailer/libqp/blob/v1.1.0/test/libqp-unit.js
 * Copyright (c) 2023 Andris Reinman
 * 
 * Modifications:
 * Copyright (c) 2023 Ross Johnson
 * 
 * MIT licensed.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');

const chai = require('chai');

const libqp = require('../lib/libqp/index.js');

const expect = chai.expect;
chai.config.includeStack = true;

describe('libqp', () => {
    const encodeFixtures = [
        ['abcd= ÕÄÖÜ', 'abcd=3D =C3=95=C3=84=C3=96=C3=9C'],
        ['foo bar  ', 'foo bar =20'],
        ['foo bar\t\t', 'foo bar\t=09'],
        ['foo \r\nbar', 'foo=20\r\nbar']
    ];

    const decodeFixtures = [
        ['foo bar\r\nbaz\r\n', 'foo =\r\nbar \r\nbaz\r\n']
    ];

    const streamFixture = [
        '123456789012345678  90\r\nõäöüõäöüõäöüõäöüõäöüõäöüõäöüõäöü another line === ',
        '12345678=\r\n90123456=\r\n78=20=20=\r\n90\r\n=C3=B5=\r\n=C3=A4=\r\n=C3=B6=\r\n=C3=BC=\r\n=C3=B5=\r\n=C3=A4=\r\n=C3=B6=\r\n=C3=BC=\r\n=C3=B5=\r\n=C3=A4=\r\n=C3=B6=\r\n=C3=BC=\r\n=C3=B5=\r\n=C3=A4=\r\n=C3=B6=\r\n=C3=BC=\r\n=C3=B5=\r\n=C3=A4=\r\n=C3=B6=\r\n=C3=BC=\r\n=C3=B5=\r\n=C3=A4=\r\n=C3=B6=\r\n=C3=BC=\r\n=C3=B5=\r\n=C3=A4=\r\n=C3=B6=\r\n=C3=BC=\r\n=C3=B5=\r\n=C3=A4=\r\n=C3=B6=\r\n=C3=BC=\r\n=20anoth=\r\ner=20lin=\r\ne=20=3D=\r\n=3D=3D=20'
    ];

    describe('#decode', () => {
        it('shoud decode QP', () => {
            encodeFixtures.concat(decodeFixtures).forEach((test) => {
                expect(libqp.decode(test[1]).toString('utf-8')).to.equal(test[0]);
            });
        });
    });

    describe('QP Streams', () => {
        it('should transform incoming QP to bytes', (done) => {
            var decoder = new libqp.Decoder();

            var bytes = new Buffer.from(streamFixture[1]),
                i = 0,
                buf = [],
                buflen = 0;

            decoder.on('data', (chunk) => {
                buf.push(chunk);
                buflen += chunk.length;
            });

            decoder.on('end', (chunk) => {
                if (chunk) {
                    buf.push(chunk);
                    buflen += chunk.length;
                }
                buf = Buffer.concat(buf, buflen);

                expect(buf.toString()).to.equal(streamFixture[0]);
                done();
            });

            var sendNextByte = () => {
                if (i >= bytes.length) {
                    return decoder.end();
                }

                var ord = bytes[i++];
                decoder.write(new Buffer.from([ord]));
                setImmediate(sendNextByte);
            };

            sendNextByte();
        });
    });
});