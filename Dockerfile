FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --chown=node:node pet-control.mjs needs.mjs server.mjs session.mjs actions.mjs turn.mjs printer.mjs pet-package.mjs upload-form.mjs ./
COPY --chown=node:node public/ ./public/
USER node
EXPOSE 3000
CMD ["npm", "start"]
