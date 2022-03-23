"use strict";

/**
 * @fileOverview This is the main file for the MailParser library to parse raw e-mail data
 * @author <a href="mailto:andris@node.ee">Andris Reinman</a>
 * @version 0.2.23
 */

var Stream = require("stream").Stream,
    utillib = require("util"),
    datetime = require("./datetime"),
    Streams = require("./streams"),
    crypto = require("crypto"),
    mime = require("mime");

const addressparser = require('addressparser');

const charset = require('./charset');
const libmime = require('./libmime');
const libqp = require('./libqp');

// Expose to the world
module.exports.MailParser = MailParser;

// MailParser is a FSM - it is always in one of the possible states
var STATES = {
    header: 0x1,
    body: 0x2,
    finished: 0x3
};


/**
 * Taken from mimelib
 */
const parseAddresses = function(addresses) {
    const parsed = addressparser(addresses);

    return parsed.map(function(address) {
        address.name = libmime.decodeWords(address.name);
        if (address.group) {
            address.group.forEach(function(groupAddress) {
                groupAddress.name = libmime.decodeWords(groupAddress.name);
            });
        }
        return address;
    });
};

/**
 * <p>Creates instance of MailParser which in turn extends Stream</p>
 *
 * <p>Options object has the following properties:</p>
 *
 * <ul>
 *   <li><b>debug</b> - if set to true print all incoming lines to decodeq</li>
 *   <li><b>streamAttachments</b> - if set to true, stream attachments instead of including them</li>
 *   <li><b>unescapeSMTP</b> - if set to true replace double dots in the beginning of the file</li>
 *   <li><b>defaultCharset</b> - the default charset for text/plain, text/html content, if not set reverts to Latin-1
 *   <li><b>showAttachmentLinks</b></li> - if set to true, show inlined attachment links
 * </ul>
 *
 * @constructor
 * @param {Object} [options] Optional options object
 */
function MailParser(options) {

    // Make MailParser a Stream object
    Stream.call(this);
    this.writable = true;

    /**
     * Options object
     * @public  */
    this.options = options || {};

    /**
     * Indicates current state the parser is in
     * @private */
    this._state = STATES.header;

    /**
     * The remaining data from the previos chunk which is waiting to be processed
     * @private */
    this._remainder = "";

    /**
     * The complete tree structure of the e-mail
     * @public  */
    this.mimeTree = this._createMimeNode();

    /**
     * Current node of the multipart mime tree that is being processed
     * @private */
    this._currentNode = this.mimeTree;

    // default values for the root node
    this._currentNode.priority = "normal";

    /**
     * An object of already used attachment filenames
     * @private */
    this._fileNames = {};

    /**
     * An array of multipart nodes
     * @private */
    this._multipartTree = [];


    /**
     * This is the final mail structure object that is returned to the client
     * @public  */
    this.mailData = {};

    /**
     * Line counter for debugging
     * @private */
    this._lineCounter = 0;

    /**
     * Did the last chunk end with \r
     * @private */
    this._lineFeed = false;

    /**
     * Is the "headers" event already emitted
     * @private */
    this._headersSent = false;

    /**
     * If the e-mail is in mbox format, unescape ">From " to "From " in body
     * @private */
    this._isMbox = -1;
}
// inherit methods and properties of Stream
utillib.inherits(MailParser, Stream);

/**
 * <p>Writes a value to the MailParser stream<p>
 *
 * @param {Buffer|String} chunk The data to be written to the MailParser stream
 * @param {String} [encoding] The encoding to be used when "chunk" is a string
 * @returns {Boolean} Returns true
 */
MailParser.prototype.write = function(chunk, encoding) {
    if (this._write(chunk, encoding)) {
        if (typeof setImmediate == "function") {
            setImmediate(this._process.bind(this));
        } else {
            process.nextTick(this._process.bind(this));
        }
    }
    return true;
};

/**
 * <p>Terminates the MailParser stream</p>
 *
 * <p>If "chunk" is set, writes it to the Stream before terminating.</p>
 *
 * @param {Buffer|String} chunk The data to be written to the MailParser stream
 * @param {String} [encoding] The encoding to be used when "chunk" is a string
 */
MailParser.prototype.end = function(chunk, encoding) {
    this._write(chunk, encoding);

    if (this.options.debug && this._remainder) {
        console.log("REMAINDER: " + this._remainder);
    }

    if (typeof setImmediate == "function") {
        setImmediate(this._process.bind(this, true));
    } else {
        process.nextTick(this._process.bind(this, true));
    }
};

/**
 * <p>Normalizes CRLF's before writing to the Mailparser stream, does <i>not</i> call `_process`<p>
 *
 * @param {Buffer|String} chunk The data to be written to the MailParser stream
 * @param {String} [encoding] The encoding to be used when "chunk" is a string
 * @returns {Boolean} Returns true if writing the chunk was successful
 */
MailParser.prototype._write = function(chunk, encoding) {
    if (typeof chunk == "string") {
        chunk = new Buffer.from(chunk, encoding);
    }

    chunk = chunk && chunk.toString("binary") || "";

    // if the last chunk ended with \r and this one begins
    // with \n, it's a split line ending. Since the last \r
    // was already used, skip the \n
    if (this._lineFeed && chunk.charAt(0) === "\n") {
        chunk = chunk.substr(1);
    }
    this._lineFeed = chunk.substr(-1) === "\r";

    if (chunk && chunk.length) {
        this._remainder += chunk;
        return true;
    }
    return false;
};


/**
 * <p>Processes the data written to the MailParser stream</p>
 *
 * <p>The data is split into lines and each line is processed individually. Last
 * line in the batch is preserved as a remainder since it is probably not a
 * complete line but just the beginning of it. The remainder is later prepended
 * to the next batch of data.</p>
 *
 * @param {Boolean} [finalPart=false] if set to true indicates that this is the last part of the stream
 */
MailParser.prototype._process = function(finalPart) {

    finalPart = !!finalPart;
    var lines = this._remainder.split(/\r?\n|\r/),
        line, i, len;

    if (!finalPart) {
        this._remainder = lines.pop();
        // force line to 1MB chunks if needed
        if (this._remainder.length > 1048576) {
            this._remainder = this._remainder.replace(/(.{1048576}(?!\r?\n|\r))/g, "$&\n");
        }
    }

    for (i = 0, len = lines.length; i < len; i++) {
        line = lines[i];

        if (this.options.unescapeSMTP && line.substr(0, 2) == "..") {
            line = line.substr(1);
        }

        if (this._isMbox === true && line.match(/^\>+From /)) {
            line = line.substr(1);
        }

        if (this.options.debug) {
            console.log("LINE " + (++this._lineCounter) + " (" + this._state + "): " + line);
        }

        if (this._state == STATES.header) {
            if (this._processStateHeader(line) === true) {
                continue;
            }
        }

        if (this._state == STATES.body) {
            if (this._processStateBody(line) === true) {
                continue;
            }
        }
    }
    if (finalPart) {
        if (this._state == STATES.header && this._remainder) {
            this._processStateHeader(this._remainder);
            if (!this._headersSent) {
                this.emit("headers", this._currentNode.parsedHeaders);
                this._headersSent = true;
            }
        }
        if (this._currentNode.content || this._currentNode.stream) {
            this._finalizeContents();
        }
        this._state = STATES.finished;
        if (typeof setImmediate == "function") {
            setImmediate(this._processMimeTree.bind(this));
        } else {
            process.nextTick(this._processMimeTree.bind(this));
        }
    }


};

/**
 * <p>Processes a line while in header state</p>
 *
 * <p>If header state ends and body starts, detect if the contents is an attachment
 * and create a stream for it if needed</p>
 *
 * @param {String} line The contents of a line to be processed
 * @returns {Boolean} If state changes to body retuns true
 */
MailParser.prototype._processStateHeader = function(line) {
    var attachment, lastPos = this._currentNode.headers.length - 1,
        textContent = false,
        rootNode,
        extension;

    // Check if the header ends and body starts
    if (!line.length) {
        if (lastPos >= 0) {
            this._processHeaderLine(lastPos);
        }
        if (!this._headersSent) {
            this.emit("headers", this._currentNode.parsedHeaders);
            this._headersSent = true;
        }

        this._state = STATES.body;

        // if there's unprocessed header data, do it now
        if (lastPos >= 0) {
            this._processHeaderLine(lastPos);
        }

        // this is a very simple e-mail, no content type set
        if (!this._currentNode.parentNode && !this._currentNode.meta.contentType) {
            this._currentNode.meta.contentType = "text/plain";
        }

        textContent = ["text/plain", "text/html", "text/calendar"].indexOf(this._currentNode.meta.contentType || "") >= 0;

        // detect if this is an attachment or a text node (some agents use inline dispositions for text)
        if (textContent && (!this._currentNode.meta.contentDisposition || this._currentNode.meta.contentDisposition == "inline")) {
            this._currentNode.attachment = false;
        } else if ((!textContent || ["attachment", "inline"].indexOf(this._currentNode.meta.contentDisposition) >= 0) &&
            !this._currentNode.meta.mimeMultipart) {
            this._currentNode.attachment = true;
        }

        // handle attachment start
        if (this._currentNode.attachment) {

            this._currentNode.meta.generatedFileName = this._generateFileName(this._currentNode.meta.fileName, this._currentNode.meta.contentType);

            this._currentNode.meta.contentId = this._currentNode.meta.contentId ||
                crypto.createHash("md5").update(new Buffer.from(this._currentNode.meta.generatedFileName, 'utf-8')).digest("hex") + "@mailparser";

            extension = this._currentNode.meta.generatedFileName.split(".").pop().toLowerCase();

            // Update content-type if it's an application/octet-stream and file extension is available
            if (this._currentNode.meta.contentType == "application/octet-stream" && mime.getType(extension)) {
                this._currentNode.meta.contentType = mime.getType(extension);
            }

            attachment = this._currentNode.meta;
            if (this.options.streamAttachments) {
                if (this._currentNode.meta.transferEncoding == "base64") {
                    this._currentNode.stream = new Streams.Base64Stream();
                } else if (this._currentNode.meta.transferEncoding == "quoted-printable") {
                    this._currentNode.stream = new Streams.QPStream("binary");
                } else if (this._currentNode.meta.transferEncoding == "uuencode") {
                    this._currentNode.stream = new Streams.UUEStream("binary");
                } else {
                    this._currentNode.stream = new Streams.BinaryStream();
                }
                attachment.stream = this._currentNode.stream;
                
                rootNode = this._currentNode;
                
                while (rootNode.parentNode) {
                    rootNode = rootNode.parentNode;
                }

                this.emit("attachment", attachment, rootNode);
            } else {
                this._currentNode.content = undefined;
            }
        }

        return true;
    }

    // unfold header lines if needed
    if (line.match(/^\s+/) && lastPos >= 0) {
        this._currentNode.headers[lastPos] += " " + line.trim();
    } else {
        this._currentNode.headers.push(line.trim());
        if (lastPos >= 0) {
            // if a complete header line is received, process it
            this._processHeaderLine(lastPos);
        }
    }

    return false;
};

/**
 * <p>Processes a line while in body state</p>
 *
 * @param {String} line The contents of a line to be processed
 * @returns {Boolean} If body ends return true
 */
MailParser.prototype._processStateBody = function(line) {
    var i, len, node,
        nodeReady = false;

    // Handle multipart boundaries
    if (line.substr(0, 2) == "--") {
        for (i = 0, len = this._multipartTree.length; i < len; i++) {

            // check if a new element block starts
            if (line == "--" + this._multipartTree[i].boundary) {

                if (this._currentNode.content || this._currentNode.stream) {
                    this._finalizeContents();
                }

                node = this._createMimeNode(this._multipartTree[i].node);
                this._multipartTree[i].node.childNodes.push(node);
                this._currentNode = node;
                this._state = STATES.header;
                nodeReady = true;
                break;
            } else
            // check if a multipart block ends
            if (line == "--" + this._multipartTree[i].boundary + "--") {

                if (this._currentNode.content || this._currentNode.stream) {
                    this._finalizeContents();
                }

                if (this._multipartTree[i].node.parentNode) {
                    this._currentNode = this._multipartTree[i].node.parentNode;
                } else {
                    this._currentNode = this._multipartTree[i].node;
                }
                this._state = STATES.body;
                nodeReady = true;
                break;
            }
        }
    }
    if (nodeReady) {
        return true;
    }

    // handle text or attachment line
    if (["text/plain", "text/html", "text/calendar"].indexOf(this._currentNode.meta.contentType || "") >= 0 &&
        !this._currentNode.attachment) {
        this._handleTextLine(line);
    } else if (this._currentNode.attachment) {
        this._handleAttachmentLine(line);
    }

    return false;
};

/**
 * <p>Processes a complete unfolded header line</p>
 *
 * <p>Processes a line from current node headers array and replaces its value.
 * Input string is in the form of "X-Mailer: PHP" and its replacement would be
 * an object <code>{key: "x-mailer", value: "PHP"}</code></p>
 *
 * <p>Additionally node meta object will be filled also, for example with data from
 * To: From: Cc: etc fields.</p>
 *
 * @param {Number} pos Which header element (from an header lines array) should be processed
 */
MailParser.prototype._processHeaderLine = function(pos) {
    var key, value, parts, line;

    pos = pos || 0;

    if (!(line = this._currentNode.headers[pos]) || typeof line != "string") {
        return;
    }

    if (!this._headersSent && this._isMbox < 0) {
        if ((this._isMbox = !!line.match(/^From /))) {
            return;
        }
    }

    parts = line.split(":");

    key = parts.shift().toLowerCase().trim();
    value = parts.join(":").trim();

    switch (key) {
        case "content-type":
            this._parseContentType(value);
            break;
        case "mime-version":
            this._currentNode.useMIME = true;
            break;
        case "date":
            this._currentNode.meta.date = this._parseDateString(value);
            break;
        case "received":
        case "x-received":
            this._parseReceived(value);
            break;
        case "to":
            if (this._currentNode.to && this._currentNode.to.length) {
                this._currentNode.to = this._currentNode.to.concat(parseAddresses(value));
            } else {
                this._currentNode.to = parseAddresses(value);
            }
            break;
        case "from":
            if (this._currentNode.from && this._currentNode.from.length) {
                this._currentNode.from = this._currentNode.from.concat(parseAddresses(value));
            } else {
                this._currentNode.from = parseAddresses(value);
            }
            break;
        case "reply-to":
            if (this._currentNode.replyTo && this._currentNode.replyTo.length) {
                this._currentNode.replyTo = this._currentNode.replyTo.concat(parseAddresses(value));
            } else {
                this._currentNode.replyTo = parseAddresses(value);
            }
            break;
        case "cc":
            if (this._currentNode.cc && this._currentNode.cc.length) {
                this._currentNode.cc = this._currentNode.cc.concat(parseAddresses(value));
            } else {
                this._currentNode.cc = parseAddresses(value);
            }
            break;
        case "bcc":
            if (this._currentNode.bcc && this._currentNode.bcc.length) {
                this._currentNode.bcc = this._currentNode.bcc.concat(parseAddresses(value));
            } else {
                this._currentNode.bcc = parseAddresses(value);
            }
            break;
        case "x-priority":
        case "x-msmail-priority":
        case "importance":
            value = this._parsePriority(value);
            this._currentNode.priority = value;
            break;
        case "message-id":
            this._currentNode.meta.messageId = this._trimQuotes(value);
            this._currentNode.messageId = this._currentNode.meta.messageId;
            break;
        case "references":
            this._parseReferences(value);
            break;
        case "in-reply-to":
            this._parseInReplyTo(value);
            break;
        case "thread-index":
            this._currentNode.meta.threadIndex = value;
            break;
        case "content-transfer-encoding":
            this._currentNode.meta.transferEncoding = value.toLowerCase();
            break;
        case "content-location":
            this._currentNode.meta.location = value.toLowerCase();
            break;
        case "subject":
            this._currentNode.subject = this._encodeString(value);
            break;
        case "content-disposition":
            this._parseContentDisposition(value);
            break;
        case "content-id":
            this._currentNode.meta.contentId = this._trimQuotes(value);
            break;
    }

    if (this._currentNode.parsedHeaders[key]) {
        if (!Array.isArray(this._currentNode.parsedHeaders[key])) {
            this._currentNode.parsedHeaders[key] = [this._currentNode.parsedHeaders[key]];
        }
        this._currentNode.parsedHeaders[key].push(this._replaceMimeWords(value));
    } else {
        this._currentNode.parsedHeaders[key] = this._replaceMimeWords(value);
    }

    this._currentNode.headers[pos] = {
        key: key,
        value: value
    };
};

/**
 * <p>Creates an empty node element for the mime tree</p>
 *
 * <p>Created element includes parentNode property and a childNodes array. This is
 * needed to later walk the whole mime tree</p>
 *
 * @param {Object} [parentNode] the parent object for the created node
 * @returns {Object} node element for the mime tree
 */
MailParser.prototype._createMimeNode = function(parentNode) {
    var node = {
        parentNode: parentNode || this._currentNode || null,
        headers: [],
        parsedHeaders: {},
        meta: {},
        childNodes: []
    };

    return node;
};

/**
 * <p>Parses date string</o>
 *
 * <p>Receives possible date string in different formats and
 * transforms it into a JS Date object</p>
 *
 * @param {String} value possible date string
 * @returns {Date|Boolean} date object
 */
MailParser.prototype._parseDateString = function(value) {
    var date;

    date = new Date(value);
    if (Object.prototype.toString.call(date) != "[object Date]" || date.toString() == "Invalid Date") {
        try {
            date = datetime.strtotime(value);
        } catch (E) {
            return false;
        }
        if (date) {
            date = new Date(date * 1000);
        } else {
            return false;
        }
    }

    return date;
};

/**
 * <p>Parses Received and X-Received header field value</p>
 *
 * <p>Pulls received date from the received and x-received header fields and
 * update current node meta object with this date as long as it's later as the
 * existing date of the meta object</p>
 *
 * <p>Example: <code>by 10.25.25.72 with SMTP id 69csp2404548lfz; Fri, 6 Feb 2015 15:15:32 -0800 (PST)</code>
 * will become:
 * </p>
 *
 * <pre>new Date('2015-02-06T23:15:32.000Z')</pre>
 *
 * @param {String} value Received string
 * @returns {Date|Boolean} parsed received date
 */
MailParser.prototype._parseReceived = function(value) {
    var receivedDate, date, splitString;
    if (!value) {
        return false;
    }

    splitString = value.split(';');
    value = splitString[splitString.length - 1];

    date = this._parseDateString(value);
    receivedDate = this._currentNode.meta.receivedDate;

    if (!date) {
        if (!receivedDate) {
            this._currentNode.meta.receivedDate = date;
        }
        return date;
    }

    if (!receivedDate) {
        this._currentNode.meta.receivedDate = date;
    } else if (date > receivedDate) {
        this._currentNode.meta.receivedDate = date;
    }

    return date;
};

/**
 * <p>Parses a Content-Type header field value</p>
 *
 * <p>Fetches additional properties from the content type (charset etc.) and fills
 * current node meta object with this data</p>
 *
 * @param {String} value Content-Type string
 * @returns {Object} parsed contenttype object
 */
MailParser.prototype._parseContentType = function(headerValue) {
    const parsed = libmime.parseHeaderValue(headerValue);

    if (parsed.value) {
        parsed.value = parsed.value.toLowerCase();
        this._currentNode.meta.contentType = parsed.value;
        if (parsed.value.substr(0, "multipart/".length) == "multipart/") {
            this._currentNode.meta.mimeMultipart = parsed.value.substr("multipart/".length);
        }
    } else {
        this._currentNode.meta.contentType = "application/octet-stream";
    }

    const params = parsed.params;

    if (params.charset) {
        params.charset = params.charset.toLowerCase();
        if (params.charset.substr(0, 4) == "win-") {
            params.charset = "windows-" + params.charset.substr(4);
        } else if (params.charset == "ks_c_5601-1987") {
            params.charset = "cp949";
        } else if (params.charset.match(/^utf\d/)) {
            params.charset = "utf-" + params.charset.substr(3);
        } else if (params.charset.match(/^latin[\-_]?\d/)) {
            params.charset = "iso-8859-" + params.charset.replace(/\D/g, "");
        } else if (params.charset.match(/^(us\-)?ascii$/)) {
            params.charset = "utf-8";
        } else if (params.charset.match(/^ansi_x3\.4\-19/)) {
            // ANSI_X3.4-1968 and ANSI_X3.4-1986 are aliases for ASCII.
            // See http://en.wikipedia.org/wiki/ASCII#Aliases
            params.charset = "utf-8";
        }
        this._currentNode.meta.charset = params.charset;
    }

    if (params.format) {
        this._currentNode.meta.textFormat = params.format.toLowerCase();
    }

    if (params.delsp) {
        this._currentNode.meta.textDelSp = params.delsp.toLowerCase();
    }

    if (params.boundary) {
        this._currentNode.meta.mimeBoundary = params.boundary;
    }

    if (params.method) {
        this._currentNode.meta.method = params.method;
    }

    let fileName;
    if (!this._currentNode.meta.fileName && (fileName = this._detectFilename(params))) {
        this._currentNode.meta.fileName = fileName;
    }

    if (params.boundary) {
        this._currentNode.meta.mimeBoundary = params.boundary;
        this._multipartTree.push({
            boundary: params.boundary,
            node: this._currentNode
        });
    }
};

/**
 * <p>Parses file name from a Content-Type or Content-Disposition field</p>
 *
 * <p>Supports <a href="http://tools.ietf.org/html/rfc2231">RFC2231</a> for
 * folded filenames</p>
 *
 * @param {Object} value Parsed Content-(Type|Disposition) object
 * @return {String} filename
 */
MailParser.prototype._detectFilename = function(params) {
    if (params.name) {
        return this._replaceMimeWords(params.name);
    }

    if (params.filename) {
        return this._replaceMimeWords(params.filename);
    }

    return "";
};

/**
 * <p>Parses Content-Disposition header field value</p>
 *
 * <p>Fetches filename to current node meta object</p>
 *
 * @param {String} value A Content-Disposition header field
 */
MailParser.prototype._parseContentDisposition = function(value) {
    const parsed = libmime.parseHeaderValue(value);

    if (parsed.value) {
        this._currentNode.meta.contentDisposition = parsed.value.trim().toLowerCase();
    }

    let fileName;
    if ((fileName = this._detectFilename(parsed.params))) {
        this._currentNode.meta.fileName = fileName;
    }
};

/**
 * <p>Parses "References" header</p>
 *
 * @param {String} value References header field
 */
MailParser.prototype._parseReferences = function(value) {
    this._currentNode.references = (this._currentNode.references || []).concat(
        (value || "").toString().trim().split(/\s+/).map(this._trimQuotes.bind(this))
    );
};

/**
 * <p>Parses "In-Reply-To" header</p>
 *
 * @param {String} value In-Reply-To header field
 */
MailParser.prototype._parseInReplyTo = function(value) {
    this._currentNode.inReplyTo = (this._currentNode.inReplyTo || []).concat(
        (value || "").toString().trim().split(/\s+/).map(this._trimQuotes.bind(this))
    );
};

/**
 * <p>Parses the priority of the e-mail</p>
 *
 * @param {String} value The priority value
 * @returns {String} priority string low|normal|high
 */
MailParser.prototype._parsePriority = function(value) {
    value = value.toLowerCase().trim();
    if (!isNaN(parseInt(value, 10))) { // support "X-Priority: 1 (Highest)"
        value = parseInt(value, 10) || 0;
        if (value == 3) {
            return "normal";
        } else if (value > 3) {
            return "low";
        } else {
            return "high";
        }
    } else {
        switch (value) {
            case "non-urgent":
            case "low":
                return "low";
            case "urgent":
            case "high":
                return "high";
        }
    }
    return "normal";
};

/**
 * <p>Processes a line in text/html or text/plain node</p>
 *
 * <p>Append the line to the content property</p>
 *
 * @param {String} line A line to be processed
 */
MailParser.prototype._handleTextLine = function(line) {

    if (["quoted-printable", "base64"].indexOf(this._currentNode.meta.transferEncoding) >= 0 || this._currentNode.meta.textFormat != "flowed") {
        if (typeof this._currentNode.content != "string") {
            this._currentNode.content = line;
        } else {
            this._currentNode.content += "\n" + line;
        }
    } else {
        if (typeof this._currentNode.content != "string") {
            this._currentNode.content = line;
        } else if (this._currentNode.content.match(/[ ]$/)) {
            if (this._currentNode.meta.textFormat == "flowed" && this._currentNode.content.match(/(^|\n)-- $/)) {
                // handle special case for usenet signatures
                this._currentNode.content += "\n" + line;
            } else {
                if (this._currentNode.meta.textDelSp == "yes") {
                    this._currentNode.content = this._currentNode.content.replace(/[ ]+$/, "");
                }
                this._currentNode.content += line;
            }
        } else {
            this._currentNode.content += "\n" + line;
        }
    }
};

/**
 * <p>Processes a line in an attachment node</p>
 *
 * <p>If a stream is set up for the attachment write the line to the
 * stream as a Buffer object, otherwise append it to the content property</p>
 *
 * @param {String} line A line to be processed
 */
MailParser.prototype._handleAttachmentLine = function(line) {
    if (!this._currentNode.attachment) {
        return;
    }
    if (this._currentNode.stream) {
        if (!this._currentNode.streamStarted) {
            this._currentNode.streamStarted = true;
            this._currentNode.stream.write(new Buffer.from(line, "binary"));
        } else {
            this._currentNode.stream.write(new Buffer.from("\r\n" + line, "binary"));
        }
    } else if ("content" in this._currentNode) {
        if (typeof this._currentNode.content != "string") {
            this._currentNode.content = line;
        } else {
            this._currentNode.content += "\r\n" + line;
        }
    }
};

/**
 * <p>Finalizes a node processing</p>
 *
 * <p>If the node is a text/plain or text/html, convert it to UTF-8 encoded string
 * If it is an attachment, convert it to a Buffer or if an attachment stream is
 * set up, close the stream</p>
 */
MailParser.prototype._finalizeContents = function() {
    var streamInfo;

    if (this._currentNode.content) {

        if (!this._currentNode.attachment) {

            if (this._currentNode.meta.contentType == "text/html" && !this._currentNode.meta.charset) {
                this._currentNode.meta.charset = this._detectHTMLCharset(this._currentNode.content) || this.options.defaultCharset || "iso-8859-1";
            }

            if (this._currentNode.meta.transferEncoding == "quoted-printable") {
                const temp = libqp.decode(this._currentNode.content);
                this._currentNode.content = this._convertStringToUTF8(temp);

                if (this._currentNode.meta.textFormat == "flowed") {
                    if (this._currentNode.meta.textDelSp == "yes") {
                        this._currentNode.content = this._currentNode.content.replace(/(^|\n)-- \n/g, '$1-- \u0000').replace(/ \n/g, '').replace(/(^|\n)-- \u0000/g, '$1-- \n');
                    } else {
                        this._currentNode.content = this._currentNode.content.replace(/(^|\n)-- \n/g, '$1-- \u0000').replace(/ \n/g, ' ').replace(/(^|\n)-- \u0000/g, '$1-- \n');
                    }
                }
            } else if (this._currentNode.meta.transferEncoding == "base64") {
                const temp = new Buffer.from(this._currentNode.content.toString().replace(/\s+/g, ""), "base64");
                this._currentNode.content = this._convertStringToUTF8(temp);
            } else {
                this._currentNode.content = this._convertStringToUTF8(this._currentNode.content);
            }
        } else {
            if (this._currentNode.meta.transferEncoding == "quoted-printable") {
                this._currentNode.content = libqp.decode(this._currentNode.content);
            } else if (this._currentNode.meta.transferEncoding == "base64") {

                // WTF? if newlines are not removed, the resulting hash is *always* different
                this._currentNode.content = new Buffer.from(this._currentNode.content.toString().replace(/\s+/g, ""), "base64");

            } else if (this._currentNode.meta.transferEncoding == "uuencode") {
                var uuestream = new Streams.UUEStream("binary");
                this._currentNode.content = uuestream.decode(new Buffer.from(this._currentNode.content, "binary"));
            } else {
                this._currentNode.content = new Buffer.from(this._currentNode.content, "binary");
            }
            this._currentNode.checksum = crypto.createHash("md5");
            this._currentNode.checksum.update(this._currentNode.content);
            this._currentNode.meta.checksum = this._currentNode.checksum.digest("hex");
            this._currentNode.meta.length = this._currentNode.content.length;
        }

    }

    if (this._currentNode.stream) {
        streamInfo = this._currentNode.stream.end() || {};
        if (streamInfo.checksum) {
            this._currentNode.meta.checksum = streamInfo.checksum;
        }
        if (streamInfo.length) {
            this._currentNode.meta.length = streamInfo.length;
        }
    }
};

/**
 * <p>Processes the mime tree</p>
 *
 * <p>Finds text parts and attachments from the tree. If there's several text/plain
 * or text/html parts, join these into one</p>
 *
 * <p>Emits "end" when finished</p>
 */
MailParser.prototype._processMimeTree = function() {
    var returnValue = {},
        i, len;

    this.mailData = {
        html: [],
        text: [],
        calendar: [],
        attachments: []
    };

    if (!this.mimeTree.meta.mimeMultipart) {
        this._processMimeNode(this.mimeTree, 0);
    } else {
        this._walkMimeTree(this.mimeTree);
    }

    if (this.mailData.html.length) {
        for (i = 0, len = this.mailData.html.length; i < len; i++) {
            if (!returnValue.html && this.mailData.html[i].content) {
                returnValue.html = this.mailData.html[i].content;
            } else if (this.mailData.html[i].content) {
                returnValue.html = this._concatHTML(returnValue.html, this.mailData.html[i].content);
            }
        }
    }

    if (this.mailData.text.length) {
      var len = this.mailData.text.length;
      // if we have both html and text, process text till the length of html assuming its alternative for html
      if (this.mailData.html.length) {
        len = Math.min(len, this.mailData.html.length);
      }
      for (i = 0, len; i < len; i++) {
        if (!returnValue.text && this.mailData.text[i].content) {
          returnValue.text = this.mailData.text[i].content;
        } else if (this.mailData.text[i].content) {
          returnValue.text += this.mailData.text[i].content;
        }
      }
      // all remaining text contents if present assumed as additional content and concatenated with html as well as text
      for (len = this.mailData.text.length; i < len; i++) {
        if (this.mailData.text[i].content) {
          // concatenate to both text and html so that text and html are always same content
          // user should be able to chose any one of them
          returnValue.text += this.mailData.text[i].content;
          returnValue.html += this.mailData.text[i].content;
        }
      }
    }

    if (this.mailData.calendar.length) {
        returnValue.alternatives = [];
        for (i = 0, len = this.mailData.calendar.length; i < len; i++) {
            returnValue.alternatives.push(this.mailData.calendar[i].content);
        }
    }

    returnValue.headers = this.mimeTree.parsedHeaders;

    if (this.mimeTree.subject) {
        returnValue.subject = this.mimeTree.subject;
    }

    if (this.mimeTree.references) {
        returnValue.references = this.mimeTree.references;
    }

    if (this.mimeTree.messageId) {
        returnValue.messageId = this.mimeTree.messageId;
    }

    if (this.mimeTree.inReplyTo) {
        returnValue.inReplyTo = this.mimeTree.inReplyTo;
    }

    if (this.mimeTree.priority) {
        returnValue.priority = this.mimeTree.priority;
    }

    if (this.mimeTree.from) {
        returnValue.from = this.mimeTree.from;
    }

    if (this.mimeTree.replyTo) {
        returnValue.replyTo = this.mimeTree.replyTo;
    }

    if (this.mimeTree.to) {
        returnValue.to = this.mimeTree.to;
    }

    if (this.mimeTree.cc) {
        returnValue.cc = this.mimeTree.cc;
    }

    if (this.mimeTree.bcc) {
        returnValue.bcc = this.mimeTree.bcc;
    }

    if (this.mimeTree.meta.date) {
        returnValue.date = this.mimeTree.meta.date;
    }

    if (this.mimeTree.meta.receivedDate) {
        returnValue.receivedDate = this.mimeTree.meta.receivedDate;
    }

    if (this.mailData.attachments.length) {
        returnValue.attachments = [];
        for (i = 0, len = this.mailData.attachments.length; i < len; i++) {
            returnValue.attachments.push(this.mailData.attachments[i].content);
        }
    }

    if (typeof setImmediate == "function") {
        setImmediate(this.emit.bind(this, "end", returnValue));
    } else {
        process.nextTick(this.emit.bind(this, "end", returnValue));
    }
};

/**
 * <p>Walks the mime tree and runs processMimeNode on each node of the tree</p>
 *
 * @param {Object} node A mime tree node
 * @param {Number} [level=0] current depth
 */
MailParser.prototype._walkMimeTree = function(node, level) {
    level = level || 1;
    for (var i = 0, len = node.childNodes.length; i < len; i++) {
        this._processMimeNode(node.childNodes[i], level, node.meta.mimeMultipart);
        this._walkMimeTree(node.childNodes[i], level + 1);
    }
};

/**
 * <p>Processes of a node in the mime tree</p>
 *
 * <p>Pushes the node into appropriate <code>this.mailData</code> array (<code>text/html</code> to <code>this.mailData.html</code> array etc)</p>
 *
 * @param {Object} node A mime tree node
 * @param {Number} [level=0] current depth
 * @param {String} mimeMultipart Type of multipart we are dealing with (if any)
 */
MailParser.prototype._processMimeNode = function(node, level, mimeMultipart) {
    var i, len;

    level = level || 0;

    if (!node.attachment) {
        switch (node.meta.contentType) {
            case "text/html":
                if (mimeMultipart == "mixed" && this.mailData.html.length) {
                    for (i = 0, len = this.mailData.html.length; i < len; i++) {
                        if (this.mailData.html[i].level == level) {
                            this._joinHTMLNodes(this.mailData.html[i], node.content);
                            return;
                        }
                    }
                }
                this.mailData.html.push({
                    content: this._updateHTMLCharset(node.content || ""),
                    level: level
                });
                return;
            case "text/plain":
                this.mailData.text.push({
                    content: node.content || "",
                    level: level
                });
                return;
            case "text/calendar":
                if (node.content) {
                    node.meta.content = node.content;
                }
                this.mailData.calendar.push({
                    content: node.meta || {},
                    level: level
                });
                return;
        }
    } else {
        node.meta = node.meta || {};
        if (node.content) {
            node.meta.content = node.content;
        }
        this.mailData.attachments.push({
            content: node.meta || {},
            level: level
        });

        if (this.options.showAttachmentLinks && mimeMultipart == "mixed" && this.mailData.html.length) {
            for (i = 0, len = this.mailData.html.length; i < len; i++) {
                if (this.mailData.html[i].level == level) {
                    this._joinHTMLAttachment(this.mailData.html[i], node.meta);
                    return;
                }
            }
        }
    }
};

/**
 * <p>Joins two HTML blocks by removing the header of the added element<p>
 *
 * @param {Object} htmlNode Original HTML contents node object
 * @param {String} newHTML HTML text to add to the original object node
 */
MailParser.prototype._joinHTMLNodes = function(htmlNode, newHTML) {
    var inserted = false;

    // process new HTML
    newHTML = (newHTML || "").toString("utf-8").trim();

    // remove doctype from the beginning
    newHTML = newHTML.replace(/^\s*<\!doctype( [^>]*)?>/gi, "");

    // remove <head> and <html> blocks
    newHTML = newHTML.replace(/<head( [^>]*)?>(.*)<\/head( [^>]*)?>/gi, "").
    replace(/<\/?html( [^>]*)?>/gi, "").
    trim();

    // keep only text between <body> tags (if <body exists)
    newHTML.replace(/<body(?: [^>]*)?>(.*)<\/body( [^>]*)?>/gi, function(match, body) {
        newHTML = body.trim();
    });

    htmlNode.content = (htmlNode.content || "").toString("utf-8").trim();

    htmlNode.content = htmlNode.content.replace(/<\/body( [^>]*)?>/i, function(match) {
        inserted = true;
        return "<br/>\n" + newHTML + match;
    });

    if (!inserted) {
        htmlNode.content += "<br/>\n" + newHTML;
    }
};

/**
 * <p>Adds filename placeholder to the HTML if needed</p>
 *
 * @param {Object} htmlNode Original HTML contents node object
 * @param {String} attachment Attachment meta object
 */
MailParser.prototype._joinHTMLAttachment = function(htmlNode, attachment) {
    var inserted = false,
        fname = attachment.generatedFileName.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
        newHTML;

    newHTML = "\n<div class=\"mailparser-attachment\"><a href=\"cid:" + attachment.contentId + "\">&lt;" + fname + "&gt;</a></div>";

    htmlNode.content = (htmlNode.content || "").toString("utf-8").trim();

    htmlNode.content = htmlNode.content.replace(/<\/body\b[^>]*>/i, function(match) {
        inserted = true;
        return "<br/>\n" + newHTML + match;
    });

    if (!inserted) {
        htmlNode.content += "<br/>\n" + newHTML;
    }
};

/**
 * <p>Joins two HTML blocks by removing the header of the added element<p>
 *
 * @param {Sting} htmlNode Original HTML contents
 * @param {String} newHTML HTML text to add to the original object node
 * @return {String} Joined HTML
 */
MailParser.prototype._concatHTML = function(firstNode, secondNode) {
    var headerNode = "",
        htmlHeader = "";

    firstNode = (firstNode || "").toString("utf-8");
    secondNode = (secondNode || "").toString("utf-8");

    if (!secondNode) {
        return firstNode;
    }
    if (!firstNode) {
        return secondNode;
    }

    if (firstNode.substr(0, 1024).replace(/\r?\n/g, "\u0000").match(/^[\s\u0000]*(<\!doctype\b[^>]*?>)?[\s\u0000]*<(html|head)\b[^>]*?>/i)) {
        headerNode = firstNode;
    } else if (secondNode.substr(0, 1024).replace(/\r?\n/g, "\u0000").match(/^[\s\u0000]*(<\!doctype\b[^>]*?>)?[\s\u0000]*<(html|head)\b[^>]*?>/i)) {
        headerNode = secondNode;
    }

    if (headerNode) {
        headerNode.replace(/\r?\n/g, "\u0000").replace(/^[\s\u0000]*(<\!doctype\b[^>]*?>)?[\s\u0000]*<(html|head)\b[^>]*>.*?<\/(head)\b[^>]*>(.*?<body\b[^>]*>)?/i, function(h) {
            var doctype = h.match(/^[\s\u0000]*(<\!doctype\b[^>]*?>)/i),
                html = h.match(/<html\b[^>]*?>/i),
                head = h.match(/<head\b[^>]*?>/i),
                body = h.match(/<body\b[^>]*?>/i);

            doctype = doctype && doctype[1] && doctype[1] + "\n" || "";
            html = html && html[0] || "<head>";
            head = head && head[0] || "<head>";
            body = body && body[0] || "<body>";
            h = h.replace(/<[\!\/]?(doctype|html|head|body)\b[^>]*?>/ig, "\u0000").replace(/\u0000+/g, "\n").trim();

            htmlHeader = doctype + html + "\n" + head + (h ? h + "\n" : "") + "</head>\n" + body + "\n";
        });
    }

    firstNode = firstNode.replace(/\r?\n/g, "\u0000").
    replace(/[\s\u0000]*<head\b[^>]*>.*?<\/(head|body)\b[^>]*>/gi, "").
    replace(/[\s\u0000]*<[\!\/]?(doctype|html|body)\b[^>]*>[\s\u0000]*/gi, "").
    replace(/\u0000/g, "\n");

    secondNode = secondNode.replace(/\r?\n/g, "\u0000").
    replace(/[\s\u0000]*<head\b[^>]*>.*?<\/(head|body)\b[^>]*>/gi, "").
    replace(/[\s\u0000]*<[\!\/]?(doctype|html|body)\b[^>]*>[\s\u0000]*/gi, "").
    replace(/\u0000/g, "\n");

    return htmlHeader + firstNode + secondNode + (htmlHeader ? (firstNode || secondNode ? "\n" : "") + "</body>\n</html>" : "");
};

/**
 * <p>Converts a string to UTF-8</p>
 *
 * @param {String} value String to be encoded
 * @returns {String} UTF-8 encoded string
 */
MailParser.prototype._convertStringToUTF8 = function(value) {
    value = typeof value == 'string' ? Buffer.from(value, 'binary') : value;
    const from = this._currentNode.meta.charset || this.options.defaultCharset || 'iso-8859-1';
    const output = charset.decode(value, from);
    return output;
};

/**
 * <p>Encodes a header string to UTF-8</p>
 *
 * @param {String} value String to be encoded
 * @returns {String} UTF-8 encoded string
 */
MailParser.prototype._encodeString = function(value) {
    value = this._replaceMimeWords(this._convertStringToUTF8(value));
    return value;
};

/**
 * <p>Replaces mime words in a string with UTF-8 encoded strings</p>
 *
 * @param {String} value String to be converted
 * @returns {String} converted string
 */
MailParser.prototype._replaceMimeWords = function(value) {
    return value.
    replace(/(=\?[^?]+\?[QqBb]\?[^?]*\?=)\s+(?==\?[^?]+\?[QqBb]\?[^?]*\?=)/g, "$1"). // join mimeWords
    replace(/\=\?[^?]+\?[QqBb]\?[^?]*\?=/g, (function(a) {
        return libmime.decodeWord(a.replace(/\s/g, ''));
    }).bind(this));
};

/**
 * <p>Removes enclosing quotes ("", '', &lt;&gt;) from a string</p>
 *
 * @param {String} value String to be converted
 * @returns {String} converted string
 */
MailParser.prototype._trimQuotes = function(value) {
    value = (value || "").trim();
    if ((value.charAt(0) == '"' && value.charAt(value.length - 1) == '"') ||
        (value.charAt(0) == "'" && value.charAt(value.length - 1) == "'") ||
        (value.charAt(0) == "<" && value.charAt(value.length - 1) == ">")) {
        value = value.substr(1, value.length - 2);
    }
    return value;
};

/**
 * <p>Generates a context unique filename for an attachment</p>
 *
 * <p>If a filename already exists, append a number to it</p>
 *
 * <ul>
 *     <li>file.txt</li>
 *     <li>file-1.txt</li>
 *     <li>file-2.txt</li>
 * </ul>
 *
 * @param {String} fileName source filename
 * @param {String} contentType source content type
 * @returns {String} generated filename
 */
MailParser.prototype._generateFileName = function(fileName, contentType) {
    var ext, defaultExt = "",
        fileRootName;

    if (contentType) {
        defaultExt = mime.getExtension(contentType);
        defaultExt = defaultExt ? "." + defaultExt : "";
    }

    fileName = fileName || "attachment" + defaultExt;

    // remove path if it is included in the filename
    fileName = fileName.toString().split(/[\/\\]+/).pop().replace(/^\.+/, "") || "attachment";
    fileRootName = fileName.replace(/(?:\-\d+)+(\.[^.]*)$/, "$1") || "attachment";

    if (fileRootName in this._fileNames) {
        this._fileNames[fileRootName]++;
        ext = fileName.substr((fileName.lastIndexOf(".") || 0) + 1);
        if (ext == fileName) {
            fileName += "-" + this._fileNames[fileRootName];
        } else {
            fileName = fileName.substr(0, fileName.length - ext.length - 1) + "-" + this._fileNames[fileRootName] + "." + ext;
        }
    } else {
        this._fileNames[fileRootName] = 0;
    }

    return fileName;
};


/**
 * <p>Replaces character set to UTF-8 in HTML &lt;meta&gt; tags</p>
 *
 * @param {String} HTML html contents
 * @returns {String} updated HTML
 */
MailParser.prototype._updateHTMLCharset = function(html) {

    html = html.replace(/\n/g, "\u0000").
    replace(/<meta[^>]*>/gi, function(meta) {
        if (meta.match(/http\-equiv\s*=\s*"?content\-type/i)) {
            return '<meta http-equiv="content-type" content="text/html; charset=utf-8" />';
        }
        if (meta.match(/\scharset\s*=\s*['"]?[\w\-]+["'\s>\/]/i)) {
            return '<meta charset="utf-8"/>';
        }
        return meta;
    }).
    replace(/\u0000/g, "\n");

    return html;
};

/**
 * <p>Detects the charset of an HTML file</p>
 *
 * @param {String} HTML html contents
 * @returns {String} Charset for the HTML
 */
MailParser.prototype._detectHTMLCharset = function(html) {
    var charset, input, meta;

    if (typeof html != "string") {
        html = html.toString("ascii");
    }

    if ((meta = html.match(/<meta\s+http-equiv=["']content-type["'][^>]*?>/i))) {
        input = meta[0];
    }

    if (input) {
        charset = input.match(/charset\s?=\s?([a-zA-Z\-_:0-9]*);?/);
        if (charset) {
            charset = (charset[1] || "").trim().toLowerCase();
        }
    }

    if (!charset && (meta = html.match(/<meta\s+charset=["']([^'"<\/]*?)["']/i))) {
        charset = (meta[1] || "").trim().toLowerCase();
    }

    return charset;
};
