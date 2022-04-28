# BUILDER START
FROM node:14.17.1-alpine3.12 as builder
WORKDIR /usr/src

# npm install
COPY package.json .
RUN npm install

# Copy common files
COPY tsconfig.base.json .
COPY nx.json .
COPY angular.json .
COPY .eslintrc.json .
COPY decorate-angular-cli.js .
COPY libs libs
COPY tools tools

# Build app files
COPY apps/text-snippet apps/text-snippet
COPY libs libs
COPY typings typings
ARG configuration
RUN npm run nx build text-snippet -- --configuration=${configuration}
# BUILDER END

# Build static web app
FROM nginx:stable-alpine as app
RUN rm -rf /usr/share/nginx/html/*
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /usr/src/dist/apps/text-snippet /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


