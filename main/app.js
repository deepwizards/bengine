const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const lusca = require('lusca');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const flash = require('connect-flash');
const initializeSocket = require('./socket/queue.js');
const http = require('http');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const passport = require('passport');
const isProduction = process.env.NODE_ENV === 'production';
require('./db/mongoose');

async function loadModules(dirName, app) {
	const modulesPath = path.join(__dirname, dirName);
	const moduleDirs = await fs.readdir(modulesPath);
	const isDirectoryTasks = moduleDirs.map(async (dir) => {
		const stat = await fs.stat(path.join(modulesPath, dir));
		return stat.isDirectory() ? dir : null;
	});
	const directories = (await Promise.all(isDirectoryTasks)).filter(Boolean);
	return await Promise.all(directories.map(async (dir) => {
		delete require.cache[require.resolve(path.join(modulesPath, dir, 'index'))];
		const moduleRoutes = require(path.join(modulesPath, dir, 'index'));
		const staticPath = path.join(modulesPath, dir, 'assets');
		try {
			await fs.access(staticPath);
			app.use(`/${dir}/assets`, express.static(staticPath));
		} catch {}
		const subroutes = moduleRoutes.stack
			.filter((layer) => layer.route && layer.route.methods && layer.route.methods.get)
			.map((layer) => {
				const path = layer.route.path;
				const url = `/${dir}${path}`;
				return path.startsWith('/api/') ? null : { name: path, url };
			})
			.filter(Boolean);
		return {
			name: dir,
			routes: moduleRoutes,
			subroutes
		};
	}));
}

async function setupMiddleware(app, coreModules, extensionModules) {
	app.use((req, res, next) => {
		if ('user' in req) {
			res.locals.user = req.user;
		}
		next();
	});
	const coreModuleNames = coreModules.map((module) => module.name);
	app.use((req, res, next) => {
		res.locals.modules = extensionModules.filter((module) => !coreModuleNames.includes(module.name));
		next();
	});
	coreModules.forEach((module) => {
		app.use(`/${module.name}`, module.routes);
	});
	extensionModules.forEach((module) => {
		app.use(`/${module.name}`, module.routes);
	});
}

async function init() {
	try {
		const app = express();
		// app.use(helmet());
		app.use(morgan(isProduction ? 'combined' : 'combined')); 
		app.use(compression()); 
		app.use(cors({
				origins: ['http://localhost:1337'],
				methods: ['GET', 'POST'],
				credentials: true
		}));
		app.use(cookieParser());
		app.use(session({
				store: new MongoStore({ client: mongoose.connection.getClient() }),
				secret: process.env.SESSION_SECRET || 'whoooocareeeeessswhattttt',
				resave: false,
				saveUninitialized: true,
				cookie: { secure: isProduction, httpOnly: true, maxAge: 3600000 } 
		}));
		// app.use(lusca.csrf()); 
		// app.use(lusca.xframe('SAMEORIGIN'));
		// app.use(lusca.hsts({ maxAge: isProduction ? 31536000 : 0 })); 
		// app.use(lusca.xssProtection(true));
		const server = http.Server(app);
		app.disable('x-powered-by');
		app.use(passport.initialize());
		app.use(passport.session());
		app.use(flash());
		app.use((req, res, next) => {
			res.locals.messages = req.flash();
			next();
		});
		const coreModules = await loadModules('core', app);
		const extensionModules = await loadModules('modules', app);
		if (!coreModules.length) {
			throw new Error('Core modules failed to load. Halting server.');
		}
		await setupMiddleware(app, coreModules, extensionModules);
		initializeSocket(server);
		app.use('/static', express.static('public'));
		app.use('/static', express.static(__dirname + '/node_modules/socket.io/client-dist'));
		app.use('/static', express.static(__dirname + '/node_modules/@fortawesome/fontawesome-free/'));
		app.use('/static', express.static(__dirname + '/node_modules/jquery/dist'));
		app.use('/static', express.static(__dirname + '/node_modules/popper.js/dist'));
		app.use('/static', express.static(__dirname + '/node_modules/bootstrap/dist'));
		app.use('/static', express.static(__dirname + '/node_modules/datatables.net/js'));
		app.use('/static', express.static(__dirname + '/node_modules/chart.js/dist'));
		app.set('views', [ path.join(__dirname, 'core'), path.join(__dirname, 'modules') ]);
		app.set('view engine', 'pug');
		app.get('/', (req, res) => {
			res.render('admin/views/login');
		});
		app.get('/status', (req, res) => {
			res.status(200).send('OK');
		});
		// TODO render nice 404 page
		app.use((req, res, next) => {
			res.status(404).send("Sorry can't find that!")
		});
		app.use((err, req, res, next) => {
			console.error(err.stack);
			// TODO: fix flash messages
			// req.flash('error', err.message);
			res.status(500).send('Something broke!');
		});
		const PORT = process.env.PORT || 1337;
		server.listen(PORT, () => {
			console.log(`Listening on *:${PORT}`);
		});
	} catch (err) {
		console.error('Server initialization failed:', err);
		process.exit(1);
	}
}

init().catch((err) => {
	console.error('Unhandled Promise Rejection:', err);
	process.exit(1);
});
