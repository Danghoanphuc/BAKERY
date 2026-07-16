import type { Product, ProductWorkspaceCardConfig, ProductWorkspaceCardId } from "@/types";

export const workspaceIllustrationCardIds: ProductWorkspaceCardId[] = [
  "sales",
  "production",
  "finance",
  "logistics",
  "analytics",
];

export function findWorkspaceCardTemplate(products: Product[]) {
  const source = products.find((product) => workspaceIllustrationCardIds.every(
    (cardId) => Boolean(product.workspaceCards?.[cardId]?.illustrationUrl),
  ));
  return source?.workspaceCards;
}

export function mergeWorkspaceCardTemplate(
  current: Partial<Record<ProductWorkspaceCardId, ProductWorkspaceCardConfig>> | undefined,
  template: Partial<Record<ProductWorkspaceCardId, ProductWorkspaceCardConfig>> | undefined,
) {
  if (!template) return current ?? {};
  return workspaceIllustrationCardIds.reduce<Partial<Record<ProductWorkspaceCardId, ProductWorkspaceCardConfig>>>((result, cardId) => ({
    ...result,
    [cardId]: {
      ...template[cardId],
      ...current?.[cardId],
      illustrationUrl: current?.[cardId]?.illustrationUrl || template[cardId]?.illustrationUrl,
    },
  }), { ...current });
}
