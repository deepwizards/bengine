const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const unzipper = require('unzipper');
const Module = require('../../db/models/Module');
const Service = require('../../db/models/Service');
const e = require('express');
const { set } = require('mongoose');

const bengineRoot = '../../../'; // Set the root path of your Bengine project

async function installExtension(zipPath) {
    console.log(`Installing extension from ${zipPath}`);
    let extractedPath;

    try {
        console.log(process.cwd());
        extractedPath = await unzipExtension(zipPath);
        console.log(`Extracted extension to ${extractedPath}`);
        const benfoPath = path.join(extractedPath, 'benfo.json');
        console.log(`Reading benfo.json from ${benfoPath}`);
        
        if (!fsSync.existsSync(benfoPath)) {
            throw new Error('benfo.json not found in the extension package');
        }

        const benfo = JSON.parse(await fs.readFile(benfoPath, 'utf8'));
        console.log(benfo)
        if (benfo.modules) {
            await installModules(benfo.modules, extractedPath, benfo.extension_name);
        }

        if (benfo.services) {
            await installServices(benfo.services, extractedPath, benfo.extension_name);
        }

        await fs.rm(extractedPath, { recursive: true, force: true });
    } catch (error) {
        console.error('Error installing extension:', error);
        if (extractedPath) {
            await fs.rm(extractedPath, { recursive: true, force: true }).catch(err => console.error('Error cleaning up:', err));
        }
        throw error;
    }
}

async function uninstallExtension(extensionName) {
    try {
        const moduleCount = await Module.countDocuments({ extension: extensionName });
        const serviceCount = await Service.countDocuments({ extension: extensionName });

        if (moduleCount === 0 && serviceCount === 0) {
            console.log(`No modules or services found for extension: ${extensionName}`);
            return { message: `No modules or services found for extension: ${extensionName}` };
        }

        const modules = await Module.find({ extension: extensionName });
        for (const module of modules) {
            const modulePath = path.join(bengineRoot, 'main', 'modules', module.name);
            if (fsSync.existsSync(modulePath)) {
                await fs.rm(modulePath, { recursive: true, force: true });
            }
        }
        await Module.deleteMany({ extension: extensionName });

        const services = await Service.find({ extension: extensionName });
        for (const service of services) {
            const servicePath = path.join(bengineRoot, 'services', service.name);
            if (fsSync.existsSync(servicePath)) {
                await fs.rm(servicePath, { recursive: true, force: true });
            }
        }
        await Service.deleteMany({ extension: extensionName });

        return { services: services.map(s => s.name) };
    } catch (error) {
        console.error('Error uninstalling extension:', error);
        throw error;
    }
}

// async function unzipExtension(zipPath) {
//     console.log(zipPath)
//     try {
//         extractedPath = 'ext-uploads/_extracted/' + path.basename(zipPath, '.zip');
//         console.log(extractedPath);
//         await fsSync.createReadStream(zipPath)
//             .pipe(unzipper.Extract({ path: extractedPath }));
//         return extractedPath;
//     } catch (error) {
//         console.error('Error unzipping extension:', error);
//         throw error;
//     }
// }

const util = require('util');
const fsExists = util.promisify(fsSync.exists);

async function unzipExtension(zipPath) {
    console.log(zipPath);
    try {
        const extractedPath = 'ext-uploads/_extracted/' + path.basename(zipPath, '.zip');
        console.log(extractedPath);

        await new Promise((resolve, reject) => {
            fsSync.createReadStream(zipPath)
                .pipe(unzipper.Extract({ path: extractedPath }))
                .on('error', reject)
                .on('close', resolve);
        });

        const benfoExists = await fsExists(path.join(extractedPath, 'benfo.json'));
        if (!benfoExists) {
            throw new Error('benfo.json not found in the extension package');
        }

        return extractedPath;
    } catch (error) {
        console.error('Error unzipping extension:', error);
        throw error;
    }
}

async function installModules(moduleNames, extractedPath, extensionName) {
    try {
        const moduleDirPath = path.join(extractedPath, 'modules');
        if (!fsSync.existsSync(moduleDirPath)) {
            throw new Error('Modules directory not found in the extension package');
        }

        for (const moduleName of moduleNames) {
            const modulePath = path.join(moduleDirPath, moduleName);
            if (!fsSync.existsSync(modulePath)) {
                throw new Error(`Module ${moduleName} not found in the extension package`);
            }

            const destPath = path.join(bengineRoot, 'main', 'modules', moduleName);
            await fs.cp(modulePath, destPath, { recursive: true });
            const module = new Module({ name: moduleName, extension: extensionName });
            await module.save();
        }
    } catch (error) {
        console.error('Error installing modules:', error);
        throw error;
    }
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
            const service = new Service({ name: serviceName, extension: extensionName });
            await service.save();
        }
    } catch (error) {
        console.error('Error installing services:', error);
        throw error;
    }
}

module.exports = {
    installExtension,
    uninstallExtension
};
