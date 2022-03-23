/* eslint no-unused-expressions:0, no-invalid-this:0, prefer-arrow-callback: 0 */
/* globals describe, it */

'use strict';

// THis is just a wrapper, actual SMTPConnection tests reside here:
// https://github.com/nodemailer/nodemailer/tree/master/test/smtp-connection

const chai = require('chai');
const expect = chai.expect;
const SMTPConnection = require('../lib/smtp-connection');

chai.config.includeStack = true;

describe('Version test', function () {
    it('Should expose version number', function () {
        let client = new SMTPConnection();
        expect(client.version).to.exist;
    });
});
