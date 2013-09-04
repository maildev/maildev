# MailDev

**MailDev** is a simple way to test your project's generated emails during development with an easy to use web interface that runs on your machine.  **MailDev** is built on using great open source projects including [Express](http://expressjs.com), [AngularJS](http://angularjs.org/), and two great projects from [Andris Reinman](https://github.com/andris9): [Simple SMTP](https://github.com/andris9/simplesmtp) and [Mailparser](https://github.com/andris9/mailparser).

## Install & Run
	
	$ sudo npm install -g maildev
	$ maildev

## Usage

Configure your application to send emails via port `1025` and open `localhost:1080`.

![MailDev Screenshot](https://dl.dropboxusercontent.com/u/50627698/maildev-04-12-13.png)

## Features

* Toggle between HTML, plain text views as well as view email headers
* Test Responsive Emails w/ resizeable preview pane available for 320/480/600px screen sizes
>>>>>>> Develop

## Roadmap

* Add websockets for pushing email to the browser
* Add sqlite or JSON storage w/ possibility to persist data after restarts
* Write tests for server and client
* Write grunt task for quick drop into projects using grunt

## Ideas
* Check CSS compatibility of emails using http://www.campaignmonitor.com/css/
* Forward email to real email address for device/application testing

## Contribution

This initial release is rough and has room for improvement, if you find any errors, please try to describe them and file and issue. If you choose to run **MailDev** in development mode run `grunt watch`.  Please create a pull request for any changes or big fixes.

## Thanks

Thanks to [Andris Reinman](https://github.com/andris9) for creating his projects that are the backbone of this app.

## License

MIT