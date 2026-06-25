# 图片管理服务

这是一个基于 Node.js、Express、Multer 和 Sharp 的图片上传与管理服务。服务支持图片上传、WebP 压缩、图片列表管理、登录授权、请求头密钥认证、动态跨域配置，以及一个内置的 Web 管理界面。

## 功能概览

- 图片上传：使用 `multipart/form-data` 上传图片，字段名固定为 `image`
- 图片限制：单张图片最大 `5MB`
- 图片压缩：上传后统一压缩并保存为 `webp`
- 图片访问：上传成功后返回可访问的绝对 URL
- 图片管理：支持列表、详情、删除
- 本地存储：图片文件直接保存到服务器磁盘
- 登录授权：管理员登录后通过 `httpOnly cookie` 访问后台
- 密钥授权：外部前端可通过请求头 `KEY` 直接调用图片接口，不依赖 cookie
- 动态 CORS：可在 UI 中实时修改允许跨域的前端 Origin，无需重启服务
- 文件同步：如果服务器上手动删除了图片文件，列表接口会自动同步清理索引
- 管理页面：访问根路径 `/` 可打开 UI 管理页面

## 技术栈

```txt
Node.js
Express
Multer
Sharp
Compression
```

## 项目结构

```txt
.
├── public/                    # 前端管理页面
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── src/
│   ├── app.js                 # Express 应用
│   ├── server.js              # 服务启动入口
│   ├── config/                # 环境变量和路径配置
│   ├── middleware/            # 鉴权、CORS、上传、错误处理
│   ├── routes/                # 接口路由
│   ├── services/              # 图片、用户、密钥和配置逻辑
│   └── utils/
├── data/                      # 运行时数据目录
│   ├── users.json             # 用户数据，运行后生成
│   ├── images.json            # 图片索引，运行后生成
│   └── settings.json          # API KEY 和 CORS 配置，运行后生成
├── uploads/
│   └── images/                # 图片文件目录，运行后生成
├── .env.example
├── package.json
└── README.md
```

## 安装依赖

推荐使用 `pnpm`：

```bash
pnpm install
```

也可以使用 npm：

```bash
npm install
```

## 环境变量

在项目根目录创建 `.env` 文件：

```env
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-password

API_KEY=

BASE_URL=http://8.137.192.209
SESSION_SECRET=change-to-a-long-random-secret

COOKIE_SECURE=false
COOKIE_SAME_SITE=lax

CORS_ORIGINS=http://8.137.192.209,http://localhost:5173,http://127.0.0.1:5173
```

### 配置说明

| 配置项 | 说明 |
|---|---|
| `PORT` | 服务端口，默认 `3000` |
| `HOST` | 监听地址，服务器部署一般用 `0.0.0.0` |
| `NODE_ENV` | 运行环境，服务器建议 `production` |
| `ADMIN_USERNAME` | 初始管理员账号 |
| `ADMIN_PASSWORD` | 初始管理员密码 |
| `API_KEY` | 初始请求头密钥，可为空 |
| `BASE_URL` | 返回图片绝对 URL 时使用的服务地址 |
| `SESSION_SECRET` | cookie 登录签名密钥，生产环境必须改成随机长字符串 |
| `COOKIE_SECURE` | HTTPS 环境设为 `true`，HTTP 环境设为 `false` |
| `COOKIE_SAME_SITE` | cookie SameSite 策略，可选 `lax`、`strict`、`none` |
| `CORS_ORIGINS` | 初始允许跨域来源，多个用逗号分隔 |

注意：

- `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 只在第一次启动且没有 `data/users.json` 时生效。
- `API_KEY` 和 `CORS_ORIGINS` 只在第一次启动且没有 `data/settings.json` 时用于初始化。
- 之后可以在管理 UI 中动态修改 Header API Key 和 CORS Origins，不需要删除文件，也不需要重启服务。
- 如果服务使用 HTTP IP 访问，`COOKIE_SECURE=false`。
- 如果使用 HTTPS 域名，建议设置 `COOKIE_SECURE=true`。

## 启动服务

```bash
pnpm start
```

开发模式：

```bash
pnpm dev
```

访问管理页面：

```txt
http://服务器IP:3000/
```

如果使用当前服务器 IP：

```txt
http://8.137.192.209:3000/
```

## PM2 部署示例

安装 PM2：

```bash
npm install -g pm2
```

启动：

```bash
pm2 start src/server.js --name image-service
```

查看状态：

```bash
pm2 status
```

重启：

```bash
pm2 restart image-service
```

设置开机自启：

```bash
pm2 save
pm2 startup
```

## 更新部署

服务器上拉取最新代码：

```bash
git pull
pnpm install
pm2 restart image-service
```

如果服务名不是 `image-service`，把命令里的服务名替换成你自己的。

## 认证方式

服务支持两种认证方式。

### 1. Cookie 登录认证

适合使用内置管理 UI。

用户访问 `/` 页面，输入管理员账号密码登录。登录成功后，服务端写入 `httpOnly cookie`，后续 UI 操作自动携带登录态。

cookie 默认有效期为 12 小时。

### 2. 请求头 KEY 认证

适合外部前端或其他服务调用接口，尤其是前端和服务器不是同一个 IP、不是同一个端口时。

请求时携带：

```http
KEY: 你的密钥
```

示例：

```js
fetch("http://8.137.192.209:3000/api/images", {
  headers: {
    KEY: "你的密钥"
  }
})
```

上传图片示例：

```js
const formData = new FormData()
formData.append("image", file)

fetch("http://8.137.192.209:3000/api/images", {
  method: "POST",
  headers: {
    KEY: "你的密钥"
  },
  body: formData
})
```

注意：使用 `FormData` 上传时不要手动设置 `Content-Type`，浏览器会自动带上 boundary。

## 动态 CORS 配置

如果外部前端和图片服务器不是同一个 IP 或端口，浏览器会触发跨域检查。

服务端已经支持动态 CORS 配置：

1. 登录管理 UI
2. 找到 `CORS Origins`
3. 一行填写一个前端地址
4. 点击保存
5. 保存后立即生效，不需要重启服务

例如前端地址是：

```txt
http://1.2.3.4:5173
```

则在 UI 中添加：

```txt
http://1.2.3.4:5173
```

也可以添加多个：

```txt
http://1.2.3.4:5173
http://8.137.192.209:5173
http://your-frontend.com
```

如果确实想允许任意来源，可以填：

```txt
*
```

不建议公开使用 `*`，因为只要别人拿到你的 `KEY`，就能从任意网站调用上传接口。

## 图片规则

| 规则 | 值 |
|---|---|
| 上传字段名 | `image` |
| 上传格式 | `multipart/form-data` |
| 最大大小 | `5MB` |
| 保存格式 | `webp` |
| 最大压缩尺寸 | 宽高不超过 `2560px` |
| WebP 质量 | `82` |
| 图片访问权限 | 公开访问 |
| 管理接口权限 | 需要 cookie 或 `KEY` |

## API 文档

基础地址：

```txt
http://8.137.192.209:3000
```

如果你通过 Nginx 反代到 80 端口，则基础地址可能是：

```txt
http://8.137.192.209
```

以下示例默认使用：

```txt
http://8.137.192.209:3000
```

## 通用错误格式

```json
{
  "error": "错误信息"
}
```

常见状态码：

| 状态码 | 说明 |
|---|---|
| `400` | 请求参数错误 |
| `401` | 未登录或 KEY 无效 |
| `403` | 权限不足 |
| `404` | 资源不存在 |
| `413` | 图片超过 5MB |
| `415` | 上传的不是图片 |
| `500` | 服务端错误 |

## 健康检查

### GET /api/health

是否需要认证：否

响应：

```json
{
  "ok": true,
  "environment": "production"
}
```

## 登录接口

### POST /api/auth/login

是否需要认证：否

请求：

```json
{
  "username": "admin",
  "password": "your-password"
}
```

响应：

```json
{
  "user": {
    "id": "用户ID",
    "username": "admin",
    "role": "admin"
  }
}
```

### GET /api/auth/me

是否需要认证：cookie

响应：

```json
{
  "user": {
    "id": "用户ID",
    "username": "admin",
    "role": "admin",
    "authType": "cookie"
  }
}
```

### POST /api/auth/logout

是否需要认证：cookie

响应：

```txt
204 No Content
```

## 图片接口

### POST /api/images

说明：上传图片。

是否需要认证：cookie 或 `KEY`

请求格式：

```txt
multipart/form-data
```

字段：

| 字段 | 必填 | 说明 |
|---|---|---|
| `image` | 是 | 图片文件 |

cURL 示例：

```bash
curl -X POST "http://8.137.192.209:3000/api/images" \
  -H "KEY: 你的密钥" \
  -F "image=@/path/to/image.png"
```

成功响应：

```json
{
  "id": "图片ID",
  "originalName": "image.png",
  "originalMimeType": "image/png",
  "originalSize": 123456,
  "compressedSize": 45678,
  "width": 1200,
  "height": 800,
  "fileName": "uuid.webp",
  "path": "/uploads/images/uuid.webp",
  "createdAt": "2026-06-25T00:00:00.000Z",
  "url": "http://8.137.192.209/uploads/images/uuid.webp"
}
```

### GET /api/images

说明：获取图片列表。

是否需要认证：cookie 或 `KEY`

cURL 示例：

```bash
curl "http://8.137.192.209:3000/api/images" \
  -H "KEY: 你的密钥"
```

响应：

```json
[
  {
    "id": "图片ID",
    "originalName": "image.png",
    "originalMimeType": "image/png",
    "originalSize": 123456,
    "compressedSize": 45678,
    "width": 1200,
    "height": 800,
    "fileName": "uuid.webp",
    "path": "/uploads/images/uuid.webp",
    "createdAt": "2026-06-25T00:00:00.000Z",
    "url": "http://8.137.192.209/uploads/images/uuid.webp"
  }
]
```

说明：服务端会检查真实图片文件是否存在。如果你手动删除了服务器上的图片文件，列表接口会自动同步清理 `data/images.json` 中的索引记录。

### GET /api/images/:id

说明：获取单张图片详情。

是否需要认证：cookie 或 `KEY`

响应：

```json
{
  "id": "图片ID",
  "originalName": "image.png",
  "originalMimeType": "image/png",
  "originalSize": 123456,
  "compressedSize": 45678,
  "width": 1200,
  "height": 800,
  "fileName": "uuid.webp",
  "path": "/uploads/images/uuid.webp",
  "createdAt": "2026-06-25T00:00:00.000Z",
  "url": "http://8.137.192.209/uploads/images/uuid.webp"
}
```

图片不存在：

```json
{
  "error": "Image not found."
}
```

### DELETE /api/images/:id

说明：删除图片文件和索引记录。

是否需要认证：cookie 或 `KEY`

成功响应：

```txt
204 No Content
```

图片不存在：

```json
{
  "error": "Image not found."
}
```

## 图片文件访问

### GET /uploads/images/:fileName

说明：访问上传后的 WebP 图片文件。

是否需要认证：否

示例：

```txt
http://8.137.192.209:3000/uploads/images/uuid.webp
```

图片文件是公开访问的，不需要 cookie 或 `KEY`。

## 管理员接口

管理员接口需要登录 cookie，并且用户角色必须是 `admin`。这些接口主要给管理 UI 或服务器管理员使用。

### GET /api/admin/users

说明：获取用户列表。

响应：

```json
[
  {
    "id": "用户ID",
    "username": "admin",
    "role": "admin",
    "createdAt": "2026-06-25T00:00:00.000Z"
  }
]
```

### POST /api/admin/users

说明：新增授权用户。

请求：

```json
{
  "username": "newuser",
  "password": "password123",
  "role": "user"
}
```

字段：

| 字段 | 必填 | 说明 |
|---|---|---|
| `username` | 是 | 用户名 |
| `password` | 是 | 密码，至少 8 位 |
| `role` | 否 | `admin` 或 `user`，默认 `user` |

### GET /api/admin/api-key

说明：获取 Header API Key 状态，不返回密钥明文。

响应：

```json
{
  "enabled": true,
  "updatedAt": "2026-06-25T00:00:00.000Z"
}
```

### PUT /api/admin/api-key

说明：修改 Header API Key。

请求：

```json
{
  "key": "new-api-key-value"
}
```

要求：

```txt
key 至少 12 个字符
```

修改成功后旧密钥立即失效，新密钥立即生效。

### GET /api/admin/cors

说明：获取当前动态 CORS 配置。

响应：

```json
{
  "origins": [
    "http://8.137.192.209:5173"
  ],
  "updatedAt": "2026-06-25T00:00:00.000Z"
}
```

### PUT /api/admin/cors

说明：动态修改允许跨域的前端 Origin。

请求：

```json
{
  "origins": [
    "http://8.137.192.209:5173",
    "http://your-frontend.com"
  ]
}
```

保存后立即生效，不需要重启服务。

## 前端接入示例

### 获取图片列表

```js
async function getImages() {
  const response = await fetch("http://8.137.192.209:3000/api/images", {
    headers: {
      KEY: "你的密钥"
    }
  })

  if (!response.ok) {
    throw new Error("请求失败")
  }

  return response.json()
}
```

### 上传图片

```js
async function uploadImage(file) {
  const formData = new FormData()
  formData.append("image", file)

  const response = await fetch("http://8.137.192.209:3000/api/images", {
    method: "POST",
    headers: {
      KEY: "你的密钥"
    },
    body: formData
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || "上传失败")
  }

  return response.json()
}
```

### 删除图片

```js
async function deleteImage(id) {
  const response = await fetch(`http://8.137.192.209:3000/api/images/${id}`, {
    method: "DELETE",
    headers: {
      KEY: "你的密钥"
    }
  })

  if (!response.ok && response.status !== 204) {
    throw new Error("删除失败")
  }
}
```

## Nginx 反向代理示例

如果你希望通过 80 端口访问，而不是带 `:3000`，可以用 Nginx 反代。

示例：

```nginx
server {
    listen 80;
    server_name 8.137.192.209;

    client_max_body_size 6m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

如果使用 Nginx 反代到 80 端口，`.env` 推荐：

```env
BASE_URL=http://8.137.192.209
```

如果不使用 Nginx，直接访问 3000 端口，`.env` 推荐：

```env
BASE_URL=http://8.137.192.209:3000
```

## 运行时文件说明

| 文件或目录 | 说明 |
|---|---|
| `data/users.json` | 用户数据，包含密码哈希，不要公开 |
| `data/images.json` | 图片索引 |
| `data/settings.json` | Header API Key 哈希和动态 CORS 配置 |
| `uploads/images` | WebP 图片文件 |

这些文件属于服务器运行数据，已经在 `.gitignore` 中忽略，不应该提交到 GitHub。

## 常见问题

### 1. 修改 `.env` 里的管理员账号密码后不生效

`ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 只在第一次启动且没有 `data/users.json` 时用于初始化。如果 `data/users.json` 已经存在，系统会继续使用已有用户。

### 2. 修改 `.env` 里的 API_KEY 后不生效

`API_KEY` 只在第一次启动且没有 `data/settings.json` 时用于初始化。后续请在管理 UI 的 `Header API Key` 区域修改密钥。

### 3. 修改 `.env` 里的 CORS_ORIGINS 后不生效

`CORS_ORIGINS` 只在第一次启动且没有 `data/settings.json` 时用于初始化。后续请在管理 UI 的 `CORS Origins` 区域动态修改。

### 4. 前端跨域失败

检查三件事：

1. 管理 UI 的 `CORS Origins` 中是否包含你的前端地址
2. 请求是否带了正确的 `KEY` 请求头
3. 浏览器控制台中实际的 Origin 是否和你配置的一致

Origin 必须包含协议、IP 或域名、端口，例如：

```txt
http://1.2.3.4:5173
```

不要只写：

```txt
1.2.3.4
```

### 5. 上传时报 413

图片超过 5MB。当前代码限制：

```txt
5 * 1024 * 1024 = 5,242,880 bytes
```

### 6. 上传时报 415

上传文件不是图片，或者浏览器传过来的 MIME 类型不是 `image/*`。

### 7. 使用 FormData 上传失败

不要手动设置 `Content-Type`：

```js
fetch(url, {
  method: "POST",
  headers: {
    KEY: "你的密钥"
  },
  body: formData
})
```

### 8. 服务器手动删除图片后前端还显示

现在服务端列表接口会自动检查真实文件是否存在。更新到最新代码后，前端点击 `Refresh` 或等待自动刷新即可消失。

### 9. cookie 是一次性的吗

不是。cookie 默认有效期是 12 小时。退出登录会清除 cookie。

## 安全建议

- 生产环境必须修改 `SESSION_SECRET`
- `ADMIN_PASSWORD` 不要使用默认值
- Header API Key 至少 12 位，建议使用随机长字符串
- 管理员 UI 可以查看和修改当前 Header API Key。为了支持查看，密钥明文会保存在服务器本地 `data/settings.json`，不要公开这个文件。
- 不建议长期使用 `CORS Origins = *`
- 如果开放公网访问，建议使用 HTTPS
- 不要把 `data/users.json`、`data/settings.json`、`uploads/` 上传到 GitHub

## 验证命令

语法检查：

```bash
pnpm run check
```

健康检查：

```bash
curl http://127.0.0.1:3000/api/health
```

KEY 调用测试：

```bash
curl "http://127.0.0.1:3000/api/images" \
  -H "KEY: 你的密钥"
```

## 当前版本能力清单

- 图片上传
- 图片压缩
- 图片公开访问
- 图片列表
- 图片详情
- 图片删除
- 登录 UI
- Header API Key
- 动态 CORS
- 管理员新增用户接口
- 管理 UI 修改密钥
- 管理 UI 修改跨域来源
- 服务器文件状态自动同步
