# BUILDER START
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

RUN npm install -g @angular/cli@^19.0.0
RUN npm install -g nx@latest
RUN npm install -g yarn --force

# npm install
COPY package.json .
COPY package-lock.json .
COPY nx.json .
COPY decorate-angular-cli.js .
RUN npm install --force

# Copy common files
COPY tsconfig.base.json .
COPY .editorconfig .
COPY .eslintrc.json .
COPY .eslintignore .
COPY .prettierrc .
COPY .prettierignore .
COPY jest.config.ts .
COPY jest.preset.js .
COPY nginx.conf .
COPY nginx-dev.conf .
COPY tools tools
COPY scripts scripts

# Build app files
COPY typings typings
COPY libs libs
COPY apps/playground-text-snippet apps/playground-text-snippet
ARG configuration=docker-dev
RUN npm run lint:playground-text-snippet
RUN node --max-old-space-size=4500 ./node_modules/@angular/cli/bin/ng build playground-text-snippet --configuration=${configuration} --skip-nx-cache
# BUILDER END

# Build static web app
FROM nginx:1.25.1-alpine
RUN apk add --update nodejs npm moreutils

RUN npm i @angular/service-worker -g
RUN apk update && apk add dos2unix

COPY --from=builder /usr/src/app/dist/apps/playground-text-snippet /usr/share/nginx/html
COPY --from=builder /usr/src/app/apps/playground-text-snippet/ngsw-config.json /usr/share/nginx/html/
COPY --from=builder /usr/src/app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /usr/src/app/apps/playground-text-snippet/docker-entrypoint.sh /

# fix docker-for-windows-dealing-with-windows-line-endings
RUN dos2unix /docker-entrypoint.sh

EXPOSE 80
RUN chmod 777 -R /docker-entrypoint.sh
ENTRYPOINT [ "/docker-entrypoint.sh" ]
