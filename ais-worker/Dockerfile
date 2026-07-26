FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build 2>/dev/null || true
EXPOSE 7700
EXPOSE 7701
ENV NODE_ENV=production
CMD ["npm", "start"]
