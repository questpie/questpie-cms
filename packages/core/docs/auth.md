# Authentication

QUESTPIE CMS integrates **Better Auth** deeply into the core. You don't need to manually set up adapters or session management; it's all wired up.

## Default Collections

The system automatically registers the following collections to store auth data:
*   `user`: Users and profiles.
*   `session`: Active sessions.
*   `account`: Social login links.
*   `verification`: OTPs and magic links.

## Configuration

Configure auth in your `CMS` initialization:

```typescript
const cms = new CMS({
  // ...
  auth: {
    // Standard Better Auth options
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_ID,
        clientSecret: process.env.GITHUB_SECRET,
      },
    },
    // Plugins like 'admin' and 'bearer' are enabled by default!
  }
});
```

## Using Auth in Your App

### 1. In Hooks & Context
Every request context has the `user` and `session` populated.

```typescript
.hooks({
  beforeCreate: ({ context }) => {
    if (!context.user) throw new Error("Unauthorized");
    console.log("User:", context.user.email);
  }
})
```

### 2. In API Routes
The `qcms` plugin mounts the auth handler at `/api/auth/*`. You can use the Better Auth client in your frontend to sign in/out.

```typescript
// Frontend example (using better-auth/client)
await authClient.signIn.social({ provider: "github" });
```

### 3. Permissions
Use the `user` object in your collection access control rules.

```typescript
.access({
  delete: ({ user }) => user?.role === 'admin'
})
```
