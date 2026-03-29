# User Management

## Who can manage users

Only the **ADMIN** role. The "User Management" menu item in the header is rendered conditionally:

```tsx
{user?.role === "ADMIN" && (
  <DropdownMenuItem onSelect={() => setUserMgmtOpen(true)}>
    User Management
  </DropdownMenuItem>
)}
```

The Server Actions also enforce ADMIN role server-side via `requireRole(["ADMIN"])`.

---

## Accessing user management

Header → user icon (top right) → "User Management"

Opens `UserManagementDialog` (`src/components/kanban/user-management-dialog.tsx`).

---

## UserManagementDialog views

The dialog is a single component with four views controlled by local `view` state:

| View | `view` value | What's shown |
|---|---|---|
| User list | `"list"` | Table of all users with edit/delete/reset-password actions |
| Create user | `"create"` | Form to create a new user |
| Edit user | `"edit"` | Form to edit an existing user's details |
| Reset password | `"reset-password"` | Form to set a new password for a user |

The dialog title updates to match the current view. Navigation between views is handled by buttons within the dialog (e.g. "New User" → `"create"`, "Back" → `"list"`).

---

## Creating a user

**View:** `"create"` (accessed via "New User" button in list view)

**Fields:**
- First name (required)
- Last name (required)
- Username (required, must be unique)
- Password (required, min 6 characters)
- Role (select: ADMIN, USER, VIEWER)

**Server Action:** `createUser(data)` from `src/lib/auth-actions.ts`

Returns `{ success: false, error: "Username already exists" }` if the username is taken.

---

## Editing a user

**View:** `"edit"` (accessed via edit button on a user row)

**Editable fields:**
- First name
- Last name
- Username (uniqueness checked on submit)
- Role

**Not editable from this view:** password. Use the reset-password view instead.

**Server Action:** `updateUser(userId, data)` from `src/lib/auth-actions.ts`

**Note on role changes:** the role change takes effect on the target user's next authenticated request. Each Server Action re-reads the session cookie and looks up the user in the DB, so the new role is enforced immediately for any subsequent action.

---

## Resetting a password

**View:** `"reset-password"` (accessed via reset-password button on a user row)

An admin can set any user's password without knowing their current password.

**Field:** New password (required, min 6 characters)

**Server Action:** `resetPassword(userId, newPassword)` from `src/lib/auth-actions.ts`

**Note:** Resetting a password does not invalidate the user's existing session. The session cookie only stores `userId` — it does not encode the password hash. The user remains logged in with their existing cookie until it expires (7 days) or they log out.

---

## Deleting a user

Available from the user list via a delete button on each row.

The list shows an inline confirmation before calling `deleteUser(userId)`.

**Constraints:**
- An admin cannot delete their own account. The Server Action checks `if (currentUser.id === userId)` and returns `{ success: false, error: "You cannot delete your own account" }`.
- Deleting a user does not delete any tasks or boards they created (task history entries store the username as a plain string and are not foreign-keyed to the User table, so they persist after user deletion).

---

## Self-service: changing your own password

Any logged-in user (any role) can change their own password.

**Path:** Header → user icon → "Profile" → "Change Password" section

Opens `UserProfileDialog` (`src/components/kanban/user-profile-dialog.tsx`).

**Fields:**
- Current password (required — must match the stored hash)
- New password (required)

**Server Action:** `changePassword(currentPassword, newPassword)` from `src/lib/auth-actions.ts`

Returns `{ success: false, error: "Current password is incorrect" }` if the current password is wrong.

---

## Summary of user-related Server Actions

| Action | Caller | Required role |
|---|---|---|
| `login` | Login form | None (public) |
| `logout` | User menu | Any authenticated |
| `getCurrentUser` | AuthGuard on mount | Any authenticated |
| `createUser` | Create user dialog | ADMIN |
| `getUsers` | User management dialog on open | ADMIN |
| `updateUser` | Edit user dialog | ADMIN |
| `deleteUser` | User list delete button | ADMIN |
| `resetPassword` | Reset password dialog | ADMIN |
| `changePassword` | User profile dialog | Any authenticated |

See [server-actions.md](server-actions.md) for full signatures and return types.
