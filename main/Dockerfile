FROM node:18 AS node_base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

RUN npm rebuild bcrypt --build-from-source

FROM node_base AS bengine-app
EXPOSE 1337
CMD ["node", "app.js"]

FROM node_base AS bengine-job-runner

RUN apt-get update && apt-get -y install cron
RUN echo "* * * * * for i in {1..6}; do (node /app/scripts/job_runner_v3/main.js && sleep 10); done" | crontab -
CMD ["cron", "-f"]
