FROM python:2.7
ARG VERSION

ENV HOME=/home/python

RUN mkdir -p -m 0600 ~/.ssh && ssh-keyscan github.com >> ~/.ssh/known_hosts

RUN apt-get update && \
    apt-get install -y zip curl git net-tools

RUN touch /usr/bin/cec-client && chmod +x /usr/bin/cec-client && \
    useradd -m python && \
    mkdir -p $HOME/app && \
    chown -R python:python $HOME

RUN curl --fail -L https://kodi-connect.s3.eu-central-1.amazonaws.com/kodi-connect-addon/plugin.video.kodiconnect-${VERSION}.zip \
        -o /tmp/plugin.video.kodiconnect.zip && \
    unzip /tmp/plugin.video.kodiconnect.zip -d /tmp && \
    cp -r /tmp/plugin.video.kodiconnect/* $HOME/app/

RUN git clone https://github.com/kodi-connect/kodi-connect-addon.git /tmp/kodi-connect-addon && \
    cp -r /tmp/kodi-connect-addon/mock/ $HOME/app/

WORKDIR $HOME/app
USER python

RUN mkdir /tmp/kodilog
