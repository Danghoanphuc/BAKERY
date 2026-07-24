# Finance domain

The module separates business rules from Firestore and HTTP concerns:

- `domain/`: deterministic money, costing, allocation and recognition rules.
- `application/`: use cases and repository ports.
- `infrastructure/`: Firestore adapters.

## Costing conventions

- VND totals are safe integers.
- Ingredient quantities use base units: gram, millilitre or each.
- Ingredient unit prices use micro-VND per base unit to avoid floating point loss.
- Recipes are immutable versions. Exactly one version per product should be active.
- An order item stores a financial snapshot; later ingredient or recipe changes must not
  change historical profitability.
- Orders without a recipe use legacy product costs and are marked `legacy`; products
  without any cost are marked `missing`.

## Firestore collections

- `finance_ingredients`
- `finance_recipe_versions`
- `finance_ingredient_cost_versions`
- `finance_payments`
- `finance_ledger_entries`
- `finance_audit_log`
- `inventory_balances`
- `inventory_movements`
- `purchase_receipts`
- `production_batches`
- `inventory_waste_records`
- `management_cost_centers`
- `management_allocation_policies`
- `management_monthly_budgets`

Recipe activation retires the product's previous versions. Draft versions can be edited
through future use cases; posted order snapshots and ledger entries are never edited.

Inventory balances store both quantity and total inventory value. Purchases use moving
weighted-average costing; issues consume a proportional integer VND value, with the final
issue consuming the exact remaining value. Production defects are absorbed into the cost
of good output and also remain visible on the batch as `damagedQuantity`.

## Management accounting

Expenses are classified independently by behavior (`fixed`, `variable`, `mixed`),
traceability (`direct`, `indirect`), function and cost center. Mixed costs store their
variable portion in basis points. The management waterfall is:

`net revenue - variable costs = contribution profit - direct fixed costs = controllable
profit - allocated indirect fixed costs = operating profit`.

Allocation policies and monthly budgets are versioned. Only active policies effective in
the reporting period and the approved budget version affect reports. Integer allocation
uses largest remainder so allocated VND always equals the source amount. Scenario
simulation is a pure calculation and never writes to actual accounting data.
