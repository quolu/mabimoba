FROM node:24.14.1-alpine AS build
WORKDIR /site
COPY package.json ./
COPY content ./content
COPY scripts ./scripts
COPY public ./public
COPY deploy/target.json ./deploy/target.json
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.29-alpine@sha256:0c79d56aee561a1d81c63f00eee5fb5fe29279560cdc55e91425133104c7fbe6
# SEC-021: emSign ECC Root CA G3 を外したAlpineの束へ上げる（上流の再ビルド待ちの間の自作の層）。
USER root
RUN apk add --no-cache 'ca-certificates>=20261020-r0' 'ca-certificates-bundle>=20261020-r0'
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /site/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
