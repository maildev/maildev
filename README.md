# MailDev

**MailDev** is a simple way to test your project's generated emails during development with an easy to use web interface that runs on your machine.  **MailDev** is built on using great open source projects including [Express](http://expressjs.com), [AngularJS](http://angularjs.org/), and two great projects from [Andris Reinman](https://github.com/andris9): [Simple SMTP](https://github.com/andris9/simplesmtp) and [Mailparser](https://github.com/andris9/mailparser).

## Install & Run
	
	$ npm install -g maildev
	$ maildev

## Usage

Configure your application to send emails via port `1025` and open `localhost:1080`.

**Nodemailer**
    var transport = nodemailer.createTransport("SMTP", {
        port: 1025,
        // other settings...
    });

**Django**
Add `EMAIL_PORT = 1025` in your settings file [[source]](https://docs.djangoproject.com/en/dev/ref/settings/#std:setting-EMAIL_PORT)

**Rails** - config settings:
    config.action_mailer.delivery_method = :smtp
        config.action_mailer.smtp_settings = {
            :address => "localhost",
            :port => 1025
      }


![MailDev Screenshot](https://dl.dropboxusercontent.com/u/50627698/maildev-04-12-13.png)

## Features

* Toggle between HTML, plain text views as well as view email headers
* Test Responsive Emails w/ resizeable preview pane available for 320/480/600px screen sizes
* Ability to receive and view email attachments
* Websockets keep the interface in sync once emails are received

## Roadmap

* Add command line options for ports, logging, ability to run as daemon, etc.
* Forward email to real email address for device/application testing
* Write tests for server and client

## Ideas
* Write grunt task for quick drop into projects using grunt
* Add sqlite or [NeDB](https://github.com/louischatriot/nedb) storage w/ possibility to persist data after restarts
* Check CSS compatibility of emails using http://www.campaignmonitor.com/css/

## Contributing to MailDev

Bugs and new features should be submitted using [Github issues](https://github.com/djfarrelly/MailDev/issues/new). Include a description of the item and the expected behavior.

* Try to keep in the coding style already established in this project: 2 space soft-tabs, Single quotes
* Make all changes on the `Develop` branch or even better, create a new branch for your changes, i.e. `git checkout -b some-new-feature`
* Lint your code before committing by running `grunt jshint` (Install [Grunt](http://www.gruntjs.com) via `npm install -g grunt-cli`)
* For CSS changes, you must have [Compass](http://compass-style.org/) installed and run `grunt compass` or `grunt watch` to pickup live changes

## Changelog

0.4.0 - Add ability to receive and view attachments
0.3.1 - Add Socket.io for immediate email arrival to interface
0.3.0 - Initial open source release

## Thanks

Thanks to [Andris Reinman](https://github.com/andris9) for creating his projects that are the backbone of this app and [MailCatcher](http://mailcatcher.me/) for the inspiration.

## License

MIT