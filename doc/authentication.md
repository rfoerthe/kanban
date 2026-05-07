# Authentication & Authorization

## Overview

Authentication is implemented without a third-party auth library.

- `src/lib/auth.ts` contains password hashing, cookie session helpers, and role guards.
- `src/lib/auth-actions.ts` exposes login/logout/user/password server actions.
- `src/lib/auth-store.ts` keeps the authenticated user in client state.

## Password hashing

Passwords are hashed using **PBKDF2-SHA512** through the Web Crypto API.

| Parameter | Value |
|---|---|
| Algorithm | PBKDF2 |
| Hash | SHA-512 |
| Iterations | 100,000 |
| Salt length | 16 bytes |
| Key length | 64 bytes |

Stored format:

```text
saltHex:hashHex
```

Core helpers:

```ts
hashPassword(password)
verifyPassword(password, storedHash)
```

## Session management

### Cookie format

On successful login, `createSession(userId)` stores an HTTP-only cookie named `kanban_session`.

The cookie value is base64-encoded JSON shaped like:

```json
{ "userId": "...", "token": "...", "createdAt": 1234567890 }
```

Cookie settings:

- `httpOnly: true`
- `secure: process.env.NODE_ENV === "production"`
- `sameSite: "lax"`
- `path: "/"`
- `maxAge: 7 days`

### Session validation

`getSession()` does the following:

1. Reads `kanban_session`
2. Base64-decodes the payload
3. Extracts `userId`
4. Looks up the user in Prisma
5. Returns a safe user object or `null`

Important limitation: the stored `token` and `createdAt` values are currently **not validated** server-side. The effective session check is just “does this cookie decode, and does `userId` still exist?”

### Session helpers

```ts
createSession(userId)
getSession()
clearSession()
requireAuth()
requireRole(allowedRoles)
```

`requireAuth()` throws `Error("Unauthorized")` when no user is available.

`requireRole()` throws `Error("Forbidden")` if the session user’s role is not allowed.

## Login/logout flow

### Login

`login(username, password)` in `src/lib/auth-actions.ts`:

1. Looks up the user by username
2. Verifies the password hash
3. Calls `createSession(user.id)`
4. Returns `{ success: true, user }`

On failure it returns the generic message:

```text
Invalid username or password
```

### Logout

`logout()` calls `clearSession()`, which deletes the cookie.

## Client-side auth state

`useAuthStore` keeps:

- `user`
- `isLoading`
- `isInitialized`

`AuthGuard` uses this store to gate the app:

- While auth is initializing, it renders a spinner.
- If no user exists, it renders `LoginForm`.
- If a user exists, it renders the application shell.

After authentication succeeds, the feature stores fetch domain data.

## Roles

Roles are stored as plain strings in `User.role`:

- `ADMIN`
- `USER`
- `VIEWER`

This is enforced at the application layer, not as a Prisma enum.

## Authorization model

### Broad permissions

| Capability | ADMIN | USER | VIEWER |
|---|---|---|---|
| View boards and tasks | yes | yes | yes |
| Create/edit/delete backlog tasks | yes | yes | no |
| Create/edit/delete board tasks | yes | yes | no |
| Assign or unassign tasks to boards | yes | yes | no |
| Drag tasks between columns | yes | yes | no |
| Create/rename/delete columns | yes | no | no |
| Create/rename/delete boards | yes | no | no |
| Manage users | yes | no | no |
| Change own password | yes | yes | yes |

### UI enforcement

The UI hides or disables actions based on the current role. Examples:

- `VIEWER` cannot create, edit, delete, or drag tasks.
- Only `ADMIN` sees board management and user management controls.
- Both `BoardHeader` and `TasksView` expose the profile/user menu.

### Server-side enforcement

The real security boundary is the server action layer:

- `requireAuth()` for authenticated reads
- `requireRole(["ADMIN"])` for admin-only writes
- `requireRole(["ADMIN", "USER"])` for most task mutations

## User and password operations

Implemented in `src/lib/auth-actions.ts`:

- `createUser(data)` — admin only
- `getUsers()` — admin only
- `updateUser(userId, data)` — admin only
- `deleteUser(userId)` — admin only, cannot delete self
- `resetPassword(userId, newPassword)` — admin only
- `changePassword(currentPassword, newPassword)` — any authenticated user

Password length validation is enforced in the auth actions for reset flows and also reinforced in the client dialogs.

## Security notes

This implementation is suitable for internal use or low-risk deployments, but it has important tradeoffs:

1. **No server-side session store.** Sessions cannot be centrally revoked.
2. **Token and createdAt are not validated.** The cookie payload carries more data than the server currently checks.
3. **No CSRF-specific protection** beyond `sameSite: "lax"`.
4. **No rate limiting** on login.
5. **Password comparison uses `===` on hex strings**, not a timing-safe comparison.

If the app becomes public-facing, those areas should be hardened first.
