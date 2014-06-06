# MailDev

[![NPM version](https://badge.fury.io/js/maildev.png)](http://badge.fury.io/js/maildev)

**MailDev** is a simple way to test your project's generated emails during development with an easy to use web interface that runs on your machine built on top of [Node.js](http://www.nodejs.org).

![MailDev Screenshot](https://dl.dropboxusercontent.com/u/50627698/maildev-01-05-14.png)

## Install & Run
	
	$ npm install -g maildev
	$ maildev

## Usage

    maildev [options]

      -h, --help         output usage information
      -V, --version      output the version number
      -s, --smtp [port]  SMTP port to catch emails [1025]
      -w, --web [port]   Port to run the Web GUI [1080]
      -o, --open         Open the Web GUI after startup
      -v, --verbose

## Configure your project

Configure your application to send emails via port `1025` and open `localhost:1080` in your browser.

**Nodemailer**

    var transport = nodemailer.createTransport("SMTP", {
        port: 1025,
        // other settings...
    });

**Django** -- Add `EMAIL_PORT = 1025` in your settings file [[source]](https://docs.djangoproject.com/en/dev/ref/settings/#std:setting-EMAIL_PORT)

**Rails** -- config settings:

    config.action_mailer.delivery_method = :smtp
        config.action_mailer.smtp_settings = {
            :address => "localhost",
            :port => 1025
      }

## Features

* Toggle between HTML, plain text views as well as view email headers
* Test Responsive Emails w/ resizeable preview pane available for 320/480/600px screen sizes
* Ability to receive and view email attachments
* Websockets keep the interface in sync once emails are received
* Command line interface for configuring SMTP and Web interface ports

## Roadmap

* Forward email to real email address for device/application testing
* Write tests for server and client

## Ideas

If you're using MailDev and you have a great idea, I'd love to hear it. If you're not using MailDev because it lacks a feature, I'd love to hear that too. Add an issue to the repo [here](https://github.com/djfarrelly/MailDev/issues/new) or contact me on [twitter](http://www.twitter.com/djfarrelly).

## Contributing

Any help on MailDev would be awesome. There is plenty of room for improvement. Feel free to [create a Pull Request](https://github.com/djfarrelly/MailDev/issues/new) from small to big changes. 

To run **MailDev** during development:

    # grunt-cli is needed by grunt; ignore this if already installed
    npm install -g grunt-cli
    npm install
    grunt dev

The `grunt dev` task will run the project using nodemon and restart automatically when changes are detected. SASS files will be compiled automatically on save also. To trigger some emails for testing run `node test/send.js` in a separate shell. Please run jshint to your lint code before submitting a pull request; run `grunt jshint`.

## Changelog

0.5.2 - Lock down dependency versions

0.5.1 - Fix menu layout issue in Safari

0.5.0 - Add command line interface. Web UI redesign.

0.4.0 - Add ability to receive and view attachments

0.3.1 - Add Socket.io for immediate email arrival to interface

0.3.0 - Initial open source release

## Thanks

**MailDev** is built on using great open source projects including [Express](http://expressjs.com), [AngularJS](http://angularjs.org/), [Font Awesome](http://fontawesome.io/) and two great projects from [Andris Reinman](https://github.com/andris9): [Simple SMTP](https://github.com/andris9/simplesmtp) and [Mailparser](https://github.com/andris9/mailparser). Many thanks to Andris as his projects are the backbone of this app and to [MailCatcher](http://mailcatcher.me/) for the inspiration.

## License

MIT
