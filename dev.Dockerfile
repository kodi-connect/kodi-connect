FROM node:10.16.0

RUN apt-get update && \
  apt-get -y install \
    git \
    python-pip \
    python-dev && \
  pip install awscli --upgrade

ENV HOME=/home/node
ENV NODE_ENV=development

WORKDIR $HOME/app
RUN ln -sf /usr/share/zoneinfo/Europe/Bratislava /etc/localtime && \
  dpkg-reconfigure -f noninteractive tzdata && \
  mkdir -p $HOME/app/node_modules && \
  chown -R node:node $HOME/app

USER node
