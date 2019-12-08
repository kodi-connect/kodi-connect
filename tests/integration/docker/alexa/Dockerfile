FROM node:10
ARG VERSION

RUN apt-get update && \
    apt-get install -y zip curl && \
    yarn global add jest

USER node

RUN curl --fail -L https://kodi-connect.s3.eu-central-1.amazonaws.com/kodi-alexa-video/kodi-alexa-video-package-${VERSION}.zip \
        -o /tmp/kodi-alexa-video-package.zip && \
    mkdir -p /tmp/kodi-alexa-video-package &&\
    unzip /tmp/kodi-alexa-video-package.zip -d /tmp/kodi-alexa-video-package && \
    mkdir -p /home/node/app && \
    cp -r /tmp/kodi-alexa-video-package/* /home/node/app/

WORKDIR /home/node/app
