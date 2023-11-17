const router = require('express').Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');
const { exec } = require('child_process');
const Service = require('../../db/models/Service.js');
const upload = multer({ dest: 'uploads/' });

router.get('/', async (req, res) => {
    let filter = {};
    if (req.query.type) {
        filter.type = req.query.type;
    }
    const services = await Service.find(filter);
    const types = await Service.find().distinct('type');
    res.render('service/views/index', {
        title: 'service',
        services,
        types,
        query: req.query
    });
});

router.get('/edit/:id', async (req, res) => {
    const service = await Service.findById(req.params.id);
    res.render('service/views/edit', {
        title: 'Edit Service',
        service
    });
});

router.post('/edit/:id', async (req, res) => {
    await Service.findByIdAndUpdate(req.params.id, req.body);
    res.redirect('/');
});

router.get('/new', async (req, res) => {
    res.render('service/views/new', {
        title: 'Add New Service'
    });
});

router.post('/new', async (req, res) => {
    const service = new Service(req.body);
    await service.save();
    res.redirect('/service');
});

router.post('/upload', upload.single('file'), async (req, res) => {
    const tempPath = req.file.path;
    fs.createReadStream(tempPath)
        .pipe(unzipper.Parse())
        .on('entry', async entry => {
            const filePath = entry.path;
            const [rootDir, subDir, ...restPath] = filePath.split('/');
            let targetRootDir;

            if (rootDir === 'services') {
                targetRootDir = '/services';
            } else if (rootDir === 'plugins') {
                targetRootDir = '/modules';
            } else {
                entry.autodrain();
                return;
            }
            const targetPath = path.join(__dirname, `${targetRootDir}/${subDir}/${restPath.join('/')}`);
            if (filePath.endsWith('benfo.json')) {
                const benfoContent = await entry.buffer();
                const benfoJSON = JSON.parse(benfoContent.toString());
                if (rootDir === 'services' || rootDir === 'plugins') {
                    const service = new Service(benfoJSON);
                    await service.save();
                    if (rootDir === 'plugins' && Array.isArray(benfoJSON.dependencies)) {
                        const missingDeps = benfoJSON.dependencies.filter(dep => !packageJson.dependencies[dep]);
                        if (missingDeps.length > 0) {
                            exec(`npm i --save ${missingDeps.join(' ')}`);
                        }
                    }
                }
            }
            if (!fs.existsSync(path.dirname(targetPath))) {
                fs.mkdirSync(path.dirname(targetPath), { recursive: true });
            }
            entry.pipe(fs.createWriteStream(targetPath));
        })
        .on('close', () => {
            fs.unlinkSync(tempPath);
            res.status(200).send('Upload and installation successful');
        });
});

module.exports = router;
