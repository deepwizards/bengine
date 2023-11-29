const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const mongoose = require('mongoose');
const dockerComposePath = './path/to/docker-compose.yml'; // Update with actual path

// Schema definition
const serviceSchema = new mongoose.Schema({
    name: String,
    description: String,
    api: String,
    port: Number,
    endpoint: String,
    icon: String,
    input_format: String,
    output_format: String,
    type: String
});
const Service = mongoose.model('Service', serviceSchema);

async function findAvailablePort(startPort = 3001) {
    let port = startPort;
    while (await Service.findOne({ port })) {
        port++;
    }
    return port;
}

async function updateDockerComposeConfig(serviceName, port) {
    const dockerCompose = yaml.load(await fs.readFile(dockerComposePath, 'utf8'));
    if (!dockerCompose.services[serviceName]) {
        dockerCompose.services[serviceName] = {
            build: `./services/${serviceName}`,
            ports: [`${port}:${port}`],
            environment: [`SERVICE_PORT=${port}`]
        };
    } else {
        dockerCompose.services[serviceName].ports = [`${port}:${port}`];
        dockerCompose.services[serviceName].environment = [`SERVICE_PORT=${port}`];
    }
    await fs.writeFile(dockerComposePath, yaml.dump(dockerCompose), 'utf8');
}

async function installServices(serviceNames, extractedPath, extensionName) {
    try {
        console.log('Installing services:', serviceNames);
        const serviceDirPath = path.join(extractedPath, 'services');
        if (!fsSync.existsSync(serviceDirPath)) {
            throw new Error('Services directory not found in the extension package');
        }

        for (const serviceName of serviceNames) {
            const servicePath = path.join(serviceDirPath, serviceName);
            if (!fsSync.existsSync(servicePath)) {
                throw new Error(`Service ${serviceName} not found in the extension package`);
            }

            const destPath = path.join(__dirname, '..', '..', '..', 'services', serviceName);
            await fs.cp(servicePath, destPath, { recursive: true });

            const port = await findAvailablePort();
            const service = new Service({ name: serviceName, extension: extensionName, port });
            await service.save();

            await updateDockerComposeConfig(serviceName, port);
        }
    } catch (error) {
        console.error('Error installing services:', error);
        throw error;
    }
}

module.exports = {
    installServices
};
