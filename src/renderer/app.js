const STORAGE_KEY = 'hang-la-board-state-v2';
const TOOLBAR_ICONS = {
  create: `
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 4.25v11.5"></path>
      <path d="M4.25 10h11.5"></path>
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

let boardState = loadState();
let draftImage = null;
let editingItemId = null;
let draggedItemId = null;
let isFullscreen = false;

renderBoard();
bindEvents();
void syncFullscreenState();

function bindEvents() {
  editorForm.addEventListener('submit', onSubmitItem);
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
}

function getItemsInLane(laneId) {
  return boardState.items.filter((item) => item.laneId === laneId);
}

function createPoolActions() {
  const actions = document.createElement('div');
  actions.className = 'pool-actions';
  actions.append(createPoolActionButton('create'), createPoolActionButton('fullscreen'));
  return actions;
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
    deleteItem(item.id);
  });

  itemElement.addEventListener('dragstart', (event) => {
    draggedItemId = item.id;
    itemElement.classList.add('is-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', item.id);
  });

  itemElement.addEventListener('dragend', () => {
    draggedItemId = null;
    itemElement.classList.remove('is-dragging');
    document.querySelectorAll('.lane-dropzone').forEach((dropzone) => {
      dropzone.classList.remove('is-over');
    });
  });

  return itemElement;
}

function wireDropzone(dropzone) {
  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropzone.classList.add('is-over');

    const afterElement = getDragAfterElement(dropzone, event.clientX);
    const draggingElement = document.querySelector('.rank-item.is-dragging');

    if (!draggingElement) {
      return;
    }

    if (afterElement == null) {
      dropzone.append(draggingElement);
    } else {
      dropzone.insertBefore(draggingElement, afterElement);
    }
  });

  dropzone.addEventListener('dragleave', (event) => {
    if (!dropzone.contains(event.relatedTarget)) {
      dropzone.classList.remove('is-over');
    }
  });

  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    const itemId = event.dataTransfer.getData('text/plain') || draggedItemId;
    const nextLaneId = dropzone.dataset.laneId;

    if (!itemId || !nextLaneId) {
      return;
    }

    const orderedIds = Array.from(dropzone.querySelectorAll('.rank-item')).map((element) => element.dataset.itemId);
    moveItem(itemId, nextLaneId, orderedIds);
    dropzone.classList.remove('is-over');
  });
}

function getDragAfterElement(dropzone, pointerX) {
  const candidateElements = [...dropzone.querySelectorAll('.rank-item:not(.is-dragging)')];

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
