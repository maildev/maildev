'use strict'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const nodemailer = require('nodemailer')

async function main () {
  const { user, pass } = await nodemailer.createTestAccount()
  const transporter = nodemailer.createTransport({
    host: '0.0.0.0',
    port: 8025,
    auth: { type: 'login', user, pass }
  })

  // send mail with defined transport object
  const info = await transporter.sendMail({
    from: '\'Fred Foo 👻\' <foo@example.com>', // sender address
    to: 'bar@example.com, baz@example.com', // list of receivers
    cc: 'cc@example.com, cc2@example.com', // optional
    bcc: 'bcc@example.com, bcc@example.com', // optional
    subject: 'Hello ✔', // Subject line
    text: 'Hello world?', // plain text body
    html: '<b>Hello world?</b>' // html body
  })

  console.log('Message sent: %s', info.messageId)
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info))
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}

main().catch(console.error)
