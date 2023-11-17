const socketIO = require('socket.io');
const axios = require('axios');
const Job = require('../db/models/Job.js');
const Flow = require('../db/models/Flow.js');
const Project = require('../db/models/Project.js');
const Output = require('../db/models/Output.js');
const JobRun = require('../db/models/Log.js');
const Service = require('../db/models/Service.js');

function initializeSocket(server) {
	const io = socketIO(server, {
		cors: {
			origin: 'http://localhost:1337',
			methods: ['GET', 'POST'],
		},
	});
	const UPDATE_INTERVAL = 5000;
	const checkAPIStatuses = async () => {
		console.log('checking API statuses')
		let services;
		try {
			services = await Service.find({});
		} catch (error) {
			console.error('Error fetching services from database:', error);
			return [];
		}
		return await Promise.all(
			services.map(async (service) => {
				let status = 'down';
				// const env = process.env.NODE_ENV || 'development';
				// const url =
				//   env === 'development'
				//     ? `http://${service.api}:${service.port}/status`
				//     : `http://localhost:${service.port}/status`;
				const url = `http://localhost:${service.port}/status`;
				try {
					const response = await axios.get(url);
					if (response.status === 200) {
						status = 'up';
					}
				} catch (error) {
					console.error(`Error: ${error}`);
				}
				return { name: service.name, status };
			})
		);
	};
	const emitAPIStatuses = async (socket) => {
		const apis = await checkAPIStatuses();
		socket.emit('apis', apis);
	};
	const emitDashboardData = async (socket) => {
		const jobs = await Job.find({ status: { $ne: 'inactive' } }).sort({ updated_at: -1 });
		const flows = await Flow.find({ status: { $ne: 'inactive' } }).sort({ updated_at: -1 });
		const jobIds = jobs.map(job => job._id);
		const outputs = await Output.find({ job_id: { $in: jobIds } }).sort({ updated_at: -1 });
		const jobRuns = await JobRun.find({}).sort({ updated_at: -1 });
		socket.emit('queue', { jobs, jobRuns, flows, outputs });
	};
	io.on('connection', (socket) => {
		socket.on('requestUpdates', async () => {
			await emitDashboardData(socket);
			await emitAPIStatuses(socket);
		});
		let updateInterval = setInterval(async () => {
			await emitDashboardData(socket);
			await emitAPIStatuses(socket);
		}, UPDATE_INTERVAL);
		socket.on('disconnect', () => {
			clearInterval(updateInterval);
		});
	});
}

module.exports = initializeSocket;
