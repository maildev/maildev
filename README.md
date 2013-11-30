# MailDev

**MailDev** is a simple way to test your project's generated emails during development with an easy to use web interface that runs on your machine.  **MailDev** is built on using great open source projects including [Express](http://expressjs.com), [AngularJS](http://angularjs.org/), and two great projects from [Andris Reinman](https://github.com/andris9): [Simple SMTP](https://github.com/andris9/simplesmtp) and [Mailparser](https://github.com/andris9/mailparser).

## Install & Run
	
	$ npm install -g maildev
	$ maildev

## Usage

Configure your application to send emails via port `1025` and open `localhost:1080`.

![MailDev Screenshot](https://dl.dropboxusercontent.com/u/50627698/maildev-04-12-13.png)

## Features

* Toggle between HTML, plain text views as well as view email headers
* Test Responsive Emails w/ resizeable preview pane available for 320/480/600px screen sizes
* Websockets keep the interface in sync once emails are received

## Roadmap

* Add sqlite or [NeDB](https://github.com/louischatriot/nedb) storage w/ possibility to persist data after restarts
* Write tests for server and client
* Write grunt task for quick drop into projects using grunt

## Ideas
* Check CSS compatibility of emails using http://www.campaignmonitor.com/css/
* Forward email to real email address for device/application testing

# Contributing to MailDev

Bugs and new features should be submitted using [Github issues](https://github.com/djfarrelly/MailDev/issues/new). Include a description of the item and the expected behavior.

* Try to keep in the coding style already established in this project: 2 space soft-tabs, Single quotes
* Make all changes on the `Develop` branch or even better, create a new branch for your changes, i.e. `git checkout -b some-new-feature`
* Lint your code by running `grunt jshint` (Install [Grunt](http://www.gruntjs.com) via `npm install -g grunt-cli`)

## Thanks

Thanks to [Andris Reinman](https://github.com/andris9) for creating his projects that are the backbone of this app and [MailCatcher](http://mailcatcher.me/) for the inspiration.

## License

MIT