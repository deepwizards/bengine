# Base image for Node.js
FROM node:18 AS node_base

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Rebuild bcrypt with build-from-source option
RUN npm rebuild bcrypt --build-from-source

FROM node_base AS webapp
EXPOSE 1337
CMD ["node", "app.js"]

FROM node_base AS job_runner
COPY job-runner-crontab /etc/cron.d/job-runner-crontab
RUN chmod 0644 /etc/cron.d/job-runner-crontab \
    && crontab /etc/cron.d/job-runner-crontab
CMD ["cron", "-f"]
