const STORAGE_KEY = 'hang-la-board-state-v1';

const LANES = [
  {
    id: 'pool',
    tag: 'Input Pool',
    title: '自定义内容栏',
    emptyText: '先在这里新增内容，再拖到下面分档。'
  },
  {
    id: 'hang',
    tag: 'Tier S+',
    title: '夯',
    emptyText: '最顶的都放这里。'
  },
  {
    id: 'top',
    tag: 'Tier S',
    title: '顶级',
    emptyText: '很强，但还没到夯。'
  },
  {
    id: 'elite',
    tag: 'Tier A',
    title: '人上人',
    emptyText: '明显高于平均线。'
  },
  {
    id: 'npc',
    tag: 'Tier B',
    title: 'NPC',
    emptyText: '普通，没有存在感。'
  },
  {
    id: 'la',
    tag: 'Tier F',
    title: '拉',
    emptyText: '垫底区域。'
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

renderBoard();
bindEvents();

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
    items: [
      createSeedItem('瑞幸', '咖', '示例：可以是品牌', 'pool'),
      createSeedItem('黑神话', '游', '示例：可以是作品', 'hang'),
      createSeedItem('某平台 UI', '设', '示例：可以是产品', 'npc')
    ]
  };
}

function createSeedItem(title, badge, note, laneId) {
  return {
    id: crypto.randomUUID(),
    title,
    badge,
    note,
    image: null,
    laneId
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
    laneTitle.textContent = lane.title;
    dropzone.dataset.laneId = lane.id;
    dropzone.dataset.emptyText = lane.emptyText;
    dropzone.classList.toggle('is-empty', getItemsInLane(lane.id).length === 0);

    if (lane.id === 'pool') {
      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'primary-button';
      addButton.textContent = '新增内容';
      addButton.addEventListener('click', () => openEditor());
      laneTools.append(addButton);
    } else {
      const counter = document.createElement('button');
      counter.type = 'button';
      counter.className = 'ghost-button';
      counter.textContent = `${getItemsInLane(lane.id).length} 项`;
      counter.disabled = true;
      laneTools.append(counter);
    }

    wireDropzone(dropzone);

    for (const item of getItemsInLane(lane.id)) {
      dropzone.append(createItemCard(item));
    }

    laneElement.style.setProperty('--lane-accent', lane.id === 'hang' ? '#d79a1e' : '#cc481d');
    boardElement.append(laneFragment);
  }
}

function getItemsInLane(laneId) {
  return boardState.items.filter((item) => item.laneId === laneId);
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
  const selectedImage = await window.hangLaApi.pickImage();
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
