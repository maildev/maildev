# MailDev

**MailDev** is a simple way to test your projects's generated emails during development with an easy to use web interface that runs on your machine.  **MailDev** is built on using great open source projects including [Express](http://expressjs.com), [AngularJS](http://angularjs.org/), [Yeoman](http://yeoman.io/), [Bootstrap](http://twitter.github.com/bootstrap/), and two great projects from [Andris Reinman](https://github.com/andris9), [Simple SMTP](https://github.com/andris9/simplesmtp) and [Mailparser](https://github.com/andris9/mailparser).

## Install

Clone the repo and run this to download all dependencies and build the project:
	
	$ npm install
	$ gem install compass
	$ grunt build

Run the app

	$ coffee server.coffee

## Usage

Point your project to port `1025` and open `localhost:1080`.

![MailDev Screenshot](https://dl.dropboxusercontent.com/s/dxym73zkohpz477/maildev-03-31-13.png)

## Roadmap

* Write tests for server and client
* Add websockets for pushing email to the browser
* Add sqlite or JSON storage w/ possibility to persist data after restarts
* Add button to display email headers
* Publish to NPM for quick installation and running
* Write grunt task for quick drop into projects using grunt

## Ideas
* Live preview of HTML emails
* Check CSS compatibility of emails using http://www.campaignmonitor.com/css/
* Forward email to real email address for device/application testing
* Add ability to test email media queries

## Contribution

This initial release is rough and has room for improvement, if you find any errors, please try to describe them and file and issue. If you choose to run **MailDev** in development mode run `coffee server.coffee --dev` and `grunt watch`.  Please create a pull request for any changes or big fixes.

## Thanks

Thanks to [Andris Reinman](https://github.com/andris9) for creating his easy to use projects that are the backbone of this app.

## License

MIT