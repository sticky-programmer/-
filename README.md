# 图片管理服务接口文档

## 1. 基础信息

服务默认地址：

```txt
本地测试：http://127.0.0.1:3000
服务器：http://8.137.192.209
```

服务器实际返回图片 URL 时会使用 `.env` 中的 `BASE_URL`。

```env
BASE_URL=http://8.137.192.209
```

接口数据格式：

- 普通接口：`application/json`
- 图片上传接口：`multipart/form-data`
- 登录状态：服务端通过 `httpOnly cookie` 保存登录态

图片限制：

- 上传字段名固定为 `image`
- 图片最大 `5MB`
- 上传后统一压缩并保存为 `webp`

## 2. 通用错误格式

接口错误统一返回：

```json
{
  "error": "错误信息"
}
```

常见状态码：

```txt
400 请求参数错误
401 未登录或登录失效
403 权限不足
404 资源不存在
413 图片超过 5MB
415 上传的不是图片
500 服务端错误
```

## 3. 健康检查

### GET /api/health

说明：检查服务是否正常运行。

是否需要登录：否

响应示例：

```json
{
  "ok": true,
  "environment": "production"
}
```

## 4. 登录接口

### POST /api/auth/login

说明：管理员或已授权用户登录。登录成功后，服务端会写入 `httpOnly cookie`。

是否需要登录：否

请求头：

```txt
Content-Type: application/json
```

请求体：

```json
{
  "username": "admin",
  "password": "your-password"
}
```

成功响应：

```json
{
  "user": {
    "id": "用户ID",
    "username": "admin",
    "role": "admin"
  }
}
```

失败响应：

```json
{
  "error": "Invalid username or password."
}
```

### GET /api/auth/me

说明：获取当前登录用户信息。

是否需要登录：是

成功响应：

```json
{
  "user": {
    "id": "用户ID",
    "username": "admin",
    "role": "admin"
  }
}
```

### POST /api/auth/logout

说明：退出登录，清除登录 cookie。

是否需要登录：是

成功响应：

```txt
204 No Content
```

## 5. 图片接口

### POST /api/images

说明：上传图片。必须使用 `multipart/form-data`，字段名固定为 `image`。

是否需要登录：是

请求格式：

```txt
Content-Type: multipart/form-data
```

FormData 字段：

```txt
image: 图片文件
```

cURL 示例：

```bash
curl -X POST "http://8.137.192.209/api/images" \
  -b "image_service_session=你的登录cookie" \
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

说明：获取图片列表。服务端会检查真实图片文件是否存在，如果服务器上手动删除了图片文件，列表会自动同步清理。

是否需要登录：是

成功响应：

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

### GET /api/images/:id

说明：获取单张图片详情。

是否需要登录：是

路径参数：

```txt
id: 图片ID
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

不存在时：

```json
{
  "error": "Image not found."
}
```

### DELETE /api/images/:id

说明：删除图片，会同时删除服务器上的图片文件和索引记录。

是否需要登录：是

路径参数：

```txt
id: 图片ID
```

成功响应：

```txt
204 No Content
```

不存在时：

```json
{
  "error": "Image not found."
}
```

## 6. 图片访问地址

### GET /uploads/images/:fileName

说明：访问已上传的图片文件。

是否需要登录：否

示例：

```txt
http://8.137.192.209/uploads/images/uuid.webp
```

说明：

- 图片文件是公开访问的
- 文件响应使用 `Cache-Control: no-cache`
- 前端列表会定时刷新服务器内容

## 7. 管理员用户接口

这些接口提供给服务器管理员或后台工具调用，前端页面没有暴露入口。

### GET /api/admin/users

说明：获取用户列表。

是否需要登录：是

是否需要管理员权限：是

成功响应：

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

是否需要登录：是

是否需要管理员权限：是

请求头：

```txt
Content-Type: application/json
```

请求体：

```json
{
  "username": "newuser",
  "password": "password123",
  "role": "user"
}
```

字段说明：

```txt
username 必填
password 必填，至少 8 位
role 可选，admin 或 user，默认 user
```

成功响应：

```json
{
  "id": "用户ID",
  "username": "newuser",
  "role": "user",
  "createdAt": "2026-06-25T00:00:00.000Z"
}
```

## 8. 前端页面

### GET /

说明：图片管理 UI。

是否需要登录：页面可访问，但图片管理操作需要登录。

功能：

- 登录
- 上传图片
- 查看图片列表
- 查看图片详情
- 复制图片 URL
- 删除图片
- 手动刷新列表
- 每 15 秒自动同步服务器图片列表

## 9. 部署相关配置

推荐 `.env`：

```env
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-password

BASE_URL=http://8.137.192.209
SESSION_SECRET=change-to-a-long-random-secret
COOKIE_SECURE=false
```

注意：

- `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 只在第一次启动、且没有 `data/users.json` 时生效
- 如果已经生成了 `data/users.json`，修改 `.env` 不会重置已有账号
- 使用 HTTPS 后再把 `COOKIE_SECURE` 改为 `true`
- 图片索引保存在 `data/images.json`
- 用户信息保存在 `data/users.json`
- 图片文件保存在 `uploads/images`
