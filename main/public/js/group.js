function loadGroupList(model, listId) {
    console.log(`loadGroupList called for ${model}`);
    console.log(`listId: ${listId}`)

    fetch('/group/all')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(groups => {
            const modelGroups = groups.filter(group => group.type === model);
            const groupListUl = document.querySelector(`#${listId}`);
            console.log(groupListUl)
            const noGroupMessageP = document.querySelector('#noGroupMessage');

            const allItemsLi = document.createElement('li');
            allItemsLi.classList.add('list-group-item', 'bg-light', 'py-1');
            allItemsLi.innerHTML = `<h6 class="ml-2 btn btn-primary btn-sm" style="cursor: pointer!important;" onclick="location.reload()"><i class="fas fa-folder"></i>&nbsp;ALL ${model.toUpperCase()}S</h6>`;
            // allItemsLi.addEventListener('click', function() {
            //     loadAllItems(model);
            // });
            groupListUl.appendChild(allItemsLi);

            if (modelGroups.length === 0) {
                console.log(`No ${model} groups found`);
                noGroupMessageP.style.display = 'block';
            } else {
                console.log(`Populating ${model} group list`);
                noGroupMessageP.style.display = 'none';
                modelGroups.forEach(group => {
                    const li = document.createElement('li');
                    li.classList.add('list-group-item', 'bg-light', 'py-1');
                    li.innerHTML = `<h6 class="ml-2" style="cursor: pointer!important;"><i class="fas fa-folder"></i>&nbsp;${group.name}</h6>`;
                    li.addEventListener('click', function() {
                        loadItemsByGroupId(model, group._id);
                    });
                    groupListUl.appendChild(li);
                });
            }
        })
        .catch(error => {
            console.error('Error fetching groups:', error);
        });
}

function renderFilteredItems(model, group) {
    const renderFuncName = `renderFiltered${model}`;
    if (typeof window[renderFuncName] === 'function') {
      window[renderFuncName](group);
    } else {
      console.error(`No rendering function found for ${model}`);
    }
  }


  function loadItemsByGroupId(model, groupId) {
    fetch(`/group/${groupId}`)
        .then(response => response.json())
        .then(group => {
            renderFilteredItems(model, group);
        }).catch(error => console.error('Error:', error));
}
function loadItemsByGroupId(model, groupId) {
    fetch(`/group/${groupId}`)
        .then(response => response.json())
        .then(group => {
            const items = group.list;
            const dataTableBody = document.querySelector('#dataTable tbody');
            dataTableBody.innerHTML = '';
            items.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = renderItemRow(model, item);
                dataTableBody.appendChild(row);
            });
        })
        .catch(error => console.error('Error:', error));
}

function loadAllItems(model) {
    const dataTable = document.querySelector('#dataTable');
    const items = JSON.parse(dataTable.dataset.items);
    const dataTableBody = document.querySelector('#dataTable tbody');
    
    // Clear the dataTableBody before appending new rows
    dataTableBody.innerHTML = '';
  
    for (const item of items) {
      const row = document.createElement('tr');
      row.innerHTML = renderItemRow(model, item);
      dataTableBody.appendChild(row);
    }
  }

function renderItemRow(model, item) {
    // Define this function in each of your module's JS files to handle the specific rendering of the table row.
    // Example: renderItemRowProject(item) { ... }
    return window[`renderItemRow${model}`](item);
}

function statusBadge(status) {
    const badgeClass = `badge-${status}`;
    let iconClass;

    switch (status) {
        case 'inactive':
        case 'blocked':
            iconClass = 'fa-ban';
            break;
        case 'active':
        case 'complete':
            iconClass = 'fa-check-circle';
            break;
        case 'pending':
            iconClass = 'fa-exclamation-circle';
            break;
        case 'open':
            iconClass = 'fa-circle';
            break;
    }
    return `<span class="badge badge-pill ${badgeClass}"><b><i class="fa ${iconClass}"></i>&nbsp;${status}</b></span>`;
}

function initGroupModule(model, listId, renderItemRowFunc) {
    window[`renderItemRow${model}`] = renderItemRowFunc;
    loadGroupList(model, listId);
}

if (typeof window.groupModuleLoaded === 'function') {
    window.groupModuleLoaded();
}
