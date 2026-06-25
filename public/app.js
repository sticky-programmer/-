const loginView = document.querySelector("#loginView");
const appView = document.querySelector("#appView");
const loginForm = document.querySelector("#loginForm");
const usernameInput = document.querySelector("#usernameInput");
const passwordInput = document.querySelector("#passwordInput");
const userText = document.querySelector("#userText");
const logoutButton = document.querySelector("#logoutButton");
const uploadForm = document.querySelector("#uploadForm");
const imageInput = document.querySelector("#imageInput");
const fileNameText = document.querySelector("#fileNameText");
const searchInput = document.querySelector("#searchInput");
const gallery = document.querySelector("#gallery");
const statusText = document.querySelector("#statusText");
const template = document.querySelector("#imageCardTemplate");
const detailDialog = document.querySelector("#detailDialog");
const closeDetail = document.querySelector("#closeDetail");
const detailImage = document.querySelector("#detailImage");
const detailId = document.querySelector("#detailId");
const detailName = document.querySelector("#detailName");
const detailSize = document.querySelector("#detailSize");
const detailCompress = document.querySelector("#detailCompress");
const detailUrl = document.querySelector("#detailUrl");

let images = [];
let currentUser = null;

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
    await loadImages();
  } catch (error) {
    showLogin(error.message);
  }
});

logoutButton.addEventListener("click", async () => {
  await fetch("/api/auth/logout", { method: "POST" });
  currentUser = null;
  images = [];
  showLogin();
});

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  fileNameText.textContent = file ? file.name : "未选择文件";
});

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const file = imageInput.files[0];
  if (!file) {
    setStatus("请选择一张图片。", true);
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    setStatus("图片不能超过 5MB。", true);
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
    fileNameText.textContent = "未选择文件";
    setStatus("图片上传成功。");
    await loadImages();
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
    await loadImages();
  } catch {
    showLogin();
  }
}

async function loadImages() {
  try {
    setStatus("正在载入图片...");
    images = await request("/api/images");
    renderImages();
    setStatus(images.length ? `共 ${images.length} 张图片。` : "还没有图片，先上传一张。");
  } catch (error) {
    setStatus(error.message, true);
    if (/login/i.test(error.message)) {
      showLogin();
    }
  }
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
    img.src = image.url;
    img.alt = image.originalName;
    title.textContent = image.originalName;
    meta.textContent = `${formatBytes(image.originalSize)} -> ${formatBytes(image.compressedSize)}`;

    card.querySelector('[data-action="detail"]').addEventListener("click", () => {
      showDetail(image);
    });

    card.querySelector('[data-action="copy"]').addEventListener("click", async () => {
      await navigator.clipboard.writeText(image.url);
      setStatus("图片地址已复制。");
    });

    card.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      const confirmed = window.confirm(`确认删除「${image.originalName}」吗？`);
      if (!confirmed) {
        return;
      }

      try {
        await request(`/api/images/${image.id}`, { method: "DELETE" });
        setStatus("图片已删除。");
        await loadImages();
      } catch (error) {
        setStatus(error.message, true);
      }
    });

    gallery.append(card);
  }

  if (keyword && visibleImages.length === 0) {
    setStatus("没有匹配的图片。");
  }
}

function showDetail(image) {
  detailImage.src = image.url;
  detailImage.alt = image.originalName;
  detailId.textContent = image.id;
  detailName.textContent = image.originalName;
  detailSize.textContent = image.width && image.height ? `${image.width} x ${image.height}` : "未知";
  detailCompress.textContent = `${formatBytes(image.originalSize)} -> ${formatBytes(image.compressedSize)}`;
  detailUrl.href = image.url;
  detailUrl.textContent = image.url;
  detailDialog.showModal();
}

async function request(url, options = {}) {
  const response = await fetch(url, options);

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "请求失败。");
  }

  return data;
}

function showLogin(message = "") {
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
  userText.textContent = currentUser ? `已登录：${currentUser.username}` : "已登录";
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

init();
