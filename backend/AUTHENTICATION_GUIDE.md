# Backend Authentication Guide

## Overview

This guide explains how authentication works between the frontend (Supabase) and backend (FastAPI).

---

## How It Works

### 1. **User Authentication Flow**

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend  │         │   Supabase   │         │   Backend    │
│   (React)   │         │   (Auth)     │         │   (FastAPI)  │
└──────┬──────┘         └──────┬───────┘         └──────┬───────┘
       │                       │                        │
       │ 1. Login/Signup       │                        │
       ├──────────────────────>│                        │
       │                       │                        │
       │ 2. JWT Token          │                        │
       │<──────────────────────┤                        │
       │                       │                        │
       │ 3. API Request + JWT  │                        │
       ├───────────────────────┼───────────────────────>│
       │                       │                        │
       │                       │ 4. Validate JWT        │
       │                       │<───────────────────────┤
       │                       │                        │
       │                       │ 5. User Info           │
       │                       ├───────────────────────>│
       │                       │                        │
       │                       │ 6. Process Request     │
       │                       │         with           │
       │                       │       user_id          │
       │ 7. Response           │                        │
       │<──────────────────────┼────────────────────────┤
       │                       │                        │
```

---

## 2. **JWT Token Structure**

When a user logs in, Supabase generates a JWT token that looks like:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkw...
```

**Decoded, it contains:**

```json
{
  "sub": "user-uuid-here",           // User ID
  "email": "user@example.com",       // User email
  "aud": "authenticated",             // Audience
  "role": "authenticated",            // User role
  "iat": 1234567890,                  // Issued at
  "exp": 1234571490                   // Expires at
}
```

---

## 3. **Frontend Automatically Sends Token**

The frontend `api.js` helper **automatically** includes the JWT in every request:

```javascript
// In frontend/src/lib/api.js
const { data: { session } } = await supabase.auth.getSession();

fetch(url, {
  headers: {
    'Authorization': `Bearer ${session.access_token}`
  }
});
```

**You don't need to do anything in the frontend** - it's already handled!

---

## 4. **Backend Setup**

### Step 1: Install Dependencies

```bash
cd backend
pip install supabase python-dotenv
```

### Step 2: Environment Variables

Create `backend/.env`:

```env
SUPABASE_URL=https://xyqjkhiqtuqvqlzrungb.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

**Get the service_role key from:**
Supabase Dashboard → Settings → API → `service_role` key (NOT anon!)

### Step 3: Use the Authentication Middleware

Already created at: `backend/app/middleware/auth.py`

**To protect an endpoint:**

```python
from fastapi import APIRouter, Depends
from app.middleware.auth import get_current_user

router = APIRouter()

@router.post("/ingest")
async def ingest(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)  # <-- Requires auth!
):
    # Now you have user info:
    user_id = user["id"]
    user_email = user["email"]

    # Use it to track ownership
    print(f"User {user_email} uploaded a file")

    return {"status": "success", "user_id": user_id}
```

---

## 5. **What the Backend Gets**

When you use `user: dict = Depends(get_current_user)`, you get:

```python
{
    "id": "550e8400-e29b-41d4-a716-446655440000",  # User UUID
    "email": "user@example.com",                    # User email
    "created_at": "2025-11-01T12:00:00Z"           # Account creation
}
```

---

## 6. **Backend Examples**

### Protected Endpoint (Requires Login)

```python
@router.post("/upload")
async def upload(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    # Only authenticated users can access this
    user_id = user["id"]

    # Store file with user_id for ownership tracking
    save_file(file, owner_id=user_id)

    return {"message": "File uploaded", "owner": user_id}
```

### Public Endpoint (No Auth Required)

```python
@router.get("/health")
async def health():
    # No Depends(get_current_user) = public endpoint
    return {"status": "ok"}
```

### Optional Authentication

```python
from app.middleware.auth import get_current_user_optional

@router.get("/content")
async def get_content(
    user: dict | None = Depends(get_current_user_optional)
):
    # Works for both authenticated and anonymous users
    if user:
        # Show personalized content
        return {"message": f"Welcome back, {user['email']}"}
    else:
        # Show generic content
        return {"message": "Welcome, guest"}
```

---

## 7. **Database Usage**

### Track File Ownership

```python
# When user uploads a file
@router.post("/ingest")
async def ingest(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    # Save to database with user_id
    document = {
        "filename": file.filename,
        "user_id": user["id"],          # <-- Track ownership
        "uploaded_at": datetime.now(),
        "content": file_content
    }

    db.insert("documents", document)

    return {"status": "success"}
```

### Query User's Documents

```python
@router.get("/my-documents")
async def get_my_documents(user: dict = Depends(get_current_user)):
    user_id = user["id"]

    # Only return documents owned by this user
    documents = db.query(
        "SELECT * FROM documents WHERE user_id = ?",
        user_id
    )

    return {"documents": documents}
```

---

## 8. **Error Handling**

### When Token is Invalid/Expired

The middleware automatically returns:

```json
HTTP 401 Unauthorized
{
  "detail": "Invalid authentication credentials"
}
```

### When Token is Missing

```json
HTTP 401 Unauthorized
{
  "detail": "Not authenticated"
}
```

### Frontend Handles This

The frontend will:
1. Detect 401 error
2. Clear the session
3. Redirect to login page

---

## 9. **Testing Authentication**

### Test with cURL

```bash
# 1. Get a token (login via frontend, check DevTools → Application → Local Storage)
TOKEN="your-jwt-token-here"

# 2. Test protected endpoint
curl -X POST http://localhost:8000/api/ingest \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf"

# Should work if token is valid!
```

### Test in Frontend

1. Sign up / Login
2. Upload a file
3. Check backend logs - should see user_id
4. Check network tab - should see Authorization header

---

## 10. **Security Best Practices**

### ✅ DO:
- Use `service_role` key on backend (keeps it secret)
- Validate JWT on every protected endpoint
- Store `service_role` key in `.env` (never commit)
- Use HTTPS in production
- Set short token expiry times

### ❌ DON'T:
- Don't use `anon` key on backend
- Don't skip authentication on sensitive endpoints
- Don't store sensitive keys in frontend
- Don't trust client-side data without validation

---

## 11. **Multi-Tenancy / Data Isolation**

**Every user only sees their own data:**

```python
# BAD - Returns ALL documents (security issue!)
@router.get("/documents")
async def get_documents():
    return db.query("SELECT * FROM documents")

# GOOD - Returns only user's documents
@router.get("/documents")
async def get_documents(user: dict = Depends(get_current_user)):
    user_id = user["id"]
    return db.query(
        "SELECT * FROM documents WHERE user_id = ?",
        user_id
    )
```

**Always filter by `user_id` from the JWT token!**

---

## 12. **Row Level Security (RLS) in Supabase**

If you use Supabase for storage, you can enforce data isolation at the database level:

```sql
-- Enable RLS on documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Users can only see their own documents
CREATE POLICY "Users see own documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can only insert their own documents
CREATE POLICY "Users insert own documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

---

## 13. **Quick Reference**

### Require Authentication
```python
user: dict = Depends(get_current_user)
```

### Optional Authentication
```python
user: dict | None = Depends(get_current_user_optional)
```

### Get User ID
```python
user_id = user["id"]
```

### Get User Email
```python
email = user["email"]
```

---

## 14. **Troubleshooting**

### "401 Unauthorized" errors

**Check:**
1. Is user logged in? (Check frontend localStorage)
2. Is token being sent? (Check Network tab → Headers)
3. Is `SUPABASE_SERVICE_KEY` set in backend `.env`?
4. Is token expired? (Tokens expire after 1 hour by default)

### "Could not validate credentials"

**Possible causes:**
- Wrong `SUPABASE_URL` in backend
- Wrong `SUPABASE_SERVICE_KEY` (using anon instead of service_role)
- Token is expired or tampered with

---

## Summary

1. **Frontend**: Automatically sends JWT token in `Authorization` header
2. **Backend**: Validates token and extracts user info
3. **You get**: `user["id"]` and `user["email"]` in every protected endpoint
4. **Use it**: To track file ownership, filter data, implement multi-tenancy

**That's it!** The authentication is now fully integrated between frontend and backend.
