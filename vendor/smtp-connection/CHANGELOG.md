# Changelog

## v4.0.0 2017-02-15

  * Changed license from MIT to EUPL-v1.1
  * Removed NTLM support
  * In general this module is now just a wrapper around the SMTPConnection class in Nodemailer

## v3.1.0 2016-12-21

  * use setKeepAlive(true) on newly created sockets

## v3.0.1 2016-12-09

  * Fixed non-structured logging

## v3.0.0 2016-12-09

  * Use ES6 syntax
  * Updated logging to support structured output for real Bunyan logger instances

## v2.12.1 2016-10-10

  * Fixed invalid SIZE detection

## v2.12.0 2016-09-05

  * Updated dependencies

## v2.11.0 2016-08-04

  * Added new envelope option `size` to skip sending messages that are too large

## v2.10.0 2016-07-22

  * Added new option `opportunisticTLS` to allow continuing if STARTTLS failed

## v2.9.0 2016-07-13

  * Added `reset(cb)` method to call `RSET` command
  * Include failed recipients in the response error object

## v2.8.0 2016-07-07

  * Added full LMTP support. Set `lmtp` option to `true` to switch into LMTP mode
  * Updated default timeout values

## v2.7.0 2016-07-06

  * Use PIPELINING for multiple RCPT TO if available

## v2.6.0 2016-07-06

  * Added support for DSN
  * Added new option use8BitMime to indicate that the message might include non-ascii bytes
  * Added new info property rejectedErrors that includes errors for failed recipients
  * Updated errors to indicate where the error happened (SMTP command, API, CONN)

## v2.5.0 2016-05-11

  * Bumped dependencies

## v2.4.0 2016-04-24

  * Added experimental support for NTLM authentication

## v2.3.2 2016-04-11

  * Declare SMTPUTF8 usage if an address includes Unicode characters and the server indicates support for it. Fixes an issue with internationalized email addresses that were rejected by Gmail

## v2.3.1 2016-02-20

  * Fix broken requireTLS option

## v2.3.0 2016-02-17

  * Do not modify provided options object

## v2.2.6 2016-02-16

  * Added yet another socket.resume to fixed an issue with proxied sockets and TLS

## v2.2.5 2016-02-15

  * Fixed an issue with proxied sockets and TLS

## v2.2.4 2016-02-11

  * Catch errors that happen while creating a socket

## v2.2.3 2016-02-11

  * Fixed error code for STARTTLS errors

## v2.2.2 2016-02-09

  * Bumped nodemailer-shared

## v2.2.1 2016-02-09

  * Make sure socket is resumed once 'data' handler is set

## v2.2.0 2016-02-08

  * Added new option `secured` to indicate if socket provided by `connection` is already upgraded or not

## v2.1.0 2016-01-30

  * Added new option `connection` to provide an already connected plaintext socket. Useful when behind proxy.

## v2.0.1 2016-01-04

  * Bumped nodemailer-shared

## v2.0.0 2016-01-04

  * Locked dependency version

## v2.0.0-beta.5 2016-01-03

  * Fixed a bug where errors might been thrown before a handler was set

## v2.0.0-beta.3 2016-01-03

  * Use shared function to create the logger instance

## v2.0.0-beta.2 2016-01-03

  * Updated logging. Log information about transmitted message size in bytes

## v2.0.0-beta.1 2016-01-03

  * Re-added `debug` option. If set to true, then logs SMTP traffic, otherwise only transaction events
  * Pass streamed message content to the logger

## v2.0.0-beta.0 2016-01-02

  * Replaced jshint with eslint
  * Handle message stream errors
  * Use bunyan compatible logger interface instead of emitting 'log' events

## v1.3.8 2015-12-29

  * Do not use strict isEmail function, just check that there are no newlines in addresses. Fixes a regression with lax e-mail addresses.

## v1.3.7 2015-12-22

  * Fixed an issue with Node v0.10 where too many events were cleared

## v1.3.6 2015-12-19

  * Updated isemail configuration to only allow SMTP compatible e-mail addresses for the envelope (otherwise valid addresses might include symbols that don't play well with SMTP, eg. line folding inside quoted strings)

## v1.3.5 2015-12-19

  * Validate to and from address to be valid e-mail addresses

## v1.3.2 2015-12-16

  * Added missing 'close' and 'end' event handlers for a STARTTLS-upgraded socket

## v1.3.1 2015-06-30

  * Added partial support for LMTP protocol. Works only with single recipient (does not support multiple responses for DATA command)

## v1.2.0 2015-03-09

  * Connection object has a new property `secure` that indicates if the current connection is using a secure TLS socket or not
  * Fixed `requireTLS` where the connection was established insecurely if STARTTLS failed, now it returns an error as it should if STARTTLS fails

## v1.1.0 2014-11-11

  * Added additional constructor option `requireTLS` to ensure that the connection is upgraded before any credentials are passed to the server
  * Added additional constructor option `socket` to use an existing socket instead of creating new one (bantu)

## v1.0.2 2014-10-15

  * Removed CleartextStream.pair.encrypted error handler. Does not seem to be supported by Node v0.11

## v1.0.1 2014-10-15

  * Added 'error' handler for CleartextStream.pair.encrypted object when connecting to TLS.

## v1.0.0 2014-09-26

  * Changed version scheme from 0.x to 1.x.
  * Improved error handling for timeout on creating a connection. Caused issues with `once('error')` handler as an error might have been emitted twice
