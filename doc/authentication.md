# Authentication & Authorization

## Overview

Session-based authentication implemented without third-party auth libraries. All logic lives in two files:

- `src/lib/auth.ts` — password hashing, session cookie management, `requireAuth`/`requireRole` guards
- `src/lib/auth-actions.ts` — Server Actions that expose auth operations to client code

## Password hashing

Passwords are hashed using **PBKDF2-SHA512** via the Web Crypto API (`crypto.subtle`).

| Parameter | Value |
|---|---|
| Algorithm | PBKDF2 |
| Hash | SHA-512 |
| Iterations | 100,000 |
| Salt length | 16 bytes (random per password) |
| Key length | 64 bytes |

Stored format in the database: `saltHex:hashHex`

```ts
// src/lib/auth.ts
export async function hashPassword(password: string): Promise<string>
export async function verifyPassword(password: string, storedHash: string): Promise<boolean>
```

**Security note:** `verifyPassword` re-derives the hash and compares hex strings with `===`. This is not constant-time comparison — it is theoretically vulnerable to timing attacks. For an internal tool this is acceptable; for a public-facing service, use `crypto.timingSafeEqual`.

## Session management

### Creating a session

On successful login, `createSession(userId)` generates a 32-byte random session token, encodes it in a base64 JSON payload, and sets an HTTP-only cookie:

```
Cookie name:   kanban_session
Cookie value:  base64(JSON.stringify({ userId, token, createdAt }))
Flags:         httpOnly: true
               secure: true (in production only)
               sameSite: "lax"
               path: "/"
               maxAge: 604800 (7 days)
```

### Validating a session

`getSession()` is called on every authenticated request:

1. Read the `kanban_session` cookie.
2. Base64-decode and JSON-parse the value.
3. Extract `userId`.
4. Call `prisma.user.findUnique({ where: { id: userId } })`.
5. Return the `SafeUser` (without `passwordHash`) or `null`.

The `token` field stored in the cookie is **not validated server-side**. The only check is that `userId` resolves to a real user in the database. This means a cookie cannot be invalidated server-side (other than by deleting the user). Logout works by deleting the cookie client-side.

### Session helpers

```ts
// src/lib/auth.ts
export async function createSession(userId: string): Promise<void>
export async function getSession(): Promise<SafeUser | null>
export async function clearSession(): Promise<void>

// Guards used inside Server Actions
export async function requireAuth(): Promise<SafeUser>           // throws "Unauthorized" if no session
export async function requireRole(allowedRoles: string[]): Promise<SafeUser>  // throws "Forbidden" if role not in list
```

## Role-based access control

Three roles stored as plain strings in the `User.role` field:

| Action | ADMIN | USER | VIEWER |
|---|---|---|---|
| View boards | yes | yes | yes |
| Create / edit / delete tasks | yes | yes | no |
| Drag tasks between columns | yes | yes | no |
| Create / edit / delete columns | yes | no | no |
| Drag columns | yes | no | no |
| Create / edit / delete boards | yes | no | no |
| Manage users | yes | no | no |
| Change own password | yes | yes | yes |

Role checks are enforced **server-side** in every Server Action using `requireRole(["ADMIN"])` or `requireRole(["ADMIN", "USER"])`. The UI also conditionally hides controls based on role (read from `useAuthStore`), but UI hiding alone is not a security boundary.

### Checking role in UI

```ts
const { user } = useAuthStore();
const isAdmin = user?.role === "ADMIN";
const isViewer = user?.role === "VIEWER";
```

## Client-side auth state

The `useAuthStore` Zustand store (see [state-management.md](state-management.md)) holds the current user. The `AuthGuard` component gates the entire application:

- Calls `initialize()` on mount (once).
- Renders a spinner while `!isInitialized || isLoading`.
- Renders `<LoginForm />` if `user === null`.
- Renders children if `user` is set.

The `isInitialized` flag prevents a flash of the login form during the initial session check.

## Security notes

This implementation is appropriate for an internal or development tool. Before public deployment, consider:

1. **No CSRF protection** beyond `sameSite: "lax"`. Add CSRF tokens for state-mutating actions if the app becomes public-facing.
2. **Token not validated server-side.** The session token in the cookie is a random string but is never checked against a server-side store. Add a server-side token store if you need forced logout or session revocation.
3. **No rate limiting** on the `login()` Server Action. Add rate limiting (e.g. via middleware) before exposing to the internet.
4. **Minimum password length is 6 characters** (enforced only in `resetPassword`). Consider enforcing this in `createUser` and `changePassword` as well.
5. **Non-constant-time password comparison.** See the note in the Password hashing section above.
