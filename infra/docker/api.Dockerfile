FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY packages ./packages
COPY apps/api ./apps/api
EXPOSE 8787
USER node
CMD ["node", "apps/api/src/server.mjs"]
