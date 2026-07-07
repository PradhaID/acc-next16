import "dotenv/config";
import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";

const ROLES = {
  SYSTEM: new ObjectId("670000000000000000000001"),
  LOGIN: new ObjectId("670000000000000000000002"),
  USER_MANAGEMENT: new ObjectId("670000000000000000000003"),
  ADD_USER: new ObjectId("670000000000000000000004"),
  EDIT_USER: new ObjectId("670000000000000000000005"),
  USER_DETAIL: new ObjectId("670000000000000000000006"),
  KICKOUT_USER: new ObjectId("670000000000000000000007"),
  GROUPS_MANAGEMENT: new ObjectId("670000000000000000000008"),
  ADD_GROUP: new ObjectId("670000000000000000000009"),
  EDIT_GROUP: new ObjectId("67000000000000000000000a"),
  MANAGE_ROLES: new ObjectId("67000000000000000000000b"),

  DASHBOARD: new ObjectId("670000000000000000000100"),
  SYSTEM_REPORT: new ObjectId("670000000000000000000101"),
  USER_GROUP_REPORT: new ObjectId("670000000000000000000102"),
  ACCOUNTING_REPORT: new ObjectId("670000000000000000000103"),

  ACCOUNTING: new ObjectId("670000000000000000000200"),
  COA: new ObjectId("670000000000000000000201"),
  ADD_COA: new ObjectId("670000000000000000000202"),
  EDIT_COA: new ObjectId("670000000000000000000203"),
  ACCOUNT: new ObjectId("670000000000000000000204"),
  ADD_ACCOUNT: new ObjectId("670000000000000000000205"),
  EDIT_ACCOUNT: new ObjectId("670000000000000000000206"),
  ACCOUNT_DETAIL: new ObjectId("670000000000000000000207"),
  TRANSACTION: new ObjectId("670000000000000000000208"),
  CREATE_TRANSACTION: new ObjectId("670000000000000000000209"),
  EDIT_TRANSACTION: new ObjectId("67000000000000000000020a"),
  CONFIRM_TRANSACTION: new ObjectId("67000000000000000000020b"),
  LEDGER: new ObjectId("67000000000000000000020c"),
  BALANCE_SHEET: new ObjectId("67000000000000000000020d"),
  BALANCE_SHEET_PDF: new ObjectId("67000000000000000000020e"),
  BALANCE_SHEET_XLSX: new ObjectId("67000000000000000000020f"),
  INCOME_STATEMENT: new ObjectId("670000000000000000000210"),
  INCOME_STATEMENT_PDF: new ObjectId("670000000000000000000211"),
  INCOME_STATEMENT_XLSX: new ObjectId("670000000000000000000212"),
  CLOSING: new ObjectId("670000000000000000000213"),
  COA_PDF: new ObjectId("670000000000000000000214"),
  COA_XLSX: new ObjectId("670000000000000000000215"),
  ACCOUNT_PDF: new ObjectId("670000000000000000000216"),
  ACCOUNT_XLSX: new ObjectId("670000000000000000000217"),
};

const ADMIN_GROUP = new ObjectId("670000000000000000000010");
const ALL_ROLE_IDS = Object.values(ROLES);

async function seed() {
  const db = await getDb();
  const groups = db.collection("systemGroups");
  const roles = db.collection("systemRoles");
  const groupHasRole = db.collection("systemGroupHasRole");

  // Drop collections entirely (removes data + indexes)
  await roles.drop().catch(() => {});
  await groupHasRole.drop().catch(() => {});

  const now = new Date();

  await groups.updateOne(
    { _id: ADMIN_GROUP },
    {
      $setOnInsert: {
        _id: ADMIN_GROUP,
        name: "Administrators",
        description: "Full system access",
        created: { at: now, by: null },
        updated: { at: now, by: null },
      },
    },
    { upsert: true }
  );

  const roleDocs = [
    // ─── System ───────────────────────────────────────────
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
      _id: ROLES.GROUPS_MANAGEMENT,
      parent: ROLES.SYSTEM,
      name: "Groups Management",
      description: "Group management section",
      url: "/system/group",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.ADD_GROUP,
      parent: ROLES.GROUPS_MANAGEMENT,
      name: "Add Group",
      description: "Create new groups",
      url: "/system/groups/add",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.EDIT_GROUP,
      parent: ROLES.GROUPS_MANAGEMENT,
      name: "Edit Group",
      description: "Modify existing group details",
      url: "/system/groups/edit",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.MANAGE_ROLES,
      parent: ROLES.GROUPS_MANAGEMENT,
      name: "Manage Roles of Group",
      description: "Update RBAC group role assignments",
      url: "/system/group/roles",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.USER_MANAGEMENT,
      parent: ROLES.SYSTEM,
      name: "User Management",
      description: "User management section",
      url: "/system/users",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.ADD_USER,
      parent: ROLES.USER_MANAGEMENT,
      name: "Add User",
      description: "Create new users",
      url: "/system/users/add",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.EDIT_USER,
      parent: ROLES.USER_MANAGEMENT,
      name: "Edit User",
      description: "Modify existing user details",
      url: "/system/users/edit",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.USER_DETAIL,
      parent: ROLES.USER_MANAGEMENT,
      name: "User Detail",
      description: "View user details",
      url: "/system/users/detail",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.KICKOUT_USER,
      parent: ROLES.USER_MANAGEMENT,
      name: "Kickout User",
      description: "Remove user session",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },

    // ─── Dashboard ────────────────────────────────────────
    {
      _id: ROLES.DASHBOARD,
      parent: null,
      name: "Dashboard",
      description: "Dashboard module access",
      url: "/dashboard",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.SYSTEM_REPORT,
      parent: ROLES.DASHBOARD,
      name: "System Report",
      description: "View system reports",
      url: "/dashboard/system",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.USER_GROUP_REPORT,
      parent: ROLES.DASHBOARD,
      name: "User and Group Report",
      description: "View user and group reports",
      url: "/dashboard/user-group",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.ACCOUNTING_REPORT,
      parent: ROLES.DASHBOARD,
      name: "Accounting Report",
      description: "View accounting reports",
      url: "/dashboard/accounting",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },

    // ─── Accounting ───────────────────────────────────────
    {
      _id: ROLES.ACCOUNTING,
      parent: null,
      name: "Accounting",
      description: "Accounting module access",
      url: "/accounting",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.COA,
      parent: ROLES.ACCOUNTING,
      name: "CoA",
      description: "Manage chart of accounts",
      url: "/accounting/coa",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.ADD_COA,
      parent: ROLES.COA,
      name: "Add CoA",
      description: "Create new chart of accounts entries",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.EDIT_COA,
      parent: ROLES.COA,
      name: "Edit CoA",
      description: "Modify existing chart of accounts entries",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.COA_PDF,
      parent: ROLES.COA,
      name: "Print PDF",
      description: "Download chart of accounts as PDF",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.COA_XLSX,
      parent: ROLES.COA,
      name: "Download Excel",
      description: "Download chart of accounts as XLSX",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.ACCOUNT,
      parent: ROLES.ACCOUNTING,
      name: "Account",
      description: "Manage ledger accounts",
      url: "/accounting/account",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.ADD_ACCOUNT,
      parent: ROLES.ACCOUNT,
      name: "Add Account",
      description: "Create new ledger accounts",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.EDIT_ACCOUNT,
      parent: ROLES.ACCOUNT,
      name: "Edit Account",
      description: "Modify existing ledger accounts",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.ACCOUNT_DETAIL,
      parent: ROLES.ACCOUNT,
      name: "Account Detail",
      description: "View account details",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.ACCOUNT_PDF,
      parent: ROLES.ACCOUNT,
      name: "Print PDF",
      description: "Download accounts list as PDF",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.ACCOUNT_XLSX,
      parent: ROLES.ACCOUNT,
      name: "Download Excel",
      description: "Download accounts list as XLSX",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.TRANSACTION,
      parent: ROLES.ACCOUNTING,
      name: "Transaction",
      description: "Manage journal entries",
      url: "/accounting/transaction",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.CREATE_TRANSACTION,
      parent: ROLES.TRANSACTION,
      name: "Create Transaction",
      description: "Create new journal entries",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.EDIT_TRANSACTION,
      parent: ROLES.TRANSACTION,
      name: "Edit Transaction",
      description: "Modify pending journal entries",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.CONFIRM_TRANSACTION,
      parent: ROLES.TRANSACTION,
      name: "Confirm Transaction",
      description: "Confirm pending journal entries",
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
      _id: ROLES.BALANCE_SHEET_PDF,
      parent: ROLES.BALANCE_SHEET,
      name: "Print PDF",
      description: "Download balance sheet as PDF",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.BALANCE_SHEET_XLSX,
      parent: ROLES.BALANCE_SHEET,
      name: "Download Excel",
      description: "Download balance sheet as XLSX",
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
      _id: ROLES.INCOME_STATEMENT_PDF,
      parent: ROLES.INCOME_STATEMENT,
      name: "Print PDF",
      description: "Download income statement as PDF",
      created: { at: now, by: null },
      updated: { at: now, by: null },
    },
    {
      _id: ROLES.INCOME_STATEMENT_XLSX,
      parent: ROLES.INCOME_STATEMENT,
      name: "Download Excel",
      description: "Download income statement as XLSX",
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

  await roles.insertMany(roleDocs);

  // Link all roles to Administrators group
  const hasRoleDocs = ALL_ROLE_IDS.map((roleId) => ({
    _id: new ObjectId(),
    groupId: ADMIN_GROUP,
    roleId,
    created: { at: now, by: null },
  }));
  await groupHasRole.insertMany(hasRoleDocs);

  // Create compound index
  await groupHasRole.createIndex({ groupId: 1, roleId: 1 }, { unique: true });

  console.log(`Seed complete: ${roleDocs.length} roles upserted and linked to Administrators group.`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
