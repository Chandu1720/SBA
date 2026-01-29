# Kits Permissions Setup Guide

## Permissions Created

The following permissions have been created for the Kits module:

| Permission | Description |
|-----------|-------------|
| `kits:view` | View all kits |
| `kits:create` | Create new kits |
| `kits:edit` | Edit existing kits |
| `kits:delete` | Delete kits |

## How to Add Kit Permissions to Your Database

### Option 1: Run the Add Permissions Script (Recommended)

This is the safest way to add permissions without affecting existing data:

```bash
cd server
npm run add-kit-permissions
```

**Output:**
```
MongoDB connected
✓ Created permission: kits:view
✓ Created permission: kits:create
✓ Created permission: kits:edit
✓ Created permission: kits:delete

Kit permissions setup complete!
MongoDB connection closed
```

### Option 2: Reseed the Database

This will reset all permissions and create new ones (only if needed):

```bash
cd server
npm run seed
```

**⚠️ Warning:** This will delete all existing permissions and users!

### Option 3: Manual Database Entry

If you want to add permissions manually via MongoDB shell:

```javascript
db.permissions.insertMany([
  { name: 'kits:view', description: 'View kits' },
  { name: 'kits:create', description: 'Create kits' },
  { name: 'kits:edit', description: 'Edit kits' },
  { name: 'kits:delete', description: 'Delete kits' }
])
```

## Assigning Permissions to Users

Once permissions are created, assign them to users through:

1. **Admin Panel** - Manage user permissions through the UI
2. **API Endpoint** - Use PUT `/api/permissions/users/:id/permissions`
3. **MongoDB** - Directly update user document

### Example API Call:

```bash
PUT /api/permissions/users/:userId/permissions
Content-Type: application/json
Authorization: Bearer <admin_token>

{
  "permissions": [
    "kits:view",
    "kits:create",
    "kits:edit",
    "kits:delete"
  ]
}
```

## Permission Checking in Frontend

The Kits component automatically checks permissions:

```typescript
const canCreate = user?.permissions.includes('kits:create');
const canEdit = user?.permissions.includes('kits:edit');
const canDelete = user?.permissions.includes('kits:delete');
```

UI elements are shown/hidden based on these checks.

## Permission Checking in Backend

All kit routes require appropriate permissions:

```javascript
// View kits
router.get('/', [auth, authorize(['kits:view'])], ...)

// Create kit
router.post('/', [auth, authorize(['kits:create'])], ...)

// Edit kit
router.put('/:id', [auth, authorize(['kits:edit'])], ...)

// Delete kit
router.delete('/:id', [auth, authorize(['kits:delete'])], ...)
```

## Verification

To verify permissions were added successfully:

### Check via API:

```bash
GET /api/permissions
Authorization: Bearer <admin_token>
```

Look for:
```json
[
  { "_id": "...", "name": "kits:view", "description": "View kits" },
  { "_id": "...", "name": "kits:create", "description": "Create kits" },
  { "_id": "...", "name": "kits:edit", "description": "Edit kits" },
  { "_id": "...", "name": "kits:delete", "description": "Delete kits" }
]
```

### Check via MongoDB:

```javascript
db.permissions.find({ name: /^kits:/ }).pretty()
```

Should return 4 documents with kit permissions.

## Default Roles & Permissions

### Admin Role
- Gets all permissions automatically (bypasses permission checks in middleware)

### Regular User Role
- Only gets assigned permissions explicitly
- Permissions are stored in user document and decoded in JWT token
- Frontend checks `user.permissions` array from JWT

## Files Modified

1. **server/seed.js** - Added kit permissions to seed data
2. **server/package.json** - Added `add-kit-permissions` npm script
3. **server/scripts/addKitPermissions.js** - New script to add permissions
4. **bms-frontend-ts/src/components/Kits/Kits.tsx** - Already uses permission checks
5. **server/routes/kits.js** - Already uses permission middleware

## Next Steps

1. Run the permission setup: `npm run add-kit-permissions`
2. Assign permissions to regular users via admin panel
3. Test by logging in with different user roles
4. Verify UI buttons appear/disappear based on permissions

## Troubleshooting

### Button not appearing?
- Check user has `kits:create` permission
- Clear browser cache and refresh
- Verify JWT token contains permission

### Getting "Unauthorized" error?
- Ensure backend route has correct authorization middleware
- Check permission name matches exactly (case-sensitive)
- Verify user JWT was refreshed after permission changes

### Permissions not reflecting immediately?
- Logout and login again to refresh JWT token
- JWT token might be cached - clear cookies
- Check token expiration time

