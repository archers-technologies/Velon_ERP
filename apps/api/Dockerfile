FROM node:22-alpine AS builder
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN npm ci --workspace=@velon/api --workspace=@velon/database --workspace=@velon/shared
COPY packages ./packages
COPY apps/api ./apps/api
RUN npm run generate -w @velon/database
RUN npm run build -w @velon/database && npm run build -w @velon/shared && npm run build -w @velon/api

FROM node:22-alpine
WORKDIR /
ENV NODE_ENV=production
COPY --from=builder /workspace/node_modules /node_modules
COPY --from=builder /workspace/packages/database /packages/database
COPY --from=builder /workspace/packages/shared /packages/shared
COPY --from=builder /workspace/apps/api/dist /apps/api/dist
COPY --from=builder /workspace/apps/api/package.json /apps/api/
EXPOSE 3001
CMD ["node", "/apps/api/dist/apps/api/src/main.js"]
