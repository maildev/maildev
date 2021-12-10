#!/bin/ash
#
# Dovecot will bind to privileged ports below 1014 and drop privileges
# before accessing the Maildir
/usr/sbin/dovecot && \
echo "Dovecot listening to POP3(110), IMAP(143), SMTP(587)" &
# Run maildev as the node user, not root.
# Since this container does nothing else than running an smtp server
# running as a user instead of root may be of some, discussable, security benefit.
# Prior to Docker 20.10 it was prevented from listening to ports 80 and 25,
# and therefore the ports 1080 and 1025 was chosen.
# From Docker 20.10 it is allowed due to the default setting of
#   docker run ... --sysctl net.ipv4.ip_unprivileged_port_start=0
# Therefore listen to the default ports 80 for http and 25 for smtp.
# Write mail to the home directory of the user, where Dovecot will find it.
sudo -iu node /home/node/bin/maildev --web 80 --smtp 25 --mail-directory /home/node/Maildir
