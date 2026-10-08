FROM node:24.14.1-alpine
WORKDIR /app
COPY bot/package.json bot/package-lock.json ./bot/
RUN npm --prefix bot ci --omit=dev --ignore-scripts
COPY bot/*.mjs ./bot/
COPY deploy/target.json ./deploy/target.json
USER node
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:8081/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "bot/server.mjs"]
