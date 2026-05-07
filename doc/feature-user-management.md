# User Management

## Who can manage users

Only users with the `ADMIN` role.

Both the UI and the server actions enforce this.

## Where the feature is exposed

The **User Management** entry is reachable from both authenticated headers:

- `src/components/kanban/board-header.tsx`
- `src/components/kanban/tasks-view.tsx`

Both open the same modal component:

- `src/components/kanban/user-management-dialog.tsx`

## Dialog structure

`UserManagementDialog` is a single modal with four internal views:

| View | Meaning |
|---|---|
| `list` | user table with actions |
| `create` | create a new user |
| `edit` | edit identity/role fields |
| `reset-password` | admin password reset |

## User list

The list view:

- loads users through `getUsers()` when the dialog opens
- shows name, username, and role
- exposes actions per row:
  - edit
  - reset password
  - delete (except for the current admin user)

## Creating a user

Backed by `createUser(data)`.

Fields:

- first name
- last name
- username
- password
- role

Validation:

- all fields required
- password minimum length: 6
- username must be unique

## Editing a user

Backed by `updateUser(userId, data)`.

Editable fields:

- first name
- last name
- username
- role

Not editable here:

- password

Use the reset-password view for that.

## Resetting a user password

Backed by `resetPassword(userId, newPassword)`.

Rules:

- admin only
- password must be at least 6 characters

This does **not** invalidate any current cookie session for that user, because the session system does not keep a server-side token store.

## Deleting a user

Backed by `deleteUser(userId)`.

Rules:

- admin cannot delete their own account
- missing users return a structured error

Database effect:

- assigned tasks become unassigned because `Task.assignee` uses `onDelete: SetNull`
- task history remains, because history stores username text directly

## Self-service profile and password change

This is separate from admin user management.

Any authenticated user can open **Profile** and use `changePassword(currentPassword, newPassword)`.

UI entry points:

- board header profile menu
- tasks view profile menu

Component:

- `src/components/kanban/user-profile-dialog.tsx`

## Related server actions

| Action | Role required |
|---|---|
| `login` | public |
| `logout` | authenticated |
| `getCurrentUser` | authenticated session lookup |
| `createUser` | `ADMIN` |
| `getUsers` | `ADMIN` |
| `updateUser` | `ADMIN` |
| `deleteUser` | `ADMIN` |
| `resetPassword` | `ADMIN` |
| `changePassword` | any authenticated user |
