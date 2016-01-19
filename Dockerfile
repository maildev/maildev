FROM node:5-onbuild

ENV VERBOSE 0

EXPOSE 80 25

ADD entrypoint.sh /
RUN chmod u+x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

CMD ["sh", "-c", "bin/maildev --web 80 --smtp 25"]
