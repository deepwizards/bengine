FROM node:18 AS node_base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Rebuild bcrypt with build-from-source option
RUN npm rebuild bcrypt --build-from-source

# Stage for webapp
FROM node_base AS webapp
EXPOSE 1337
CMD ["node", "app.js"]

# Stage for job_runner
FROM node_base AS job_runner

RUN apt-get update && apt-get -y install cron
RUN echo "* * * * * for i in {1..6}; do (node /app/scripts/job_runner_v3/main.js && sleep 10); done" | crontab -
CMD ["cron", "-f"]
