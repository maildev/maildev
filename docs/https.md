# HTTPS
By default MailDev will run on the http protocol. For Web Notification support you'll need
to run MailDev on https if not running on localhost. This can be done with a self signed certificate.

## Create certificate
Generate the certificate:
```shell script
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/private/maildev.key -out /etc/ssl/certs/maildev.crt
```

Answer the FQDN question with your domain name or ip:
```shell script
Common Name (e.g. server FQDN or YOUR name) []: 192.168.1.103
```

Files created:
- /etc/ssl/private/maildev.key
- /etc/ssl/certs/maildev.crt

## Start MailDev with https
Add the following arguments to your MailDev startup:
```shell script
--https
--https-key /etc/ssl/private/maildev.key
--https-cert /etc/ssl/certs/maildev.crt
```

## Open maildev with https
```
https://192.168.1.103:1080
```
As it's a self signed certificate, you need to accept it in your browser.
