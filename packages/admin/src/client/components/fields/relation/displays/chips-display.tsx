/**
 * Chips Display - compact badge/tag style
 */

import { Icon } from "@iconify/react";
import * as React from "react";
import { CollectionEditLink } from "../../../admin-link";
import { Badge } from "../../../ui/badge";
import { Button } from "../../../ui/button";
import { type RelationDisplayProps, getItemDisplayValue } from "./types";

export function ChipsDisplay({
  items,
  collection,
  collectionIcon: CollectionIcon,
  actions,
  editable = false,
  linkToDetail = false,
}: RelationDisplayProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const displayText = getItemDisplayValue(item);

        // Editable mode - show edit/remove buttons
        if (editable && (actions?.onEdit || actions?.onRemove)) {
          return (
            <div
              key={item.id}
              className="inline-flex items-center gap-1 rounded-md border bg-secondary/50 pl-2 pr-1 py-1"
            >
              {CollectionIcon && (
                <CollectionIcon className="size-3 text-muted-foreground" />
              )}
              <span className="text-sm">{displayText}</span>
              {actions?.onEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => actions.onEdit?.(item)}
                  aria-label="Edit item"
                >
                  <Icon icon="ph:pencil" className="size-3" />
                </Button>
              )}
              {actions?.onRemove && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => actions.onRemove?.(item)}
                  aria-label="Remove item"
                >
                  <Icon icon="ph:x" className="size-3" />
                </Button>
              )}
            </div>
          );
        }

        // Clickable for edit in sheet
        if (actions?.onEdit) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => actions.onEdit?.(item)}
              className="inline-flex"
            >
              <Badge
                variant="secondary"
                className="hover:bg-secondary/80 cursor-pointer gap-1"
              >
                {CollectionIcon && (
                  <CollectionIcon className="size-3 text-muted-foreground" />
                )}
                {displayText}
                <Icon icon="ph:pencil" className="size-3" />
              </Badge>
            </button>
          );
        }

        // Link to detail page
        if (linkToDetail && actions?.onNavigate) {
          return (
            <CollectionEditLink
              key={item.id}
              collection={collection as any}
              id={item.id}
              className="inline-flex"
            >
              <Badge
                variant="secondary"
                className="hover:bg-secondary/80 cursor-pointer gap-1"
              >
                {CollectionIcon && (
                  <CollectionIcon className="size-3 text-muted-foreground" />
                )}
                {displayText}
              </Badge>
            </CollectionEditLink>
          );
        }

        // Read-only badge
        return (
          <Badge key={item.id} variant="secondary" className="gap-1">
            {CollectionIcon && (
              <CollectionIcon className="size-3 text-muted-foreground" />
            )}
            {displayText}
          </Badge>
        );
      })}
    </div>
  );
}
