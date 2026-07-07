import "dotenv/config";
import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";

const ROLES = {
  SYSTEM: new ObjectId("670000000000000000000001"),
  LOGIN: new ObjectId("670000000000000000000002"),
  USERS: new ObjectId("670000000000000000000003"),
  ADD_USER: new ObjectId("670000000000000000000004"),
  EDIT_USER: new ObjectId("670000000000000000000005"),
  USER_DETAILS: new ObjectId("670000000000000000000006"),
  KICKOUT_USER: new ObjectId("670000000000000000000007"),
  GROUPS: new ObjectId("670000000000000000000008"),
  ADD_GROUP: new ObjectId("670000000000000000000009"),
  EDIT_GROUP: new ObjectId("67000000000000000000000a"),
  GROUP_ROLES: new ObjectId("67000000000000000000000b"),

  // Accounting roles
  ACCOUNTING: new ObjectId("670000000000000000000100"),
  COA: new ObjectId("670000000000000000000101"),
  ACCOUNT: new ObjectId("670000000000000000000102"),
  TRANSACTION: new ObjectId("670000000000000000000103"),
  LEDGER: new ObjectId("670000000000000000000104"),
  BALANCE_SHEET: new ObjectId("670000000000000000000105"),
  INCOME_STATEMENT: new ObjectId("670000000000000000000106"),
  CLOSING: new ObjectId("670000000000000000000107"),
};

const ADMIN_GROUP = new ObjectId("670000000000000000000010");
const ALL_ROLE_IDS = Object.values(ROLES);

async function seed() {
  const db = await getDb();
  const groups = db.collection("systemGroups");
  const roles = db.collection("systemRoles");
  const groupHasRole = db.collection("systemGroupHasRole");

  const existing = await groups.findOne({ _id: ADMIN_GROUP });
  if (!existing) {
    const now = new Date();
    await groups.insertOne({
      _id: ADMIN_GROUP,
      name: "Administrators",
      description: "Full system access",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    });
  }

  const now = new Date();

  const roleDocs = [
    {
      _id: ROLES.SYSTEM,
      parent: null,
      name: "System",
      description: "Root system role",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.LOGIN,
      parent: ROLES.SYSTEM,
      name: "Login",
      description: "When disabled user cannot sign in",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.USERS,
      parent: ROLES.SYSTEM,
      name: "Users",
      description: "User management section",
      url: "/system/users",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.ADD_USER,
      parent: ROLES.USERS,
      name: "Add User",
      description: "Create new users",
      url: "/system/users/add",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.EDIT_USER,
      parent: ROLES.USERS,
      name: "Edit User",
      description: "Modify existing user details",
      url: "/system/users/edit",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.USER_DETAILS,
      parent: ROLES.USERS,
      name: "User Details",
      description: "View user details",
      url: "/system/users/detail",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.KICKOUT_USER,
      parent: ROLES.USERS,
      name: "Kickout User",
      description: "Remove user session",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.GROUPS,
      parent: ROLES.SYSTEM,
      name: "Groups",
      description: "Group management section",
      url: "/system/groups",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.ADD_GROUP,
      parent: ROLES.GROUPS,
      name: "Add Group",
      description: "Create new groups",
      url: "/system/groups/add",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.EDIT_GROUP,
      parent: ROLES.GROUPS,
      name: "Edit Group",
      description: "Modify existing group details",
      url: "/system/groups/edit",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.GROUP_ROLES,
      parent: ROLES.GROUPS,
      name: "Group Roles",
      description: "Update RBAC group role assignments",
      url: "/system/groups/roles",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    // Accounting roles
    {
      _id: ROLES.ACCOUNTING,
      parent: ROLES.SYSTEM,
      name: "Accounting",
      description: "Accounting module access",
      url: "/accounting",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.COA,
      parent: ROLES.ACCOUNTING,
      name: "Chart of Accounts",
      description: "Manage chart of accounts",
      url: "/accounting/coa",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.ACCOUNT,
      parent: ROLES.ACCOUNTING,
      name: "Accounts",
      description: "Manage ledger accounts",
      url: "/accounting/account",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.TRANSACTION,
      parent: ROLES.ACCOUNTING,
      name: "Transactions",
      description: "Manage journal entries",
      url: "/accounting/transaction",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.LEDGER,
      parent: ROLES.ACCOUNTING,
      name: "Ledger",
      description: "View general ledger",
      url: "/accounting/ledger",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.BALANCE_SHEET,
      parent: ROLES.ACCOUNTING,
      name: "Balance Sheet",
      description: "View balance sheet",
      url: "/accounting/balance-sheet",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.INCOME_STATEMENT,
      parent: ROLES.ACCOUNTING,
      name: "Income Statement",
      description: "View income statement",
      url: "/accounting/income-statement",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.CLOSING,
      parent: ROLES.ACCOUNTING,
      name: "Closing",
      description: "Year-end closing",
      url: "/accounting/closing",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
  ];

  const roleOps = roleDocs.map((doc) => ({
    updateOne: {
      filter: { _id: doc._id },
      update: { $set: doc },
      upsert: true,
    },
  }));
  await roles.bulkWrite(roleOps);

  // Link all roles to Administrators group
  const hasRoleOps = ALL_ROLE_IDS.map((roleId) => ({
    updateOne: {
      filter: { groupId: ADMIN_GROUP, roleId },
      update: {
        $setOnInsert: {
          _id: new ObjectId(),
          groupId: ADMIN_GROUP,
          roleId,
          created: { at: now, by: null },
        },
      },
      upsert: true,
    },
  }));
  await groupHasRole.bulkWrite(hasRoleOps);

  // Create compound index
  await groupHasRole.createIndex({ groupId: 1, roleId: 1 }, { unique: true });

  console.log("Seed complete: Administrators group, roles, and group-role relations upserted.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
