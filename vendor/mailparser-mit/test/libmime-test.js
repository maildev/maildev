/**
 * This is a modified version of a file from libmime v3.1.0
 * 
 * Original:
 * https://github.com/nodemailer/libmime/blob/v3.1.0/test/libmime-test.js
 * Copyright (c) 2014-2017 Andris Reinman
 * 
 * Modifications:
 * Copyright (c) 2017 Ross Johnson
 * 
 * MIT licensed.
 */
'use strict';

const libmime = require('../lib/libmime/index');

const chai = require('chai');
const expect = chai.expect;
chai.config.includeStack = true;

describe('libmime', () => {
    describe('#decodeWords', () => {
        it('should decode single words', () => {
            const input1 = 'Hello: =?UTF-8?q?See_on_=C3=B5hin_test?=';
            const output1 = 'Hello: See on õhin test';
            const input2 = '=?UTF-8?q?See_on_=C3=B5hin_test?=';
            const output2 = 'See on õhin test';

            expect(libmime.decodeWords(input1)).to.equal(output1);
            expect(libmime.decodeWords(input2)).to.equal(output2);
        });

        it('should decode QP-encoded empty string', () => {
            const input = '=?UTF-8?Q??=';
            expect(libmime.decodeWords(input)).to.equal('');
        });

        it('should decode base64-encoded empty string', () => {
            const input = '=?UTF-8?B??=';
            expect(libmime.decodeWords(input)).to.equal('');
        });

        it('should decode multiple words', () => {
            expect('Jõge-vaŽ zz Jõge-vaŽJõge-vaŽJõge-vaŽ').to.equal(libmime.decodeWords('=?ISO-8859-13?Q?J=F5ge-va=DE?= zz =?ISO-8859-13?Q?J=F5ge-va=DE?= =?ISO-8859-13?Q?J=F5ge-va=DE?= =?ISO-8859-13?Q?J=F5ge-va=DE?='));
            expect('Sssś Lałalalala').to.equal(libmime.decodeWords('=?UTF-8?B?U3NzxZsgTGHFgmFsYQ==?= =?UTF-8?B?bGFsYQ==?='));
        });

        it('should decode QP-encoded mime word', () => {
            expect('Jõge-vaŽ').to.equal(libmime.decodeWord('=?ISO-8859-13?Q?J=F5ge-va=DE?='));
        });

        it('should decode ascii range', () => {
            var input1 = 'метель" вьюга',
                input2 = 'метель\'вьюга',
                output1 = '=?UTF-8?Q?=D0=BC=D0=B5=D1=82=D0=B5=D0=BB=D1=8C=22_?= =?UTF-8?Q?=D0=B2=D1=8C=D1=8E=D0=B3=D0=B0?=',
                output2 = '=?UTF-8?Q?=D0=BC=D0=B5=D1=82=D0=B5=D0=BB=D1=8C\'?= =?UTF-8?Q?=D0=B2=D1=8C=D1=8E=D0=B3=D0=B0?=';

            expect(libmime.decodeWords(output1)).to.equal(input1);
            expect(libmime.decodeWords(output2)).to.equal(input2);
        });

        it('should decode split QP', () => {
            const input = '=?UTF-8?Q?J=C3=B5geva_?= =?UTF-8?Q?J=C3=B5geva_?= =?UTF-8?Q?J=C3=B5geva_?= =?UTF-8?Q?mugeva_J?= =?UTF-8?Q?=C3=B5geva_J?= =?UTF-8?Q?=C3=B5geva_J?= =?UTF-8?Q?=C3=B5geva_J?= =?UTF-8?Q?=C3=B5geva_J?= =?UTF-8?Q?=C3=B5geva?=';
            const output = 'Jõgeva Jõgeva Jõgeva mugeva Jõgeva Jõgeva Jõgeva Jõgeva Jõgeva';

            expect(libmime.decodeWords(input)).to.equal(output);
        });

        it('should decode split base64', () => {
            const input = '=?UTF-8?B?w7XDtcO1w7XDtSA=?= =?UTF-8?B?w7XDtcO1w7XDtSA=?= =?UTF-8?B?w7XDtcO1w7XDtSBt?= =?UTF-8?B?dWdldmEgw7XDtcO1?= =?UTF-8?B?w7XDtSDDtcO1w7U=?= =?UTF-8?B?w7XDtSDDtcO1w7U=?= =?UTF-8?B?w7XDtSDDtcO1w7U=?= =?UTF-8?B?w7XDtSBKw7VnZXZh?=';
            const output = 'õõõõõ õõõõõ õõõõõ mugeva õõõõõ õõõõõ õõõõõ õõõõõ Jõgeva';

            expect(libmime.decodeWords(input)).to.equal(output);
        });

        it('should ignore language param', () => {
            expect('Hello: See on õhin test').to.equal(libmime.decodeWords('Hello: =?UTF-8*EN?q?See_on_=C3=B5hin_test?='));
        });

        it('should handle chars invalidly split across base64-encoded words', () => {
            const input = '=?utf-8?B?R0xHOiBSZWd1bGF0aW9uIG9mIFRheGkgaW4gQ2hpbmEgLSDl?= =?utf-8?B?vKDkuIDlhbU=?=';
            const output = 'GLG: Regulation of Taxi in China - 张一兵';
            expect(libmime.decodeWords(input)).to.equal(output);
        });

        it('should handle chars invalidly split across base64-encoded words (> 2 splits)', () => {
            const input = '=?utf-8?B?R0xHOiBSZWd1bGF0aW9uIG9mIFRheGkgaW4gQ2hpbmEgLSDl?= =?utf-8?B?vKDkuIDl?= =?utf-8?B?hbU=?=';
            const output = 'GLG: Regulation of Taxi in China - 张一兵';
            expect(libmime.decodeWords(input)).to.equal(output);
        });

        it('should handle chars invalidly split across base64-encoded words (with empty word in between)', () => {
            const input = '=?utf-8?B?R0xHOiBSZWd1bGF0aW9uIG9mIFRheGkgaW4gQ2hpbmEgLSDl?= =?utf-8?B??= =?utf-8?B?vKDkuIDlhbU=?=';
            const output = 'GLG: Regulation of Taxi in China - 张一兵';
            expect(libmime.decodeWords(input)).to.equal(output);
        });

        it('should handle chars invalidly spit across QP-encoded words', () => {
            const input = '=?utf-8?Q?=D0=B3=D0=BE=D1=81_?==?utf-8?Q?(=D0=BF=D0=B5=D1=80=D0=B5=\r\n D0=B4=D0=B0=D0=B9_=D0=BA=D0=BE=D0?=\r\n =?utf-8?Q?=BC=D1=83_=D0=BD=D0=B0=D0=B4=D0=BE_=D1=82=D0=BE=D0=B6=D0=B5?=';
            const output = 'гос (передай кому надо тоже';
            expect(libmime.decodeWords(input)).to.equal(output);
        });

        it('should handle chars invalidly spit across QP-encoded words (with empty word in between)', () => {
            const input = '=?utf-8?Q?=D0=B3=D0=BE=D1=81_?==?utf-8?Q??==?utf-8?Q?(=D0=BF=D0=B5=D1=80=D0=B5=\r\n D0=B4=D0=B0=D0=B9_=D0=BA=D0=BE=D0?=\r\n =?utf-8?Q?=BC=D1=83_=D0=BD=D0=B0=D0=B4=D0=BE_=D1=82=D0=BE=D0=B6=D0=B5?=';
            const output = 'гос (передай кому надо тоже';
            expect(libmime.decodeWords(input)).to.equal(output);
        });
    });

    describe('#decodeHeaders', () => {
        it('should decode headers', () => {
            var headersObj = {
                    subject: ['Tere =?UTF-8?Q?J=C3=B5geva?='],
                    'x-app': ['My =?UTF-8?Q?=C5=A1=C5=A1=C5=A1=C5=A1?= app line 1', 'My =?UTF-8?Q?=C5=A1=C5=A1=C5=A1=C5=A1?= app line 2'],
                    'long-line': ['tere =?UTF-8?Q?=C3=B5klva?= karu =?UTF-8?Q?m=C3=B5kva_=C5=A1apaka=C5=A1?= tutikas suur maja, =?UTF-8?Q?k=C3=B5rge?= hoone, segane jutt']
                },
                headersStr = 'Subject: Tere =?UTF-8?Q?J=C3=B5geva?=\r\n' +
                'X-APP: My =?UTF-8?Q?=C5=A1=C5=A1=C5=A1=C5=A1?= app line 1\r\n' +
                'X-APP: My =?UTF-8?Q?=C5=A1=C5=A1=C5=A1=C5=A1?= app line 2\r\n' +
                'Long-Line: tere =?UTF-8?Q?=C3=B5klva?= karu\r\n' +
                ' =?UTF-8?Q?m=C3=B5kva_=C5=A1apaka=C5=A1?= tutikas suur maja,\r\n' +
                ' =?UTF-8?Q?k=C3=B5rge?= hoone, segane jutt';

            expect(headersObj).to.deep.equal(libmime.decodeHeaders(headersStr));
        });
    });

    describe('#parseHeaderValue', () => {
        it('should handle default value only', () => {
            var str = 'text/plain',
                obj = {
                    value: 'text/plain',
                    params: {}
                };

            expect(libmime.parseHeaderValue(str)).to.deep.equal(obj);
        });

        it('should handle unquoted params', () => {
            var str = 'text/plain; CHARSET= UTF-8; format=flowed;',
                obj = {
                    value: 'text/plain',
                    params: {
                        charset: 'UTF-8',
                        format: 'flowed'
                    }
                };

            expect(libmime.parseHeaderValue(str)).to.deep.equal(obj);
        });

        it('should handle quoted params', () => {
            var str = 'text/plain; filename= ";;;\\\""; format=flowed;',
                obj = {
                    value: 'text/plain',
                    params: {
                        filename: ';;;"',
                        format: 'flowed'
                    }
                };

            expect(libmime.parseHeaderValue(str)).to.deep.equal(obj);
        });

        it('should handle multi line values', () => {
            var str = 'text/plain; single_encoded*="UTF-8\'\'%C3%95%C3%84%C3%96%C3%9C";\n' +
                ' multi_encoded*0*=UTF-8\'\'%C3%96%C3%9C;\n' +
                ' multi_encoded*1*=%C3%95%C3%84;\n' +
                ' no_charset*0=OA;\n' +
                ' no_charset*1=OU;\n' +
                ' invalid*=utf-8\'\' _?\'=%ab',
                obj = {
                    value: 'text/plain',
                    params: {
                        single_encoded: '=?UTF-8?Q?=C3=95=C3=84=C3=96=C3=9C?=',
                        multi_encoded: '=?UTF-8?Q?=C3=96=C3=9C=C3=95=C3=84?=',
                        no_charset: 'OAOU',
                        invalid: '=?utf-8?Q?_=5f=3f\'=3d=ab?='
                    }
                };

            expect(libmime.parseHeaderValue(str)).to.deep.equal(obj);
        });

        it('should handle params only', () => {
            var str = '; CHARSET= UTF-8; format=flowed;',
                obj = {
                    value: '',
                    params: {
                        charset: 'UTF-8',
                        format: 'flowed'
                    }
                };

            expect(libmime.parseHeaderValue(str)).to.deep.equal(obj);
        });
    });

   describe('#decodeFlowed', () => {
        it('should remove soft line breaks', () => {
            var str = 'tere tere tere tere tere tere tere tere tere tere tere tere tere tere tere tere tere tere tere tere\nFrom\n Hello\n> abc\nabc',
                folded = 'tere tere tere tere tere tere tere tere tere tere tere tere tere tere tere \r\n' +
                'tere tere tere tere tere\r\n' +
                ' From\r\n' +
                '  Hello\r\n' +
                ' > abc\r\n' +
                'abc';
            expect(libmime.decodeFlowed(folded)).to.equal(str);
        });

        it('should remove soft line breaks and spacing', () => {
            var str = 'tere tere tere tere tere tere tere tere tere tere tere tere tere tere teretere tere tere tere tere\nFrom\n Hello\n> abc\nabc',
                folded = 'tere tere tere tere tere tere tere tere tere tere tere tere tere tere tere \r\n' +
                'tere tere tere tere tere\r\n' +
                ' From\r\n' +
                '  Hello\r\n' +
                ' > abc\r\n' +
                'abc';
            expect(libmime.decodeFlowed(folded, true)).to.equal(str);
        });
    });
});
