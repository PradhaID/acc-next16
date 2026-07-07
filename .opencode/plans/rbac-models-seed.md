# RBAC Models + Seed Plan

## 1. Model restructure

```
lib/models/
  index.ts              ← re-exports everything
  emailOtp.ts           ← unchanged
  system/
    index.ts            ← re-exports user, group, role
    user.ts             ← SystemUser (moved + updated)
    group.ts            ← SystemGroup (new)
    role.ts             ← SystemRole with parent tree (new)
```

## 2. New file contents

### `lib/models/system/user.ts`
```ts
import { ObjectId } from "mongodb";

export interface SystemUser {
  _id: ObjectId;
  username: string;
  fullName: string;
  email: string;
  password: string;
  emailVerified: boolean;
  groupId: ObjectId | null;
  created: { at: Date; by: ObjectId | null };
  updated: { at: Date; by: ObjectId };
}
```

### `lib/models/system/group.ts`
```ts
import { ObjectId } from "mongodb";

export interface SystemGroup {
  _id: ObjectId;
  name: string;
  description?: string;
  created: { at: Date; by: ObjectId };
  updated: { at: Date; by: ObjectId };
}
```

### `lib/models/system/role.ts`
```ts
import { ObjectId } from "mongodb";

export interface SystemRole {
  _id: ObjectId;
  groupId: ObjectId;
  parent: ObjectId | null;
  name: string;
  description?: string;
  created: { at: Date; by: ObjectId };
  updated: { at: Date; by: ObjectId };
}
```

### `lib/models/system/index.ts`
```ts
export type { SystemUser } from "./user";
export type { SystemGroup } from "./group";
export type { SystemRole } from "./role";
```

### `lib/models/index.ts` (updated)
```ts
export type { EmailOtp } from "./emailOtp";
export type { SystemUser, SystemGroup, SystemRole } from "./system";
```

## 3. Role seed hierarchy (in `lib/seed.ts`)

Pre-generated ObjectIds for stable parent references:

| Hex suffix | Name | Parent |
|-----------|------|--------|
| 01 | System | null |
| 02 | Login | System (01) |
| 03 | Users | System (01) |
| 04 | Add User | Users (03) |
| 05 | Edit User | Users (03) |
| 06 | User Details | Users (03) |
| 07 | Kickout User | Users (03) |
| 08 | Groups | System (01) |
| 09 | Add Group | Groups (08) |
| 0a | Edit Group | Groups (08) |
| 0b | Group Roles | Groups (08) |

Seed logic: check if `"Administrators"` group exists → if not, create it + insert all 11 roles with correct `parent` and `groupId`. Idempotent.

## 4. `lib/seed.ts` structure

```ts
import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";

const GROUP_ID = new ObjectId("670000000000000000000001");
const SYSTEM_ID = new ObjectId("670000000000000000000002");
// ... all role ObjectIds

const ROLES = [
  { _id: SYSTEM_ID,  groupId: GROUP_ID, parent: null,   name: "System" },
  { _id: LOGIN,      groupId: GROUP_ID, parent: SYSTEM_ID, name: "Login" },
  // ... etc
];

export async function seed() {
  const db = await getDb();
  // upsert group + roles
}
```

Add to `package.json`: `"seed": "tsx lib/seed.ts"`

## 5. Route changes

### `app/api/auth/signup/route.ts`
- Import from `@/lib/models` instead of `@/lib/models/systemUser`
- Change insert:
  ```ts
  created: { at: now, by: null }, // self-registered
  groupId: null,
  ```

### `app/api/auth/signin/route.ts` + `verify-otp/route.ts`
- Import type from `@/lib/models` instead of old path

### Delete `lib/models/systemUser.ts` (moved to `lib/models/system/user.ts`)

## 6. Verification
- `npm run lint && npx tsc --noEmit`
- `npm run seed` (run once to populate DB)
