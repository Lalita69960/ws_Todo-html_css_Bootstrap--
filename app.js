// app.js - compatible with the HTML above
(() => {
  const STORAGE_KEY = 'myworkshop_todos_v1';

  // helpers
  const readTodos = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e){ return []; } };
  const writeTodos = (arr) => localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  const genId = () => 't-' + Date.now() + '-' + Math.floor(Math.random()*1000);

  // elements
  const titleInput = document.getElementById('title');
  const descInput = document.getElementById('exampleFormControlDiscription1');
  const dateInput = document.getElementById('datepicker');
  const assignedSelect = document.getElementById('assigned_to');
  const fileInput = document.getElementById('inputGroupFile04');
  const clearFileBtn = document.getElementById('clearFileBtn');
  const addBtn = document.getElementById('addTodoButton');
  const todoTitleSmall = document.getElementById('todoTitle');

  const todoList = document.getElementById('todoList');
  const toggleListBtn = document.getElementById('toggleList');
  const detailCard = document.getElementById('todoDetailCard');
  const detailTitle = document.getElementById('detailTitle');
  const detailDesc = document.getElementById('detailDesc');
  const detailDue = document.getElementById('detailDue');
  const detailAssigned = document.getElementById('detailAssigned');
  const detailAttachments = document.getElementById('detailAttachments');
  const detailEdit = document.getElementById('detailEdit');
  const detailDelete = document.getElementById('detailDelete');

  let todos = readTodos();
  let selectedId = null;

  // util: read file as dataURL
  function fileToDataUrl(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = () => rej(fr.error);
      fr.readAsDataURL(file);
    });
  }

  // escape small helper
  function esc(s){ if(!s) return ''; return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }

  // render list (keep first header li)
  function renderList() {
    // keep header li
    const header = todoList.querySelector('li');
    todoList.innerHTML = '';
    if (header) todoList.appendChild(header);

    if (!todos.length) {
      const li = document.createElement('li');
      li.className = 'list-group-item text-muted';
      li.textContent = 'No todos yet.';
      todoList.appendChild(li);
      return;
    }

    todos.forEach(t => {
      const li = document.createElement('li');
      li.className = 'list-group-item';
      li.dataset.id = t.id;
      li.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h6 class="mb-1">${esc(t.title || '(No title)')}</h6>
            <p class="mb-1 small text-muted">${esc((t.description||'').slice(0,120))}</p>
            <div class="d-flex align-items-center gap-2">
              <p class="mb-0"><strong>Due:</strong> ${esc(t.dueDate || '-')}</p>
              <span class="badge bg-info text-dark"><i class="bi bi-person-circle me-1"></i> ${esc(t.assigned || '-')}</span>
              <span class="badge bg-secondary"><i class="bi bi-paperclip me-1"></i> ${t.attachment ? '1 Attachment' : '0'}</span>
            </div>
          </div>
          <div class="text-end">
            <p class="small text-muted mb-1">Created: ${new Date(t.createdAt).toLocaleString()}</p>
            <div>
              <i class="bi bi-pencil me-2 action-edit clickable" title="Edit"></i>
              <i class="bi bi-trash me-2 action-delete clickable" title="Delete"></i>
              <i class="bi bi-three-dots-vertical"></i>
            </div>
          </div>
        </div>
      `;

      // item click -> show details (ignore clicks on edit/delete)
      li.addEventListener('click', (e) => {
        if (e.target.closest('.action-edit') || e.target.closest('.action-delete')) return;
        showDetails(t.id);
      });

      // edit icon
      li.querySelector('.action-edit').addEventListener('click', (ev) => {
        ev.stopPropagation();
        editTodoFlow(t.id);
      });

      // delete icon
      li.querySelector('.action-delete').addEventListener('click', (ev) => {
        ev.stopPropagation();
        deleteTodoConfirm(t.id);
      });

      todoList.appendChild(li);
    });
  }

  // show details
  function showDetails(id) {
    const t = todos.find(x => x.id === id);
    if (!t) return;
    selectedId = id;
    detailCard.classList.remove('d-none');
    detailTitle.textContent = t.title || '(No title)';
    detailDesc.textContent = t.description || '';
    detailDue.textContent = t.dueDate || '-';
    detailAssigned.textContent = t.assigned || '-';

    detailAttachments.innerHTML = '';
    if (t.attachment && t.attachment.dataUrl) {
      const name = document.createElement('div');
      name.textContent = 'Attachment: ' + (t.attachment.name || '');
      detailAttachments.appendChild(name);
      if (t.attachment.type && t.attachment.type.startsWith('image')) {
        const img = document.createElement('img');
        img.src = t.attachment.dataUrl;
        img.className = 'attachment-thumb';
        detailAttachments.appendChild(img);
      } else {
        const a = document.createElement('a');
        a.href = t.attachment.dataUrl;
        a.target = '_blank';
        a.textContent = 'Open attachment';
        detailAttachments.appendChild(a);
      }
    }

    // wire edit/delete buttons
    detailEdit.onclick = () => editTodoFlow(id);
    detailDelete.onclick = () => deleteTodoConfirm(id);
  }

  // delete
  function deleteTodoConfirm(id) {
    if (!confirm('Delete this to-do?')) return;
    todos = todos.filter(x => x.id !== id);
    writeTodos(todos);
    renderList();
    detailCard.classList.add('d-none');
    selectedId = null;
  }

  // edit flow: simple prompts for now (keeps html small). Can replace with modal later.
  function editTodoFlow(id) {
    const idx = todos.findIndex(x => x.id === id);
    if (idx === -1) return;
    const t = todos[idx];

    const newTitle = prompt('Edit title:', t.title || '');
    if (newTitle === null) return;
    const newDesc = prompt('Edit description:', t.description || '');
    if (newDesc === null) return;
    const newDue = prompt('Edit due date (dd/mm/yyyy or blank):', t.dueDate || '');
    if (newDue === null) return;
    const newAssigned = prompt('Edit assigned person (name) or blank:', t.assigned || '');
    if (newAssigned === null) return;

    const replaceFile = confirm('Replace attachment? OK = use file input below then click "Save Edit" prompt. Cancel = keep existing.');
    if (replaceFile) {
      alert('Please select a file in the Attachments input and then press OK on the next dialog to save.');
      // create temporary save button behavior
      createTempSaveButton(id, { newTitle, newDesc, newDue, newAssigned });
      return;
    } else {
      todos[idx].title = newTitle.trim();
      todos[idx].description = newDesc.trim();
      todos[idx].dueDate = newDue.trim();
      todos[idx].assigned = newAssigned.trim();
      writeTodos(todos);
      renderList();
      showDetails(id);
      alert('Saved.');
    }
  }

  function createTempSaveButton(id, pending) {
    // remove old temp btn
    const old = document.getElementById('tempSaveEditBtn');
    if (old) old.remove();

    const btn = document.createElement('button');
    btn.id = 'tempSaveEditBtn';
    btn.className = 'btn btn-sm btn-primary mt-2';
    btn.textContent = 'Save Edit (use file input above)';
    // append below file input
    const fileGroup = fileInput ? fileInput.parentNode : document.body;
    fileGroup.appendChild(btn);

    btn.onclick = async () => {
      const idx = todos.findIndex(x => x.id === id);
      if (idx === -1) return;
      const f = fileInput && fileInput.files && fileInput.files[0];
      if (f) {
        try {
          const dataUrl = await fileToDataUrl(f);
          todos[idx].attachment = { name: f.name, type: f.type, dataUrl };
        } catch(err) {
          alert('Failed to read file: ' + err);
        }
      }
      todos[idx].title = pending.newTitle.trim();
      todos[idx].description = pending.newDesc.trim();
      todos[idx].dueDate = pending.newDue.trim();
      todos[idx].assigned = pending.newAssigned.trim();
      writeTodos(todos);
      btn.remove();
      if (fileInput) fileInput.value = '';
      renderList();
      showDetails(id);
      alert('Saved changes.');
    };
  }

  // add todo
  addBtn.addEventListener('click', async () => {
    const titleVal = (todoTitleSmall && todoTitleSmall.value) ? todoTitleSmall.value.trim() : (titleInput ? titleInput.value.trim() : '');
    const descVal = descInput ? descInput.value.trim() : '';
    const dateVal = dateInput ? dateInput.value.trim() : '';
    const assignedVal = assignedSelect ? assignedSelect.value : '';
    const f = fileInput && fileInput.files && fileInput.files[0];

    if (!titleVal) {
      alert('Please enter a title (use Title or Short Title).');
      return;
    }

    const obj = {
      id: genId(),
      title: titleVal,
      description: descVal,
      dueDate: dateVal,
      assigned: assignedVal || '',
      createdAt: new Date().toISOString(),
      attachment: null
    };

    if (f) {
      try {
        const dataUrl = await fileToDataUrl(f);
        obj.attachment = { name: f.name, type: f.type, dataUrl };
      } catch(err) {
        console.error('file read error', err);
      }
    }

    todos.unshift(obj);
    writeTodos(todos);

    // clear fields
    if (todoTitleSmall) todoTitleSmall.value = '';
    if (titleInput) titleInput.value = '';
    if (descInput) descInput.value = '';
    if (dateInput && dateInput._flatpickr) dateInput._flatpickr.clear();
    if (assignedSelect) assignedSelect.selectedIndex = 0;
    if (fileInput) fileInput.value = '';

    // reload to match your requested UX (data persisted in localStorage)
    setTimeout(() => location.reload(), 120);
  });

  // clear file btn
  if (clearFileBtn) clearFileBtn.addEventListener('click', () => { if (fileInput) fileInput.value = ''; });

  // toggle list visibility
  if (toggleListBtn) toggleListBtn.addEventListener('click', () => {
    // toggle all list items except header
    const items = Array.from(todoList.querySelectorAll('li')).slice(1);
    const anyHidden = items.some(it => it.classList.contains('d-none'));
    items.forEach(it => it.classList.toggle('d-none', !anyHidden ? true : false));
  });

  // initialise
  function init() {
    renderList();
  }
  init();
})();
