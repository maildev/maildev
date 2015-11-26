FROM node:5-onbuild
EXPOSE 80 25
CMD ["bin/maildev", "--web", "80", "--smtp", "25"]
