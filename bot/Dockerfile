# SEC-021: 同梱ストアから emSign ECC Root CA G3 を外した Node 24.22.1。公式の Alpine 版を digest で固定する。
FROM node:24.22.1-alpine@sha256:feb76650b7195319268c59cb2d419c732d6c499b13bf5296f16ab59eb1f0a4f3
WORKDIR /app
# SEC-021: OSの束も G3 を外した版より古くしない。
RUN apk add --no-cache 'ca-certificates-bundle>=20261020-r0'
COPY bot/package.json bot/package-lock.json ./bot/
RUN npm --prefix bot ci --omit=dev --ignore-scripts
COPY bot/*.mjs ./bot/
COPY scripts/recipes.mjs scripts/item-icons.mjs ./scripts/
COPY deploy/target.json ./deploy/target.json
USER node
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:8081/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "bot/server.mjs"]
