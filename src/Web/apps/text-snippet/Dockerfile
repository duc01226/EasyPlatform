# BUILDER START
FROM node:14.17.1-alpine3.12 as builder
WORKDIR /usr/src

# Copy common files
COPY yarn.lock .
COPY package.json .
COPY package-lock.json .
COPY tsconfig.base.json .
COPY nx.json .
COPY angular.json .
COPY .eslintrc.json .
COPY decorate-angular-cli.js .
COPY libs libs
COPY tools tools

# npm install
RUN npm install

# Build app files
COPY apps/text-snippet apps/text-snippet
ARG configuration=production
RUN npm run nx build text-snippet -- --configuration=${configuration}
# BUILDER END

# Build static web app
FROM nginx:stable-alpine as app
RUN rm -rf /usr/share/nginx/html/*
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /usr/src/dist/apps/text-snippet /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]


