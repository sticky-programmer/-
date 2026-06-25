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
