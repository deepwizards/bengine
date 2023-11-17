# Base image for Node.js
FROM node:18 AS node_base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

FROM node_base AS webapp
RUN npm rebuild bcrypt --build-from-source
COPY --from=node_base /app/app.js /app/app.js
EXPOSE 1337
CMD ["node", "/app/app.js"]

# FROM node_base AS job_runner
# COPY --from=node_base /app/scripts/job_runner_cron.sh /app/scripts/job_cron.sh
# RUN chmod +x /app/scripts/job_cron.sh \
#     && echo "*/1 * * * * /app/scripts/job_cron.sh" > /etc/crontabs/root \
#     && mkdir -p /var/lock

# CMD ["crond", "-f", "-l", "8"]

FROM node_base AS job_runner
CMD ["sh", "-c", "while true; do node /app/scripts/job_runner_v3/main.js; sleep 10; done"]