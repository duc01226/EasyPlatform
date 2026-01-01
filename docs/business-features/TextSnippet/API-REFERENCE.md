# TextSnippet API Reference

## Base URL
```
/api/TextSnippet
/api/TaskItem
```

---

## TextSnippet Endpoints

### Save Snippet Text
Create or update a text snippet.

```http
POST /api/TextSnippet/SaveSnippetText
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "id": "string (optional for create)",
  "snippetText": "string (required)",
  "fullText": "string (optional)",
  "categoryId": "string (optional)"
}
```

**Response:**
```json
{
  "data": {
    "id": "string",
    "snippetText": "string",
    "fullText": "string",
    "categoryId": "string",
    "createdDate": "datetime",
    "lastUpdatedDate": "datetime"
  }
}
```

**Validation Rules:**
- `snippetText` is required and cannot be empty
- `id` is auto-generated if not provided (create mode)

---

### Get Snippet Text Detail
Retrieve a single snippet by ID.

```http
GET /api/TextSnippet/GetSnippetTextDetail?id={id}
Authorization: Bearer {token}
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Snippet ID |

**Response:**
```json
{
  "data": {
    "id": "string",
    "snippetText": "string",
    "fullText": "string",
    "category": {
      "id": "string",
      "name": "string"
    },
    "createdDate": "datetime",
    "lastUpdatedDate": "datetime"
  }
}
```

---

### Search Snippet Texts
Search snippets with pagination and filtering.

```http
POST /api/TextSnippet/SearchSnippetTexts
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "searchText": "string (optional)",
  "categoryId": "string (optional)",
  "skipCount": 0,
  "maxResultCount": 10
}
```

**Response:**
```json
{
  "data": {
    "items": [
      {
        "id": "string",
        "snippetText": "string",
        "fullText": "string",
        "categoryId": "string"
      }
    ],
    "totalCount": 100
  }
}
```

---

### Delete Snippet Text
Delete a snippet by ID.

```http
POST /api/TextSnippet/DeleteSnippetText
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "id": "string (required)"
}
```

---

### Save Snippet Category
Create or update a category.

```http
POST /api/TextSnippet/SaveSnippetCategory
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "id": "string (optional)",
  "name": "string (required)"
}
```

---

## TaskItem Endpoints

### Get All Tasks
```http
GET /api/TaskItem/GetAll
Authorization: Bearer {token}
```

### Get Task by ID
```http
GET /api/TaskItem/{id}
Authorization: Bearer {token}
```

### Create/Update Task
```http
POST /api/TaskItem
Content-Type: application/json
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "id": "string (optional)",
  "title": "string (required)",
  "description": "string (optional)",
  "isCompleted": false
}
```

---

## Error Responses

All endpoints return standard error format:

```json
{
  "errorCode": "VALIDATION_ERROR",
  "errorMessage": "Detailed error message",
  "validationErrors": [
    {
      "field": "snippetText",
      "message": "Snippet text is required"
    }
  ]
}
```

### Common Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Request validation failed |
| NOT_FOUND | 404 | Resource not found |
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Insufficient permissions |
