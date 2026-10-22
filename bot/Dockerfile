FROM node:24.14.1-alpine
WORKDIR /app
# SEC-021: emSign ECC Root CA G3 を外したAlpineの束へ上げ、Nodeは同梱ストアではなくこの束で検証する（Node 24.22.1 のAlpine版が出るまでの暫定策）。
RUN apk add --no-cache 'ca-certificates-bundle>=20261020-r0'
COPY bot/package.json bot/package-lock.json ./bot/
RUN npm --prefix bot ci --omit=dev --ignore-scripts
COPY bot/*.mjs ./bot/
COPY scripts/recipes.mjs scripts/item-icons.mjs ./scripts/
COPY deploy/target.json ./deploy/target.json
USER node
# 起動の引数ではなく環境変数で指定し、監査の照合（NODE_OPTIONS）から見えるようにする。
ENV NODE_OPTIONS=--use-openssl-ca
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:8081/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "bot/server.mjs"]
