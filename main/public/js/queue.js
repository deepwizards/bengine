const socket = io();
socket.on('queue', ({ jobs, jobRuns, flows, outputs }) => {

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const truncateId = (id) => {
        return id.length > 8 ? '...' + id.slice(-8) : id;
    };

    const getBadgeClass = (status) => {
        const statusClassMap = {
            active: 'primary',
            blocked: 'danger',
            open: 'primary',
            complete: 'success',
            pending: 'warning'
        };
        return statusClassMap[status] || 'secondary';
    };
    const entities = { jobs, jobRuns, flows, outputs };

    for (let entityName in entities) {
        const entityList = entities[entityName];
        const table = document.getElementById(`${entityName}-table`).tBodies[0];
        table.innerHTML = '';

        entityList.forEach(entity => {
            const row = table.insertRow();
            
            switch (entityName) {
                case 'jobs':
                    row.insertCell().textContent = entity.name;
                    row.insertCell().innerHTML = `<span class="badge badge-${getBadgeClass(entity.status)}">${entity.status}</span>`;
                    row.insertCell().innerHTML = `<span class="btn btn-primary">${entity.loops - entity.loop_counter}</span>`;
                    row.insertCell().innerHTML = `<a href="job/${entity._id}">${truncateId(entity._id)}</a>`;
                    row.insertCell().textContent = formatDate(entity.updated_at);
                    break;

                case 'flows':
                    row.insertCell().textContent = entity.name;
                    row.insertCell().innerHTML = `<a href="flow/${entity._id}">${truncateId(entity._id)}</a>`;
                    row.insertCell().innerHTML = `<span class="badge badge-${getBadgeClass(entity.status)}">${entity.status}</span>`;
                    row.insertCell().innerHTML = `<span class="btn btn-primary">${entity.loops - entity.loop_counter}</span>`;
                    row.insertCell().textContent = formatDate(entity.updated_at);
                    break;

                case 'outputs':
                    row.insertCell().innerHTML = `<a href="output/${entity._id}">${truncateId(entity._id)}</a>`;
                    row.insertCell().innerHTML = `<a href="job/${entity.job_id}">${truncateId(entity.job_id)}</a>`;
                    row.insertCell().textContent = formatDate(entity.created_at);
                    break;

                case 'jobRuns':
                    row.insertCell().textContent = formatDate(entity.updated_at);
                    row.insertCell().innerHTML = `<b>${truncateId(entity._id)}</b>`;
                    break;
            }
        });
    }
});

socket.on('apis', (apis) => {
    const apisTable = document.getElementById('apis-table').tBodies[0];
    apisTable.innerHTML = '';
    apis.forEach(api => {
        const row = apisTable.insertRow();
        row.insertCell().textContent = api.name;
        const statusCell = row.insertCell();
        statusCell.classList.add(api.status);
        statusCell.innerHTML = api.status === 'up'
            ? '<i class="fas fa-check-circle text-success"></i>'
            : '<i class="fas fa-times-circle text-danger"></i>';
    });
});

socket.emit('requestUpdates');
