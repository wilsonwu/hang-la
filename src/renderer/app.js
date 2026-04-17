const STORAGE_KEY = 'hang-la-board-state-v2';
const PROJECT_REPOSITORY_URL = 'https://github.com/wilsonwu/hang-la';
const TOOLBAR_ICONS = {
  create: `
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 4.25v11.5"></path>
      <path d="M4.25 10h11.5"></path>
    </svg>
  `,
  edit: `
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4.25 15.75l3.1-.55 7.15-7.15-2.55-2.55L4.8 12.65l-.55 3.1z"></path>
      <path d="M10.9 4.45l2.65 2.65"></path>
    </svg>
  `,
  delete: `
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5.75 6.25h8.5"></path>
      <path d="M8 6.25V4.5h4v1.75"></path>
      <path d="M7.25 6.25l.5 9h4.5l.5-9"></path>
    </svg>
  `,
  editOff: `
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M5 5l10 10"></path>
      <path d="M15 5L5 15"></path>
    </svg>
  `,
  fullscreen: `
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M7 3.75H3.75V7"></path>
      <path d="M13 3.75h3.25V7"></path>
      <path d="M16.25 13v3.25H13"></path>
      <path d="M7 16.25H3.75V13"></path>
    </svg>
  `,
  restore: `
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M6 6.5h8.25v8.25H6z"></path>
      <path d="M9.75 3.75H16.25V10.25"></path>
      <path d="M9.75 3.75v2.5H6.5v3.25H4"></path>
    </svg>
  `,
  github: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" stroke="none" d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.75-.24.75-.54v-2.08c-3.04.66-3.68-1.3-3.68-1.3-.5-1.24-1.2-1.57-1.2-1.57-.98-.67.08-.66.08-.66 1.08.08 1.66 1.12 1.66 1.12.96 1.64 2.52 1.16 3.14.9.1-.7.38-1.16.68-1.42-2.42-.28-4.97-1.2-4.97-5.4 0-1.2.43-2.18 1.12-2.95-.12-.28-.49-1.4.1-2.92 0 0 .92-.3 3.02 1.12a10.4 10.4 0 0 1 5.5 0c2.1-1.42 3.01-1.12 3.01-1.12.6 1.52.23 2.64.11 2.92.7.77 1.12 1.75 1.12 2.95 0 4.21-2.56 5.11-5 5.38.39.34.74 1 .74 2.03v3.01c0 .3.2.65.76.54A11.25 11.25 0 0 0 12 .75Z"></path>
    </svg>
  `
};

const appBridgeApi = window.hangLaApi || createPreviewBridgeApi();

const LANES = [
  {
    id: 'pool',
    tag: '',
    title: '自定义内容栏',
    emptyText: '',
    labelColor: '#1b1b1b',
    labelTextColor: '#f4efe4',
    zoneColor: '#d8d8d8'
  },
  {
    id: 'hang',
    tag: '',
    title: '夯',
    emptyText: '',
    labelColor: '#ef3326',
    labelTextColor: '#111111',
    zoneColor: '#bfbfbf'
  },
  {
    id: 'top',
    tag: '',
    title: '顶级',
    emptyText: '',
    labelColor: '#ffd44e',
    labelTextColor: '#111111',
    zoneColor: '#bfbfbf'
  },
  {
    id: 'elite',
    tag: '',
    title: '人上人',
    emptyText: '',
    labelColor: '#fff100',
    labelTextColor: '#111111',
    zoneColor: '#bfbfbf'
  },
  {
    id: 'npc',
    tag: '',
    title: 'NPC',
    emptyText: '',
    labelColor: '#f4e9c9',
    labelTextColor: '#111111',
    zoneColor: '#bfbfbf'
  },
  {
    id: 'la',
    tag: '',
    title: '拉完了',
    emptyText: '',
    labelColor: '#f3f3f3',
    labelTextColor: '#111111',
    zoneColor: '#bfbfbf'
  }
];

const boardElement = document.getElementById('board');
const laneTemplate = document.getElementById('laneTemplate');
const itemTemplate = document.getElementById('itemTemplate');

const editorDialog = document.getElementById('editorDialog');
const editorForm = document.getElementById('editorForm');
const dialogTitle = document.getElementById('dialogTitle');
const itemTitleInput = document.getElementById('itemTitleInput');
const itemBadgeInput = document.getElementById('itemBadgeInput');
const itemNoteInput = document.getElementById('itemNoteInput');
const imagePreview = document.getElementById('imagePreview');
const pickImageButton = document.getElementById('pickImageButton');
const clearImageButton = document.getElementById('clearImageButton');
const cancelDialogButton = document.getElementById('cancelDialogButton');
const closeDialogButton = document.getElementById('closeDialogButton');
const floatingActionsElement = document.getElementById('floatingActions');

let boardState = loadState();
let draftImage = null;
let editingItemId = null;
let draggedItemId = null;
let isFullscreen = false;
let isEditMode = false;
let draggedItemElement = null;
let dragPlaceholderElement = null;
let activeDropzone = null;
let transparentDragImage = null;

renderBoard();
renderFloatingActions();
bindEvents();
void syncFullscreenState();

function bindEvents() {
  editorForm.addEventListener('submit', onSubmitItem);
  window.addEventListener('resize', syncLaneCardSizes);
  pickImageButton.addEventListener('click', onPickImage);
  clearImageButton.addEventListener('click', () => {
    draftImage = null;
    renderImagePreview();
  });
  cancelDialogButton.addEventListener('click', closeEditor);
  closeDialogButton.addEventListener('click', closeEditor);
  editorDialog.addEventListener('close', resetEditor);

  if (typeof appBridgeApi.onFullscreenChanged === 'function') {
    appBridgeApi.onFullscreenChanged((nextState) => {
      updateFullscreenState(nextState);
    });
  }
}

function createPreviewBridgeApi() {
  return {
    pickImage: async () => null,
    toggleFullscreen: async () => {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return false;
      }

      if (typeof document.documentElement.requestFullscreen === 'function') {
        await document.documentElement.requestFullscreen();
        return true;
      }

      return false;
    },
    getFullscreenState: async () => Boolean(document.fullscreenElement),
    onFullscreenChanged: (callback) => {
      const listener = () => callback(Boolean(document.fullscreenElement));
      document.addEventListener('fullscreenchange', listener);

      return () => {
        document.removeEventListener('fullscreenchange', listener);
      };
    },
    openProjectRepository: async () => {
      window.open(PROJECT_REPOSITORY_URL, '_blank', 'noopener,noreferrer');
      return true;
    }
  };
}

async function syncFullscreenState() {
  try {
    const nextState = await appBridgeApi.getFullscreenState();
    updateFullscreenState(nextState);
  } catch (error) {
    console.warn('Failed to sync fullscreen state:', error);
  }
}

function updateFullscreenState(nextState) {
  const normalizedState = Boolean(nextState);
  if (normalizedState === isFullscreen) {
    return;
  }

  isFullscreen = normalizedState;
  renderBoard();
}

function updateEditModeState(nextState) {
  const normalizedState = Boolean(nextState);
  if (normalizedState === isEditMode) {
    return;
  }

  isEditMode = normalizedState;
  renderBoard();
}

function loadState() {
  const savedValue = localStorage.getItem(STORAGE_KEY);

  if (savedValue) {
    try {
      const parsed = JSON.parse(savedValue);
      if (Array.isArray(parsed?.items)) {
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to parse saved board state:', error);
    }
  }

  return {
    items: []
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(boardState));
}

function renderBoard() {
  boardElement.replaceChildren();

  for (const lane of LANES) {
    const laneFragment = laneTemplate.content.cloneNode(true);
    const laneElement = laneFragment.querySelector('.lane');
    const laneTag = laneFragment.querySelector('.lane-tag');
    const laneTitle = laneFragment.querySelector('.lane-title');
    const laneTools = laneFragment.querySelector('.lane-tools');
    const dropzone = laneFragment.querySelector('.lane-dropzone');

    laneTag.textContent = lane.tag;
    laneTag.hidden = !lane.tag;
    laneTitle.textContent = lane.title;
    dropzone.dataset.laneId = lane.id;
    dropzone.dataset.emptyText = lane.emptyText;
    dropzone.classList.toggle('is-empty', getItemsInLane(lane.id).length === 0);
    laneElement.classList.add(lane.id === 'pool' ? 'lane--pool' : 'lane--tier');
    laneElement.style.setProperty('--lane-label-bg', lane.labelColor);
    laneElement.style.setProperty('--lane-label-color', lane.labelTextColor);
    laneElement.style.setProperty('--lane-zone-bg', lane.zoneColor);

    if (lane.id === 'pool') {
      dropzone.append(createPoolActions());
    }

    wireDropzone(dropzone);

    for (const item of getItemsInLane(lane.id)) {
      dropzone.append(createItemCard(item));
    }
    boardElement.append(laneFragment);
  }

  requestAnimationFrame(syncLaneCardSizes);
}

function getTransparentDragImage() {
  if (transparentDragImage) {
    return transparentDragImage;
  }

  transparentDragImage = document.createElement('canvas');
  transparentDragImage.width = 1;
  transparentDragImage.height = 1;
  return transparentDragImage;
}

function createDragPlaceholder(sourceElement, itemId) {
  const placeholder = sourceElement.cloneNode(true);
  placeholder.classList.remove('is-edit-mode', 'is-dragging', 'is-drag-source-hidden');
  placeholder.classList.add('drag-placeholder');
  placeholder.draggable = false;
  placeholder.dataset.itemId = itemId;
  placeholder.setAttribute('aria-hidden', 'true');

  placeholder.querySelectorAll('.item-action').forEach((actionButton) => {
    actionButton.remove();
  });

  return placeholder;
}

function setActiveDropzone(dropzone) {
  if (activeDropzone && activeDropzone !== dropzone) {
    activeDropzone.classList.remove('is-over');
  }

  activeDropzone = dropzone;

  if (activeDropzone) {
    activeDropzone.classList.add('is-over');
  }
}

function placeDragPlaceholder(dropzone, afterElement) {
  if (!dragPlaceholderElement) {
    return;
  }

  if (afterElement == null) {
    if (dragPlaceholderElement.parentElement !== dropzone || dropzone.lastElementChild !== dragPlaceholderElement) {
      dropzone.append(dragPlaceholderElement);
    }
    return;
  }

  if (afterElement === dragPlaceholderElement) {
    return;
  }

  if (dragPlaceholderElement.parentElement !== dropzone || dragPlaceholderElement.nextElementSibling !== afterElement) {
    dropzone.insertBefore(dragPlaceholderElement, afterElement);
  }
}

function clearDragState() {
  if (dragPlaceholderElement) {
    dragPlaceholderElement.remove();
    dragPlaceholderElement = null;
  }

  if (draggedItemElement) {
    draggedItemElement.classList.remove('is-dragging', 'is-drag-source-hidden');
    draggedItemElement = null;
  }

  draggedItemId = null;

  if (activeDropzone) {
    activeDropzone.classList.remove('is-over');
    activeDropzone = null;
  }
}

function syncLaneCardSizes() {
  const dropzones = boardElement.querySelectorAll('.lane-dropzone');

  for (const dropzone of dropzones) {
    const computedStyle = window.getComputedStyle(dropzone);
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
    const availableHeight = dropzone.clientHeight - paddingTop - paddingBottom;
    const safeCardSize = Math.max(Math.floor(availableHeight), 48);
    dropzone.style.setProperty('--card-size', `${safeCardSize}px`);
  }
}

function getItemsInLane(laneId) {
  return boardState.items.filter((item) => item.laneId === laneId);
}

function createPoolActions() {
  const actions = document.createElement('div');
  actions.className = 'pool-actions';
  actions.append(
    createPoolActionButton('create'),
    createPoolActionButton('edit-mode'),
    createPoolActionButton('fullscreen')
  );
  return actions;
}

function renderFloatingActions() {
  if (!floatingActionsElement) {
    return;
  }

  floatingActionsElement.replaceChildren(createActionButton('github'));
}

function createActionButton(type) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `pool-action-button pool-action-button--${type}`;

  if (type === 'github') {
    button.title = 'GitHub 仓库';
    button.setAttribute('aria-label', '打开 GitHub 仓库');
    button.innerHTML = TOOLBAR_ICONS.github;
    button.addEventListener('click', async (event) => {
      event.stopPropagation();

      try {
        await appBridgeApi.openProjectRepository();
      } catch (error) {
        console.warn('Failed to open project repository:', error);
      }
    });
    return button;
  }

  return createPoolActionButton(type);
}

function createPoolActionButton(type) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `pool-action-button pool-action-button--${type}`;

  if (type === 'create') {
    button.title = '新建';
    button.setAttribute('aria-label', '新建');
    button.innerHTML = TOOLBAR_ICONS.create;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      openEditor();
    });
    return button;
  }

  if (type === 'edit-mode') {
    const nextLabel = isEditMode ? '退出编辑模式' : '进入编辑模式';
    button.title = nextLabel;
    button.setAttribute('aria-label', nextLabel);
    button.innerHTML = isEditMode ? TOOLBAR_ICONS.editOff : TOOLBAR_ICONS.edit;
    button.classList.toggle('is-active', isEditMode);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      updateEditModeState(!isEditMode);
    });
    return button;
  }

  const nextLabel = isFullscreen ? '退出全屏' : '全屏';
  button.title = nextLabel;
  button.setAttribute('aria-label', nextLabel);
  button.innerHTML = isFullscreen ? TOOLBAR_ICONS.restore : TOOLBAR_ICONS.fullscreen;
  button.addEventListener('click', async (event) => {
    event.stopPropagation();

    try {
      const nextState = await appBridgeApi.toggleFullscreen();
      updateFullscreenState(nextState);
    } catch (error) {
      console.warn('Failed to toggle fullscreen:', error);
    }
  });

  return button;
}

function createItemCard(item) {
  const itemFragment = itemTemplate.content.cloneNode(true);
  const itemElement = itemFragment.querySelector('.rank-item');
  const editButton = itemFragment.querySelector('.item-edit');
  const deleteButton = itemFragment.querySelector('.item-delete');
  const visualElement = itemFragment.querySelector('.item-visual');
  const titleElement = itemFragment.querySelector('.item-title');
  const noteElement = itemFragment.querySelector('.item-note');

  itemElement.dataset.itemId = item.id;
  itemElement.draggable = !isEditMode;
  itemElement.classList.toggle('is-edit-mode', isEditMode);
  editButton.innerHTML = TOOLBAR_ICONS.edit;
  deleteButton.innerHTML = TOOLBAR_ICONS.delete;
  titleElement.textContent = item.title;
  noteElement.textContent = item.note || '';

  if (item.image?.dataUrl) {
    const image = document.createElement('img');
    image.src = item.image.dataUrl;
    image.alt = item.title;
    visualElement.append(image);
  } else {
    const badge = document.createElement('span');
    badge.className = 'visual-badge';
    badge.textContent = item.badge?.trim() || item.title.slice(0, 2);
    visualElement.append(badge);
  }

  editButton.addEventListener('click', (event) => {
    event.stopPropagation();
    openEditor(item.id);
  });

  deleteButton.addEventListener('click', (event) => {
    event.stopPropagation();
    confirmDeleteItem(item.id);
  });

  itemElement.addEventListener('click', (event) => {
    if (!isEditMode) {
      return;
    }

    if (event.target.closest('.item-action')) {
      return;
    }

    openEditor(item.id);
  });

  itemElement.addEventListener('dragstart', (event) => {
    if (isEditMode) {
      event.preventDefault();
      return;
    }

    draggedItemId = item.id;
    draggedItemElement = itemElement;
    dragPlaceholderElement = createDragPlaceholder(itemElement, item.id);
    itemElement.classList.add('is-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.id);
    event.dataTransfer.setDragImage(getTransparentDragImage(), 0, 0);

    requestAnimationFrame(() => {
      if (draggedItemElement === itemElement) {
        itemElement.classList.add('is-drag-source-hidden');
      }
    });
  });

  itemElement.addEventListener('dragend', () => {
    clearDragState();
  });

  return itemElement;
}

function wireDropzone(dropzone) {
  dropzone.addEventListener('dragover', (event) => {
    if (isEditMode) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setActiveDropzone(dropzone);

    const afterElement = getDragAfterElement(dropzone, event.clientX);
    if (!dragPlaceholderElement) {
      return;
    }

    placeDragPlaceholder(dropzone, afterElement);
  });

  dropzone.addEventListener('drop', (event) => {
    if (isEditMode) {
      return;
    }

    event.preventDefault();
    const itemId = event.dataTransfer.getData('text/plain') || draggedItemId;
    const nextLaneId = dropzone.dataset.laneId;

    if (!itemId || !nextLaneId) {
      return;
    }

    const orderedIds = Array.from(dropzone.children)
      .filter((element) => element.dataset?.itemId && !element.classList.contains('is-drag-source-hidden'))
      .map((element) => element.dataset.itemId);

    clearDragState();
    moveItem(itemId, nextLaneId, orderedIds);
  });
}

function getDragAfterElement(dropzone, pointerX) {
  const candidateElements = [
    ...dropzone.querySelectorAll('.rank-item:not(.is-dragging):not(.is-drag-source-hidden):not(.drag-placeholder)')
  ];

  return candidateElements.reduce(
    (closest, element) => {
      const box = element.getBoundingClientRect();
      const offset = pointerX - box.left - box.width / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset, element };
      }

      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

function moveItem(itemId, nextLaneId, orderedIdsInLane) {
  const targetItem = boardState.items.find((item) => item.id === itemId);
  if (!targetItem) {
    return;
  }

  targetItem.laneId = nextLaneId;

  const laneItems = orderedIdsInLane
    .map((orderedId) => boardState.items.find((item) => item.id === orderedId))
    .filter(Boolean);

  const otherItems = boardState.items.filter((item) => item.laneId !== nextLaneId);
  boardState.items = [...otherItems, ...laneItems];
  saveState();
  renderBoard();
}

function openEditor(itemId = null) {
  editingItemId = itemId;
  const targetItem = itemId ? boardState.items.find((item) => item.id === itemId) : null;

  dialogTitle.textContent = targetItem ? '编辑排序项' : '新增排序项';
  itemTitleInput.value = targetItem?.title || '';
  itemBadgeInput.value = targetItem?.badge || '';
  itemNoteInput.value = targetItem?.note || '';
  draftImage = targetItem?.image || null;
  renderImagePreview();

  if (typeof editorDialog.showModal === 'function') {
    editorDialog.showModal();
  }
}

function closeEditor() {
  editorDialog.close();
}

function resetEditor() {
  editorForm.reset();
  editingItemId = null;
  draftImage = null;
  renderImagePreview();
}

function renderImagePreview() {
  imagePreview.replaceChildren();

  if (draftImage?.dataUrl) {
    const image = document.createElement('img');
    image.src = draftImage.dataUrl;
    image.alt = draftImage.name || 'selected image';
    imagePreview.append(image);
    return;
  }

  const placeholder = document.createElement('span');
  placeholder.className = 'placeholder-text';
  placeholder.textContent = '未选择图片';
  imagePreview.append(placeholder);
}

async function onPickImage() {
  const selectedImage = await appBridgeApi.pickImage();
  if (!selectedImage) {
    return;
  }

  draftImage = selectedImage;
  renderImagePreview();
}

function onSubmitItem(event) {
  event.preventDefault();

  const title = itemTitleInput.value.trim();
  const badge = itemBadgeInput.value.trim();
  const note = itemNoteInput.value.trim();

  if (!title) {
    itemTitleInput.focus();
    return;
  }

  if (editingItemId) {
    const existingItem = boardState.items.find((item) => item.id === editingItemId);
    if (!existingItem) {
      return;
    }

    existingItem.title = title;
    existingItem.badge = badge;
    existingItem.note = note;
    existingItem.image = draftImage;
  } else {
    boardState.items.unshift({
      id: crypto.randomUUID(),
      title,
      badge,
      note,
      image: draftImage,
      laneId: 'pool'
    });
  }

  saveState();
  renderBoard();
  closeEditor();
}

function deleteItem(itemId) {
  boardState.items = boardState.items.filter((item) => item.id !== itemId);
  saveState();
  renderBoard();
}

function confirmDeleteItem(itemId) {
  const targetItem = boardState.items.find((item) => item.id === itemId);
  if (!targetItem) {
    return;
  }

  const confirmed = window.confirm(`确定删除“${targetItem.title}”吗？此操作无法撤销。`);
  if (!confirmed) {
    return;
  }

  deleteItem(itemId);
}
