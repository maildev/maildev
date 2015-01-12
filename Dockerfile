FROM google/nodejs-runtime
EXPOSE 1080 1025
ENTRYPOINT ["/app/bin/maildev"]
