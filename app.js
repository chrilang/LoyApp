const STORAGE_KEY = "loyapp_mvp_state_v1";
// Sätt endpoint-url här när ett centralt API finns tillgängligt.
const SYNC_ENDPOINT = "";

const merchants = [
  {
    id: "fika-hornan",
    name: "Fika Hörnan",
    rewardText: "8 klipp = 1 valfritt kaffe",
    requiredPunches: 8,
    theme: { primary: "#9c6644", secondary: "#f4d6c6", accent: "#5c3a21" },
  },
  {
    id: "gron-market",
    name: "Grön Market",
    rewardText: "10 klipp = 1 gratis smoothie",
    requiredPunches: 10,
    theme: { primary: "#3b7f4a", secondary: "#d8f3dc", accent: "#1b4332" },
  },
  {
    id: "stadens-bageri",
    name: "Stadens Bageri",
    rewardText: "6 klipp = 1 bulle",
    requiredPunches: 6,
    theme: { primary: "#4f6d7a", secondary: "#dfe7eb", accent: "#2f3e46" },
  },
];

const defaultState = {
  selectedMerchantId: merchants[0].id,
  allowSync: false,
  merchantPunches: {},
  syncQueue: [],
};

const elements = {
  merchant: document.getElementById("merchant"),
  merchantName: document.getElementById("merchantName"),
  rewardText: document.getElementById("rewardText"),
  punches: document.getElementById("punches"),
  progress: document.getElementById("progress"),
  addPunch: document.getElementById("addPunch"),
  redeem: document.getElementById("redeem"),
  allowSync: document.getElementById("allowSync"),
  syncStatus: document.getElementById("syncStatus"),
  card: document.getElementById("card"),
};

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);

    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      merchantPunches: { ...parsed.merchantPunches },
      syncQueue: Array.isArray(parsed.syncQueue) ? parsed.syncQueue : [],
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getSelectedMerchant() {
  return (
    merchants.find((merchant) => merchant.id === state.selectedMerchantId) || merchants[0]
  );
}

function getPunches(merchantId) {
  return state.merchantPunches[merchantId] ?? 0;
}

function setPunches(merchantId, value) {
  state.merchantPunches[merchantId] = Math.max(0, value);
}

function addToSyncQueue(action, merchantId, amount = 1) {
  state.syncQueue.push({
    action,
    merchantId,
    amount,
    timestamp: new Date().toISOString(),
  });
  saveState();
}

function renderMerchantOptions() {
  elements.merchant.innerHTML = merchants
    .map((merchant) => `<option value="${merchant.id}">${merchant.name}</option>`)
    .join("");
  elements.merchant.value = state.selectedMerchantId;
}

function applyTheme(merchant) {
  elements.card.style.setProperty("--primary", merchant.theme.primary);
  elements.card.style.setProperty("--secondary", merchant.theme.secondary);
  elements.card.style.setProperty("--accent", merchant.theme.accent);
}

function renderPunches(merchant, currentPunches) {
  const count = merchant.requiredPunches;
  elements.punches.innerHTML = Array.from({ length: count }, (_, index) => {
    const filledClass = index < currentPunches ? "punch is-filled" : "punch";
    return `<div class="${filledClass}" aria-label="Klipp ${index + 1}"></div>`;
  }).join("");
}

function renderSyncStatus(message = "") {
  if (message) {
    elements.syncStatus.textContent = message;
    return;
  }
  const queueText =
    state.syncQueue.length > 0
      ? `${state.syncQueue.length} händelser väntar på synk.`
      : "Inga väntande synkhändelser.";
  const onlineText = navigator.onLine ? "Online" : "Offline";
  elements.syncStatus.textContent = `${onlineText}. ${queueText}`;
}

function render() {
  const merchant = getSelectedMerchant();
  const currentPunches = getPunches(merchant.id);

  applyTheme(merchant);
  elements.merchantName.textContent = merchant.name;
  elements.rewardText.textContent = merchant.rewardText;
  elements.progress.textContent = `${currentPunches}/${merchant.requiredPunches} klipp`;
  elements.allowSync.checked = state.allowSync;
  renderPunches(merchant, currentPunches);
  renderSyncStatus();
}

async function trySyncQueue() {
  if (!state.allowSync || !navigator.onLine) return;

  if (!SYNC_ENDPOINT) {
    renderSyncStatus("Synk tillåten, men ingen endpoint är konfigurerad i MVP.");
    return;
  }

  const queueSnapshot = [...state.syncQueue];
  let successfullySynced = 0;
  for (const event of queueSnapshot) {
    let response;
    try {
      response = await fetch(SYNC_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
    } catch {
      if (successfullySynced > 0) {
        state.syncQueue.splice(0, successfullySynced);
        saveState();
      }
      renderSyncStatus("Synk misslyckades (nätverksfel). Försöker igen senare.");
      return;
    }
    if (!response.ok) {
      if (successfullySynced > 0) {
        state.syncQueue.splice(0, successfullySynced);
        saveState();
      }
      renderSyncStatus(`Synk misslyckades (HTTP ${response.status}). Försöker igen senare.`);
      return;
    }
    successfullySynced += 1;
  }
  if (successfullySynced > 0) {
    state.syncQueue.splice(0, successfullySynced);
  }
  saveState();
  renderSyncStatus("Synk slutförd.");
}

function handleAddPunch() {
  const merchant = getSelectedMerchant();
  const current = getPunches(merchant.id);
  if (current >= merchant.requiredPunches) {
    renderSyncStatus("Kortet är fullt. Lös in belöningen först.");
    return;
  }

  setPunches(merchant.id, current + 1);
  addToSyncQueue("add_punch", merchant.id, 1);
  saveState();
  render();
  void trySyncQueue();
}

function handleRedeem() {
  const merchant = getSelectedMerchant();
  const current = getPunches(merchant.id);
  if (current < merchant.requiredPunches) {
    renderSyncStatus("Inte tillräckligt med klipp ännu.");
    return;
  }

  setPunches(merchant.id, 0);
  addToSyncQueue("redeem", merchant.id, merchant.requiredPunches);
  saveState();
  render();
  void trySyncQueue();
}

function setupEvents() {
  elements.merchant.addEventListener("change", (event) => {
    state.selectedMerchantId = event.target.value;
    saveState();
    render();
  });

  elements.allowSync.addEventListener("change", (event) => {
    state.allowSync = event.target.checked;
    saveState();
    render();
    void trySyncQueue();
  });

  elements.addPunch.addEventListener("click", handleAddPunch);
  elements.redeem.addEventListener("click", handleRedeem);
  window.addEventListener("online", () => void trySyncQueue());
  window.addEventListener("offline", () => renderSyncStatus());
}

function setupServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {
      renderSyncStatus("Offline-stöd kunde inte aktiveras.");
    });
  }
}

renderMerchantOptions();
setupEvents();
setupServiceWorker();
render();
void trySyncQueue();
