/**
 * Admin and wholesale must use one costing formula. Infrastructure remains
 * adapter-specific, but rounding, waste and nested BOM rules live in the
 * canonical wholesale-finance domain module.
 */
export * from "@/features/wholesale-finance/domain/standard-costing";
