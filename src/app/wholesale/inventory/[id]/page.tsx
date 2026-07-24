"use client";

import { use } from "react";
import { ProductEditor } from "../_components/ProductEditor";

export default function ProductWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ProductEditor mode="edit" productId={id} />;
}
