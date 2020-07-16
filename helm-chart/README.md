# SMTP relay service
This helm-chart installs [Maildev](https://github.com/maildev/maildev).

Currently exposes OpenShift routes, but can be adapted to use K8s ingress objects as well.

Its mainly usage is to provide with a SMTP relay service inside OpenShift,
so other apps can rely on it to send mails externally.

Inside the Namespace where it is deployed, an SMTP service is available: `smtp:25`.

Maildev also provides a Web interface, it can be disabled/enabled at discretion.
By default it exposed at a route.

Also note that mails do not persist after reboot. Everytime Maildev starts, it starts from scratch,
even if the `/tmp/maildev` folder, where Maildev stores mails, is persisted.

And I haven't found any way to configure Maildev so it reload previous mails after a reboot....

# Sources code
Maildev source code can be here: https://github.com/maildev/maildev

# Known issue with Env Vars

Github issue: https://github.com/maildev/maildev/issues/315

So, not every option can be configured using env vars, so, a few options are hardcoded in the deployment:
`["--verbose", "--outgoing-secure", "--auto-relay"]`

## Configuration

Table with the most relevants parameters for MailDev.
Not listing here the more general paramaters such as tolerations, nodeSelectors, etc.

| Parameter                     | Description                                                                                       | Default                                     |
|------------------------------:|:--------------------------------------------------------------------------------------------------|:--------------------------------------------|
| **outgoing_relay.host**       | SMTP Relay host, `MAILDEV_OUTGOING_HOST`.                                                         | ``                                          |
| **outgoing_relay.port**       | SMTP Relay port, `MAILDEV_OUTGOING_PORT`.                                                         | ``                                          |
| **outgoing_relay.user**       | SMTP Relay user, `MAILDEV_OUTGOING_USER`.                                                         | ``                                          |
| **outgoing_relay.pass**       | SMTP Relay password, `MAILDEV_OUTGOING_PASS`.                                                     | ``                                          |
| **outgoing_relay.secure**     | Use SMTP SSL for outgoing emails, `MAILDEV_OUTGOING_SECURE`.                                      | `true`. Hardcoded in the deployment due to a bug. |
| **ports.smtp**                | Port where the SMTP service is listenning. (Irrelevant for OCP/K8S), `MAILDEV_SMTP_PORT`.         | `1025`                                      |
| **ports.web**                 | Port where the Web interface service is listenning. (Irrelevant for OCP/K8S), `MAILDEV_WEB_PORT`. | `1080`                                      |
| **web.disable**               | Disable Web interface. `MAILDEV_DISABLE_WEB`.                                                     | `False`                                     |
| **web.user**                  | Web interface user, `MAILDEV_WEB_USER`.                                                           | `admin`                                     |
| **web.pass**                  | Web interface password, `MAILDEV_WEB_PASS`.                                                       | ``                                          |
| **https.enabled**             | Switch from http to https protocol, `MAILDEV_HTTPS`.                                              | `False`                                     |
| **https.key**                 | The file path to the ssl private key, `MAILDEV_HTTPS_KEY`.                                        |                                             |
| **https.cert**                | The file path to the ssl cert file, `MAILDEV_HTTPS_CERT`.                                         |                                             |
| **incoming.user**             | SMTP user for incoming emails, `MAILDEV_INCOMING_USER`.                                           |                                             |
| **incoming.pass**             | SMTP password for incoming emails, `MAILDEV_INCOMING_PASS`.                                       |                                             |

# Test it

rsh into the pod.
```bash
oc rsh $(oc get pod -l "app.kubernetes.io/instance=maildev" -o name)
```

Create summy mail.txt file.
```bash
cat <<EOF >> mail.txt
From: Test Maildev <test@maildev.com>
To: Nikola Tesla Tudela <niko@tesla.com>
Subject: Test mail from maildev
Date: Fri, 17 Nov 2020 11:26:16

Dear Joe,
Welcome to this example email. What a lovely day.
Cheers!!
EOF
```

Send the mail with curl:
```bash
curl smtp://smtp:25 --mail-from test@maildev.com --mail-rcpt niko@tesla.com --upload-file ./mail.txt
```

Check the logs and see if the mail has been delivered.
```bash
kubectl logs $(kubectl get pod -l "app.kubernetes.io/instance=maildev" -o name)
Temporary directory created at /tmp/maildev
Temporary directory created at /tmp/maildev/1
MailDev outgoing SMTP Server smtp.gmail.com:465 (user:test@example.com, pass:####, secure:yes)
Auto-Relay mode on
MailDev webapp running at http://0.0.0.0:1080
MailDev SMTP Server running at 0.0.0.0:1025
Saving email: Test mail from maildev, id: 3ZhYnk5q
MailDev outgoing SMTP Server smtp.gmail.com:465 (user:test@example.com, pass:####, secure:yes)
Mail Delivered:  Test mail from maildev
```

Alternatively you can check the webconsole.
```bash
kubectl get route web-maildev -o=jsonpath='{.spec.host}'
```

Check your mail inbox ;)