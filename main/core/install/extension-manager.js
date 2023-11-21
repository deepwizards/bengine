const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');
const Module = require('../../db/models/Module');
const Service = require('../../db/models/Service');

const bengineRoot = '../../../'; // Set the root path of your Bengine project

async function installExtension(zipPath) {
    let extractedPath;

    try {
        // Unzip the file
        extractedPath = await unzipExtension(zipPath);

        // Read benfo.json
        const benfo = JSON.parse(fs.readFileSync(path.join(extractedPath, 'benfo.json'), 'utf8'));

        // Install modules
        if (benfo.modules) {
            await installModules(benfo.modules, extractedPath, benfo.extension_name);
        }

        // Install services
        if (benfo.services) {
            await installServices(benfo.services, extractedPath, benfo.extension_name);
        }

        // Clean up extracted files
        fs.rmdirSync(extractedPath, { recursive: true });

        return { services: benfo.services || [] };
    } catch (error) {
        // Clean up in case of error
        if (extractedPath) {
            fs.rmdirSync(extractedPath, { recursive: true });
        }
        throw error;
    }
}

async function uninstallExtension(extensionName) {
    const modules = await Module.find({ extension: extensionName });
    for (const module of modules) {
        fs.rmSync(path.join(bengineRoot, 'main', 'modules', module.name), { recursive: true });
    }
    await Module.deleteMany({ extension: extensionName });

    const services = await Service.find({ extension: extensionName });
    for (const service of services) {
        fs.rmSync(path.join(bengineRoot, 'services', service.name), { recursive: true });
    }
    await Service.deleteMany({ extension: extensionName });

    return { services: services.map(s => s.name) };
}

async function unzipExtension(zipPath) {
    const unzipPath = path.join(path.dirname(zipPath), path.basename(zipPath, '.zip'));
    await fs.createReadStream(zipPath).pipe(unzipper.Extract({ path: unzipPath })).promise();
    return unzipPath;
}

async function installModules(moduleNames, extractedPath, extensionName) {
    for (const moduleName of moduleNames) {
        const modulePath = path.join(extractedPath, 'modules', moduleName);
        const destPath = path.join(bengineRoot, 'main', 'modules', moduleName);
        fs.copyFileSync(modulePath, destPath);
        // Additional logic for registering the module in the database
        const module = new Module({ name: moduleName, extension: extensionName });
        await module.save();
    }
}

async function installServices(serviceNames, extractedPath, extensionName) {
    for (const serviceName of serviceNames) {
        const servicePath = path.join(extractedPath, 'services', serviceName);
        const destPath = path.join(bengineRoot, 'services', serviceName);
        fs.copyFileSync(servicePath, destPath);
        // Register the service in the database
        const service = new Service({ name: serviceName, extension: extensionName });
        await service.save();
    }
}

module.exports = {
    installExtension,
    uninstallExtension
};
