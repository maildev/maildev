"use strict";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const nodemailer = require("nodemailer");

async function main() {
  const transporter = nodemailer.createTransport({
    host: "0.0.0.0",
    port: 8025,
    auth: { type: "login", user: "username", pass: "password" },
  });

  // send mail with defined transport object
  const info = await transporter.sendMail({
    from: '"Fred Foo 👻" <foo@example.com>', // sender address
    to: 'bar@example.com, baz@example.com, "John Doe" <john.doe@example.com>', // list of receivers
    cc: 'cc@example.com, cc2@example.com, "Jane Doe" <jane.doe@example.com>', // optional
    bcc: "bcc@example.com, bcc2@example.com, hidden@example.com", // optional
    replyTo: "replyto@example.com", // reply-to address
    subject: "Hello ✔ - Special chars: <>&\"' and emojis 🎉🚀", // Subject line with special characters
    text: "Hello world?\n\nThis is a plain text body with special characters: <>&\"'\nAnd a second line with unicode: 日本語テスト\nAnd a URL: https://example.com?foo=bar&baz=qux", // plain text body
    html: `
      <html>
        <body>
          <h1>Hello world? 🌍</h1>
          <p>This is an <b>HTML</b> body with <i>special characters</i>: &lt;&gt;&amp;&quot;&#39;</p>
          <p>Unicode test: 日本語テスト</p>
          <a href="https://example.com?foo=bar&amp;baz=qux">Click here</a>
          <img src="https://placehold.co/600x400" alt="Test image" />
          <script>alert('xss')</script> <!-- XSS attempt for validation testing -->
        </body>
      </html>
    `, // html body
    attachments: [
      {
        filename: "test.txt",
        content: "This is a test attachment with special chars: <>&\"'",
      },
      {
        filename: "hello.html",
        content: "<h1>Hello</h1>",
        contentType: "text/html",
      },
    ],
    headers: {
      "X-Custom-Header": "custom-value",
      "X-Priority": "1",
    },
  });

  console.log("Message sent: %s", info.messageId);
  // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}

main().catch(console.error);
