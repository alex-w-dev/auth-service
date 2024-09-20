FROM node:20.16.0-alpine
WORKDIR /usr/src/app
COPY . .
RUN npm ci
RUN npm run build

CMD ["npm", "start"]