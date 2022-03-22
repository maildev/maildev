"use strict";

var Stream = require('stream').Stream,
    utillib = require('util'),
    crypto = require('crypto'),
    uue = require('uue');

const charset = require('./charset');
const libqp = require('./libqp');

module.exports.Base64Stream = Base64Stream;
module.exports.QPStream = QPStream;
module.exports.BinaryStream = BinaryStream;
module.exports.UUEStream = UUEStream;

function Base64Stream() {
    Stream.call(this);
    this.writable = true;

    this.checksum = crypto.createHash("md5");
    this.length = 0;

    this.current = "";
}
utillib.inherits(Base64Stream, Stream);

Base64Stream.prototype.write = function(data) {
    this.handleInput(data);
    return true;
};

Base64Stream.prototype.end = function(data) {
    this.handleInput(data);
    this.emit("end");
    return {
        length: this.length,
        checksum: this.checksum.digest("hex")
    };
};

Base64Stream.prototype.handleInput = function(data) {
    if (!data || !data.length) {
        return;
    }

    data = (data || "").toString("utf-8");

    var remainder = 0;
    this.current += data.replace(/[^\w\+\/=]/g, '');
    var buffer = new Buffer.from(this.current.substr(0, this.current.length - this.current.length % 4), "base64");
    if (buffer.length) {
        this.length += buffer.length;
        this.checksum.update(buffer);
        this.emit("data", buffer);
    }
    this.current = (remainder = this.current.length % 4) ? this.current.substr(-remainder) : "";
};

function QPStream(charset) {
    Stream.call(this);
    this.writable = true;

    this.checksum = crypto.createHash("md5");
    this.length = 0;

    this.charset = charset || "UTF-8";
    this.current = undefined;
}
utillib.inherits(QPStream, Stream);

QPStream.prototype.write = function(data) {
    this.handleInput(data);
    return true;
};

QPStream.prototype.end = function(data) {
    this.handleInput(data);
    this.flush();
    this.emit("end");
    return {
        length: this.length,
        checksum: this.checksum.digest("hex")
    };
};

QPStream.prototype.handleInput = function(data) {
    if (!data || !data.length) {
        return;
    }

    data = (data || "").toString("utf-8");
    if (data.match(/^\r\n/)) {
        data = data.substr(2);
    }

    if (typeof this.current != "string") {
        this.current = data;
    } else {
        this.current += "\r\n" + data;
    }
};

QPStream.prototype.flush = function() {
    var buffer = libqp.decode(this.current);

    if (this.charset.toLowerCase() == "binary") {
        // do nothing
    } else if (this.charset.toLowerCase() != "utf-8") {
        buffer = charset.decode(buffer, this.charset);
    }

    this.length += buffer.length;
    this.checksum.update(buffer);

    this.emit("data", buffer);
};

function BinaryStream(charset) {
    Stream.call(this);
    this.writable = true;

    this.checksum = crypto.createHash("md5");
    this.length = 0;

    this.charset = charset || "UTF-8";
    this.current = "";
}
utillib.inherits(BinaryStream, Stream);

BinaryStream.prototype.write = function(data) {
    if (data && data.length) {
        this.length += data.length;
        this.checksum.update(data);
        this.emit("data", data);
    }
    return true;
};

BinaryStream.prototype.end = function(data) {
    if (data && data.length) {
        this.emit("data", data);
    }
    this.emit("end");
    return {
        length: this.length,
        checksum: this.checksum.digest("hex")
    };
};

// this is not a stream, it buffers data and decodes after end
function UUEStream(charset) {
    Stream.call(this);
    this.writable = true;

    this.checksum = crypto.createHash("md5");
    this.length = 0;
    this.buf = [];
    this.buflen = 0;

    this.charset = charset || "UTF-8";
    this.current = undefined;
}
utillib.inherits(UUEStream, Stream);

UUEStream.prototype.write = function(data) {
    this.buf.push(data);
    this.buflen += data.length;
    return true;
};

UUEStream.prototype.end = function(data) {
    if (data) {
        this.write(data);
    }

    this.flush();

    this.emit("end");
    return {
        length: this.length,
        checksum: this.checksum.digest("hex")
    };
};

UUEStream.prototype.flush = function() {
    var buffer = this.decode(Buffer.concat(this.buf, this.buflen));

    this.length += buffer.length;
    this.checksum.update(buffer);

    this.emit("data", buffer);
};

UUEStream.prototype.decode = function(buffer) {
    var filename;

    var re = /^begin [0-7]{3} (.*)/;
    filename = buffer.slice(0, Math.min(buffer.length, 1024)).toString().match(re) || '';
    if (!filename) {
        return new Buffer.alloc(0);
    }

    buffer = uue.decodeFile(buffer.toString('ascii').replace(/\r\n/g, '\n'), filename[1]);

    if (this.charset.toLowerCase() == "binary") {
        // do nothing
    } else if (this.charset.toLowerCase() != "utf-8") {
        buffer = charset.decode(buffer, this.charset);
    }

    return buffer;
};
