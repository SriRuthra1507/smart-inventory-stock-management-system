---
name: Inventory account scope
description: Authentication currently gates a shared inventory rather than partitioning records by account.
---

The inventory remains a single shared catalog for all signed-in accounts. Authentication gates access, but product records are not owned by an individual user or team.

**Why:** Login was added without changing the existing database schema or inventory behavior.

**How to apply:** Do not describe accounts as having private inventory. If the product needs per-user or per-team separation, design ownership, migrations, and authorization rules as a separate change.
