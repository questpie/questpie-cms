/**
 * Heading Block
 *
 * Customizable heading (h1-h4) with alignment and styling options.
 * Design: Bold typography with consistent spacing.
 */

import type { BlockRendererProps } from "@questpie/admin/client";
import { cn } from "../../../lib/utils";

type HeadingValues = {
  text: string;
  level: "h1" | "h2" | "h3" | "h4";
  align: "left" | "center" | "right";
  padding: "none" | "small" | "medium" | "large";
};

export function HeadingRenderer({ values }: BlockRendererProps<HeadingValues>) {
  const Tag = values.level || "h2";

  const sizeClass = {
    h1: "text-5xl md:text-6xl lg:text-7xl",
    h2: "text-4xl md:text-5xl lg:text-6xl",
    h3: "text-3xl md:text-4xl lg:text-5xl",
    h4: "text-2xl md:text-3xl lg:text-4xl" }[Tag];

  const alignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right" }[values.align || "left"];

  const paddingClass = {
    none: "py-0",
    small: "py-4",
    medium: "py-8",
    large: "py-12" }[values.padding || "medium"];

  return (
    <section className={cn("px-6", paddingClass)}>
      <Tag
        className={cn(
          "font-bold tracking-tight",
          "text-foreground",
          sizeClass,
          alignClass,
        )}
      >
        {values.text || "Heading"}
      </Tag>
    </section>
  );
}


