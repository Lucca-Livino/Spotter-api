FROM node:22

EXPOSE 5015

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

CMD ["npm", "run", "start"]