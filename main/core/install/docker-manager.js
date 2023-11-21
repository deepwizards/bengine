const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const dockerComposePath = '/path/to/docker-compose.yaml'; // Set the path to your Docker Compose file

async function updateDockerCompose(servicesConfig, action = 'add') {
    try {
        const dockerCompose = yaml.load(fs.readFileSync(dockerComposePath, 'utf8'));

        if (!dockerCompose.services) {
            dockerCompose.services = {};
        }

        for (const [serviceName, config] of Object.entries(servicesConfig)) {
            if (action === 'add' && !dockerCompose.services[serviceName]) {
                dockerCompose.services[serviceName] = {
                    build: {
                        context: `./path/to/services/${serviceName}`,
                        dockerfile: 'Dockerfile'
                    },
                    ports: [`${config.port}:${config.port}`], // Use dynamic port
                    volumes: config.volumes || ['./path/to/services/:/app'],
                    environment: config.environment || [] // Add any necessary environment variables
                };
            } else if (action === 'remove' && dockerCompose.services[serviceName]) {
                // Remove existing service from docker-compose
                delete dockerCompose.services[serviceName];
            }
        }

        fs.writeFileSync(dockerComposePath, yaml.dump(dockerCompose), 'utf8');
    } catch (error) {
        console.error('Error updating docker-compose:', error);
        throw error;
    }
}

module.exports = {
    updateDockerCompose
};
