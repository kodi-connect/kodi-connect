ARG GIT_HASH

########################################
FROM node:12.14 as builder

ENV HOME=/home/node
WORKDIR $HOME/app

RUN ln -sf /usr/share/zoneinfo/Europe/Bratislava /etc/localtime && \
  dpkg-reconfigure -f noninteractive tzdata && \
  apt-get update && apt-get install -y git

COPY package.json yarn.lock $HOME/app/
RUN yarn install

COPY . $HOME/app
RUN yarn run build

########################################
FROM node:12.14-slim as prod

LABEL githash=${GIT_HASH}

ENV GIT_HASH=${GIT_HASH}
ENV NODE_ENV=production
ENV HOME=/home/node
WORKDIR $HOME/app

COPY package.json yarn.lock $HOME/app/
RUN yarn install

COPY --from=builder $HOME/app/build $HOME/app/build

RUN chown -R node:node $HOME/app

USER node
CMD ["yarn", "start"]
