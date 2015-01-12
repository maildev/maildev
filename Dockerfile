FROM google/nodejs-runtime
EXPOSE 80 25
ENTRYPOINT ["/app/bin/maildev", "--web", "80", "--smtp", "25"]
