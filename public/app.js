const loginView = document.querySelector("#loginView");
const appView = document.querySelector("#appView");
const loginForm = document.querySelector("#loginForm");
const usernameInput = document.querySelector("#usernameInput");
const passwordInput = document.querySelector("#passwordInput");
const navItems = document.querySelectorAll(".nav-item");
const views = document.querySelectorAll(".view");
const pageTitle = document.querySelector("#pageTitle");
const userText = document.querySelector("#userText");
const refreshButton = document.querySelector("#refreshButton");
const logoutButton = document.querySelector("#logoutButton");
const uploadForm = document.querySelector("#uploadForm");
const imageInput = document.querySelector("#imageInput");
const fileNameText = document.querySelector("#fileNameText");
const apiKeyForm = document.querySelector("#apiKeyForm");
const apiKeyInput = document.querySelector("#apiKeyInput");
const apiKeyStatus = document.querySelector("#apiKeyStatus");
const corsForm = document.querySelector("#corsForm");
const corsInput = document.querySelector("#corsInput");
const corsStatus = document.querySelector("#corsStatus");
const searchInput = document.querySelector("#searchInput");
const gallery = document.querySelector("#gallery");
const statusText = document.querySelector("#statusText");
const imageCount = document.querySelector("#imageCount");
const storedSize = document.querySelector("#storedSize");
const template = document.querySelector("#imageCardTemplate");
const detailDialog = document.querySelector("#detailDialog");
const closeDetail = document.querySelector("#closeDetail");
const detailImage = document.querySelector("#detailImage");
const detailId = document.querySelector("#detailId");
const detailName = document.querySelector("#detailName");
const detailSize = document.querySelector("#detailSize");
const detailCompress = document.querySelector("#detailCompress");
const detailUrl = document.querySelector("#detailUrl");

const maxImageSize = 5 * 1024 * 1024;
const autoRefreshMs = 15000;

let images = [];
let currentUser = null;
let refreshTimer = null;

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    setActiveView(item.dataset.view);
  });
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  try {
    const data = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    currentUser = data.user;
    loginForm.reset();
    showApp();
    await loadApiKeyStatus();
    await loadCorsSettings();
    await loadImages();
  } catch (error) {
    showLogin(error.message);
  }
});

refreshButton.addEventListener("click", async () => {
  await loadImages();
});

logoutButton.addEventListener("click", async () => {
  await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
  currentUser = null;
  images = [];
  stopAutoRefresh();
  showLogin();
});

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  fileNameText.textContent = file ? file.name : "No file selected";
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const file = imageInput.files[0];
  if (!file) {
    setStatus("Please choose an image.", true);
    return;
  }

  if (file.size > maxImageSize) {
    setStatus("Image size must not exceed 5MB.", true);
    return;
  }

  const formData = new FormData();
  formData.append("image", file);

  try {
    await request("/api/images", {
      method: "POST",
      body: formData
    });
    uploadForm.reset();
    fileNameText.textContent = "No file selected";
    setStatus("Image uploaded.");
    await loadImages();
  } catch (error) {
    setStatus(error.message, true);
  }
});

apiKeyForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const key = apiKeyInput.value.trim();
  if (key.length < 12) {
    setStatus("API key must be at least 12 characters.", true);
    return;
  }

  try {
    const status = await request("/api/admin/api-key", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key })
    });
    apiKeyForm.reset();
    renderApiKeyStatus(status);
    setStatus("API key updated.");
  } catch (error) {
    setStatus(error.message, true);
  }
});

corsForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const origins = corsInput.value
    .split(/\n|,/)
    .map((origin) => origin.trim())
    .filter(Boolean);

  try {
    const settings = await request("/api/admin/cors", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origins })
    });
    renderCorsSettings(settings);
    setStatus("CORS origins updated.");
  } catch (error) {
    setStatus(error.message, true);
  }
});

searchInput.addEventListener("input", () => {
  renderImages();
});

closeDetail.addEventListener("click", () => {
  detailDialog.close();
});

async function init() {
  try {
    const data = await request("/api/auth/me");
    currentUser = data.user;
    showApp();
    await loadApiKeyStatus();
    await loadCorsSettings();
    await loadImages();
  } catch {
    showLogin();
  }
}

async function loadImages({ silent = false } = {}) {
  try {
    if (!silent) {
      setStatus("Loading images...");
    }

    images = await request("/api/images");
    updateSummary();
    renderImages();

    if (!silent) {
      setStatus(images.length ? `${images.length} images.` : "No images yet.");
    }
  } catch (error) {
    if (!silent) {
      setStatus(error.message, true);
    }

    if (/login/i.test(error.message)) {
      showLogin();
    }
  }
}

async function loadApiKeyStatus() {
  try {
    const status = await request("/api/admin/api-key");
    renderApiKeyStatus(status);
  } catch (error) {
    apiKeyStatus.textContent = currentUser && currentUser.role === "admin"
      ? error.message
      : "Only admins can manage the API key.";
  }
}

async function loadCorsSettings() {
  try {
    const settings = await request("/api/admin/cors");
    renderCorsSettings(settings);
  } catch (error) {
    corsStatus.textContent = currentUser && currentUser.role === "admin"
      ? error.message
      : "Only admins can manage CORS origins.";
  }
}

function renderApiKeyStatus(status) {
  apiKeyInput.value = status.key || "";

  if (!status.enabled) {
    apiKeyStatus.textContent = "Not enabled. Set a key to allow external calls with the KEY header.";
    return;
  }

  apiKeyStatus.textContent = status.key
    ? `Current key: ${status.key}. Last updated: ${formatDate(status.updatedAt)}`
    : "Enabled, but the current key was created by an older version and cannot be displayed. Set a new key to manage it here.";
}

function renderCorsSettings(settings) {
  const origins = settings.origins || [];
  corsInput.value = origins.join("\n");
  corsStatus.textContent = origins.length
    ? `${origins.length} allowed origin${origins.length > 1 ? "s" : ""}. Last updated: ${formatDate(settings.updatedAt)}`
    : "No origins allowed yet. Add your frontend origin here.";
}

function renderImages() {
  const keyword = searchInput.value.trim().toLowerCase();
  const visibleImages = images.filter((image) => {
    if (!keyword) {
      return true;
    }

    return image.id.toLowerCase().includes(keyword) ||
      image.originalName.toLowerCase().includes(keyword);
  });

  gallery.replaceChildren();

  for (const image of visibleImages) {
    const card = template.content.firstElementChild.cloneNode(true);
    const link = card.querySelector(".image-link");
    const img = card.querySelector("img");
    const title = card.querySelector("h2");
    const meta = card.querySelector("p");

    link.href = image.url;
    img.src = `${image.url}?v=${encodeURIComponent(image.createdAt)}`;
    img.alt = image.originalName;
    title.textContent = image.originalName;
    meta.textContent = `${formatBytes(image.originalSize)} -> ${formatBytes(image.compressedSize)}`;

    card.querySelector('[data-action="detail"]').addEventListener("click", () => {
      showDetail(image);
    });

    card.querySelector('[data-action="copy"]').addEventListener("click", async () => {
      await navigator.clipboard.writeText(image.url);
      setStatus("Image URL copied.");
    });

    card.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      const confirmed = window.confirm(`Delete "${image.originalName}"?`);
      if (!confirmed) {
        return;
      }

      try {
        await request(`/api/images/${image.id}`, { method: "DELETE" });
        setStatus("Image deleted.");
        await loadImages();
      } catch (error) {
        setStatus(error.message, true);
      }
    });

    gallery.append(card);
  }

  if (keyword && visibleImages.length === 0) {
    setStatus("No matching images.");
  }
}

function updateSummary() {
  imageCount.textContent = String(images.length);
  storedSize.textContent = formatBytes(images.reduce((sum, image) => sum + (image.compressedSize || 0), 0));
}

function showDetail(image) {
  detailImage.src = `${image.url}?v=${encodeURIComponent(image.createdAt)}`;
  detailImage.alt = image.originalName;
  detailId.textContent = image.id;
  detailName.textContent = image.originalName;
  detailSize.textContent = image.width && image.height ? `${image.width} x ${image.height}` : "Unknown";
  detailCompress.textContent = `${formatBytes(image.originalSize)} -> ${formatBytes(image.compressedSize)}`;
  detailUrl.href = image.url;
  detailUrl.textContent = image.url;
  detailDialog.showModal();
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

function showLogin(message = "") {
  stopAutoRefresh();
  loginView.hidden = false;
  appView.hidden = true;

  if (message) {
    passwordInput.setCustomValidity(message);
    passwordInput.reportValidity();
    passwordInput.setCustomValidity("");
  }
}

function showApp() {
  loginView.hidden = true;
  appView.hidden = false;
  userText.textContent = currentUser ? `Signed in as ${currentUser.username}` : "Signed in";
  setActiveView("imagesView");
  startAutoRefresh();
}

function setActiveView(viewId) {
  views.forEach((view) => {
    view.classList.toggle("active", view.id === viewId);
  });

  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.view === viewId);
  });

  pageTitle.textContent = viewId === "settingsView" ? "Settings" : "Images";
}

function startAutoRefresh() {
  stopAutoRefresh();
  refreshTimer = window.setInterval(() => {
    loadImages({ silent: true });
  }, autoRefreshMs);
}

function stopAutoRefresh() {
  if (refreshTimer) {
    window.clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.style.color = isError ? "#b42323" : "#5d6b7d";
}

function formatBytes(value) {
  if (!Number.isFinite(value)) {
    return "0 B";
  }

  const units = ["B", "KB", "MB"];
  let size = value;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value) {
  if (!value) {
    return "never";
  }

  return new Date(value).toLocaleString();
}

init();
