
/**
 * MailDev - send.js -- send a few emails for testing
 *
 * Run this to send emails to port 1025 for testing MailDev during development
 *   node test/send.js
 */

var nodemailer = require('nodemailer')
  , mail       = require('nodemailer').mail
  , async      = require('async')
  ;

// Create a transport with MailDev's default receiving port
var transport = nodemailer.createTransport('SMTP', {
  port: 1025
});

// Messages list
var messages = [
    {
      from: 'Angelo Pappas <angelo.pappas@fbi.gov>'
    , to: 'Johnny Utah <johnny.utah@fbi.gov>'
    , subject: 'The ex-presidents are surfers'
    , headers: {
        'X-some-header': 1000
      }
    , text: 'The wax at the bank was surfer wax!!!'
    , html: '<!DOCTYPE html><html><head></head><body>' +
            '<p>The wax at the bank was surfer wax!!!</p>' +
            '</body></html>'
    , attachments: [
        { fileName: 'notes.txt', contents: 'Info on surf board wax', contentType: 'text/plain' }
      ]
    }
  , {
      from: 'Angelo Pappas <angelo.pappas@fbi.gov>'
    , to: 'Johnny Utah <johnny.utah@fbi.gov>'
    , subject: 'You were right.'
    , headers: {
        'X-some-header': 1000
      }
    , text: 'They are surfers.'
    }
  , {
      from: 'Bodhi <bodhi@gmail.com>'
    , to: 'Johnny Utah <johnny.utah@fbi.gov>'
    , subject: 'The ultimate price'
    , headers: {
        'X-some-header': 1000
      }
    , text: 'If you want the ultimate, you\'ve got to be willing to pay the ultimate price. \nIt\'s not tragic to die doing what you love.'
    , html: '<!DOCTYPE html><html><head></head><body style="background:#eee;font-family:sans-serif;padding:2em 2em;">' +
            '<h1>Point Break</h1>' +
            '<img src="http://farm8.staticflickr.com/7337/11784709785_bbed9bae7d_m.jpg">' +
            '<p>If you want the ultimate, you\'ve got to be willing to pay the ultimate price. <br>It\'s not tragic to die doing what you love.</p>' +
            '<p><strong>- Bodhi</strong></p>' +
            '</body></html>'
    }
  ];

// Send the emails
async.map(messages, transport.sendMail, function(err){
  if (err) return console.error(err.message);

  console.log('Messages sent');
  transport.close();
});