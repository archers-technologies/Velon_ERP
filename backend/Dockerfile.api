FROM node:22-alpine AS builder
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared-kernel/package.json ./packages/shared-kernel/
COPY backend/package.json ./backend/
RUN npm ci --workspace=@velon/backend --workspace=@velon/database --workspace=@velon/shared
COPY packages ./packages
COPY backend ./backend
RUN npm run generate -w @velon/database
RUN npm run build -w @velon/database && npm run build -w @velon/shared && npm run build -w @velon/backend

FROM node:22-alpine
WORKDIR /
ENV NODE_ENV=production
COPY --from=builder /workspace/node_modules /node_modules
COPY --from=builder /workspace/packages/database /packages/database
COPY --from=builder /workspace/packages/shared-kernel /packages/shared-kernel
COPY --from=builder /workspace/backend/dist /backend/dist
COPY --from=builder /workspace/backend/package.json /backend/
EXPOSE 3001
CMD ["node", "/backend/dist/main.js"]
