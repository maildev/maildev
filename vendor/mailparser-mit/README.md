# MailParser-MIT

[![npm](https://img.shields.io/npm/v/mailparser2-mit)](https://www.npmjs.com/package/mailparser2-mit)
[![NPM](https://img.shields.io/npm/l/mailparser2-mit)](https://www.npmjs.com/package/mailparser2-mit)
[![npm](https://img.shields.io/npm/dw/mailparser2-mit)](https://www.npmjs.com/package/mailparser2-mit)
[![Known Vulnerabilities](https://snyk.io//test/github/poipoii/mailparser-mit/badge.svg?targetFile=package.json)](https://snyk.io//test/github/poipoii/mailparser-mit?targetFile=package.json)
[![Coverage Status](https://coveralls.io/repos/github/poipoii/mailparser-mit/badge.svg?branch=master)](https://coveralls.io/github/poipoii/mailparser-mit?branch=master)

**MailParser-MIT** is an asynchronous and non-blocking parser for
[node.js](http://nodejs.org) to parse mime encoded e-mail messages.
Handles even large attachments with ease - attachments can be parsed
in chunks and streamed if needed.

## Community version

This module is a fork of Andris Reinman's [MailParser](https://github.com/nodemailer/mailparser)
module, which recently switched licenses during a large update. I will continue to update and
maintain this fork and keep it MIT licensed.

For easier maintenance, I have also started to move some dependency code into this project from Andris's other projects.
So far I have incorporated code from the latest MIT-licensed versions of
[libmime](https://github.com/nodemailer/libmime) and [libpq](https://github.com/nodemailer/libqp).

Because I've accepted the part of me that wants to fix things that aren't broken, I plan to:
- Convert to TypeScript
- Separate into a cascade of Stream processors, for more flexibility
- Add support for RTF bodies, including RTF-encoded HTML
- Add more test cases, especially for exotic encodings
- Continue support for [iconv-lite](https://github.com/ashtuchkin/iconv-lite) and [iconv](https://github.com/bnoordhuis/node-iconv)

## Now accepting and test cases and pull requests!

Do you have emails that **MailParser-MIT** fails to process? Please open an issue and I will take a look. If the test emails are sensitive, you can email them to me at ross@mazira.com, and I will try to generate a simple MIT-licensed test case for inclusion in this repository.

## Overview

**MailParser-MIT** parses raw source of e-mail messages into a structured object.

No need to worry about charsets or decoding *quoted-printable* or
*base64* data, **MailParser-MIT** does all of it for you. All the textual output
from **MailParser-MIT** (subject line, addressee names, message body) is always UTF-8.

For a 25MB e-mail it takes less than a second to parse if attachments are not streamed but buffered and about 3-4 seconds if they are streamed. Expect high RAM usage though if you do not stream the attachments.

If you want to send e-mail instead of parsing it, check out my other module [Nodemailer](https://github.com/andris9/Nodemailer).

### ICONV NOTICE

Since v0.4 `node-iconv` is not included by default as a dependency. If you need to support encodings not covered by `iconv-lite` you should add `iconv` as a dependency to your own project so `mailparser-mit` could pick it up.

## Installation

    npm install mailparser2-mit

## Usage

Require MailParser module
```javascript
var MailParser = require("mailparser-mit").MailParser;
```
Create a new MailParser object
```javascript
var mailparser = new MailParser([options]);
```
Options parameter is an object with the following properties:

  * **debug** - if set to true print all incoming lines to console
  * **streamAttachments** - if set to true, stream attachments instead of including them
  * **unescapeSMTP** - if set to true replace double dots in the beginning of the file
  * **defaultCharset** - the default charset for *text/plain* and *text/html* content, if not set reverts to *Latin-1*
  * **showAttachmentLinks** - if set to true, show inlined attachment links `<a href="cid:...">filename</a>`

MailParser object is a writable Stream - you can pipe directly
files to it or you can send chunks with `mailparser.write`

When the headers have received, "headers" is emitted. The headers have not been pre-processed (except that mime words have been converted to UTF-8 text).

```javascript
mailparser.on("headers", function(headers){
    console.log(headers.received);
});
```
When the parsing ends an `'end'` event is emitted which has an
object with parsed e-mail structure as a parameter.

```javascript
mailparser.on("end", function(mail){
    mail; // object structure for parsed e-mail
});
```
### Parsed mail object

  * **headers** - unprocessed headers in the form of - `{key: value}` - if there were multiple fields with the same key then the value is an array
  * **from** - an array of parsed `From` addresses - `[{address:'sender@example.com',name:'Sender Name'}]` (should be only one though)
  * **to** - an array of parsed `To` addresses
  * **cc** - an array of parsed `Cc` addresses
  * **bcc** - an array of parsed 'Bcc' addresses
  * **subject** - the subject line
  * **references** - an array of reference message id values (not set if no reference values present)
  * **inReplyTo** - an array of In-Reply-To message id values (not set if no in-reply-to values present)
  * **priority** - priority of the e-mail, always one of the following: *normal* (default), *high*, *low*
  * **text** - text body
  * **html** - html body
  * **date** - date field as a `Date()` object. If date could not be resolved or is not found this field is not set. Check the original date string from `headers.date`
  * **attachments** - an array of attachments

### Decode a simple e-mail

This example decodes an e-mail from a string

```javascript
var MailParser = require("mailparser-mit").MailParser;
var mailparser = new MailParser();

var email = "From: 'Sender Name' <sender@example.com>\r\n"+
            "To: 'Receiver Name' <receiver@example.com>\r\n"+
            "Subject: Hello world!\r\n"+
            "\r\n"+
            "How are you today?";

// setup an event listener when the parsing finishes
mailparser.on("end", function(mail_object){
    console.log("From:", mail_object.from); //[{address:'sender@example.com',name:'Sender Name'}]
    console.log("Subject:", mail_object.subject); // Hello world!
    console.log("Text body:", mail_object.text); // How are you today?
});

// send the email source to the parser
mailparser.write(email);
mailparser.end();
```
### Pipe file to MailParser

This example pipes a `readableStream` file to **MailParser**
```javascript
var MailParser = require("mailparser").MailParser;
var mailparser = new MailParser();
var fs = require("fs");

mailparser.on("end", function(mail_object){
    console.log("Subject:", mail_object.subject);
});

fs.createReadStream("email.eml").pipe(mailparser);
```
### Attachments

By default any attachment found from the e-mail will be included fully in the
final mail structure object as Buffer objects. With large files this might not
be desirable so optionally it is possible to redirect the attachments to a Stream
and keep only the metadata about the file in the mail structure.

```javascript
mailparser.on("end", function(mail_object){
    mail_object.attachments.forEach(function(attachment){
        console.log(attachment.fileName);
    });
});
```
#### Default behavior

By default attachments will be included in the attachment objects as Buffers.
```javascript
attachments = [{
    contentType: 'image/png',
    fileName: 'image.png',
    contentDisposition: 'attachment',
    contentId: '5.1321281380971@localhost',
    transferEncoding: 'base64',
    length: 126,
    generatedFileName: 'image.png',
    checksum: 'e4cef4c6e26037bcf8166905207ea09b',
    content: <Buffer ...>
}];
```
The property `generatedFileName` is usually the same as `fileName` but if several
different attachments with the same name exist or there is no `fileName` set, an
unique name is generated.

Property `content` is always a Buffer object (or SlowBuffer on some occasions)

#### Attachment streaming

Attachment streaming can be used when providing an optional options parameter
to the `MailParser` constructor.
```javascript
var mp = new MailParser({
    streamAttachments: true
}
```
This way there will be no `content` property on final attachment objects
(but the other fields will remain).

To catch the streams you should listen for `attachment` events on the MailParser
object. The parameter provided includes file information (`contentType`,
`fileName`, `contentId`) and a readable Stream object `stream`.
```javascript
var mp = new MailParser({
    streamAttachments: true
}

mp.on("attachment", function(attachment, mail){
    var output = fs.createWriteStream(attachment.generatedFileName);
    attachment.stream.pipe(output);
});
```
`generatedFileName` is unique for the parsed mail - if several attachments with
the same name exist, `generatedFileName` is updated accordingly. Also there
might not be `fileName` parameter at all, so it is better to rely on
`generatedFileName`.

#### Testing attachment integrity

Attachment objects include `length` property which is the length of the attachment
in bytes and `checksum` property which is a `md5` hash of the file.

### Running tests

Install **MailParser-MIT** with dev dependencies
```bash
npm install --dev mailparser-mit
```
And then run
```bash
npm test mailparser-mit
```
There aren't many tests yet but basics should be covered.

## Issues

**S/MIME**

Currently it is not possible to verify signed content as the incoming text is
split to lines when parsing and line ending characters are not preserved. One
can assume it is always \r\n but this might not be always the case.

**Seeking**

Due to the line based parsing it is also not possible to explicitly state
the beginning and ending bytes of the attachments for later source seeking.
Node.js doesn't support the concept of seeking very well anyway.

## License

**MIT**
