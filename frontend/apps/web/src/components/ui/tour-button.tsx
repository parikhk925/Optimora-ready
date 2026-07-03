"use client";

import { useState } from "react";
import { ProductTour, TourTrigger } from "@/components/ui/product-tour";

export function TourButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TourTrigger onOpen={() => setOpen(true)} />
      <ProductTour isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
