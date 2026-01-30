/**
 * List Display - vertical list with action buttons
 */

import { ArrowRight, DotsSixVertical, Pencil, X } from "@phosphor-icons/react";
import * as React from "react";
import { CollectionEditLink } from "../../../admin-link";
import { Button } from "../../../ui/button";
import { type RelationDisplayProps, getItemDisplayValue } from "./types";

export function ListDisplay({
  items,
  collection,
  collectionIcon: CollectionIcon,
  actions,
  editable = false,
  orderable = false,
  linkToDetail = false,
  renderItem,
}: RelationDisplayProps) {
  // Editable list with cards
  if (editable) {
    return (
      <div className="space-y-2 rounded-lg border border-border/60 bg-card/30 backdrop-blur-sm p-3">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-md border border-border/60 bg-card/30 backdrop-blur-sm p-2"
          >
            {/* Drag Handle */}
            {orderable && (
              <button
                type="button"
                className="cursor-grab text-muted-foreground hover:text-foreground"
                aria-label="Drag to reorder"
              >
                <DotsSixVertical className="h-4 w-4" />
              </button>
            )}

            {/* Item Display */}
            <div className="flex-1 flex items-center gap-2 min-w-0">
              {CollectionIcon && (
                <CollectionIcon className="size-3.5 text-muted-foreground shrink-0" />
              )}
              {renderItem ? (
                renderItem(item, index)
              ) : (
                <span className="text-sm truncate">
                  {getItemDisplayValue(item)}
                </span>
              )}
            </div>

            {/* Edit Button */}
            {actions?.onEdit && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => actions.onEdit?.(item)}
                title="Edit"
                aria-label="Edit item"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}

            {/* Remove Button */}
            {actions?.onRemove && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => actions.onRemove?.(item)}
                title="Remove"
                aria-label="Remove item"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Read-only list
  return (
    <ul className="space-y-1">
      {items.map((item, index) => {
        const displayText = renderItem
          ? renderItem(item, index)
          : getItemDisplayValue(item);

        // Clickable for sheet edit
        if (actions?.onEdit) {
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => actions.onEdit?.(item)}
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                {CollectionIcon && (
                  <CollectionIcon className="size-3 text-muted-foreground" />
                )}
                {displayText}
                <Pencil className="size-3" />
              </button>
            </li>
          );
        }

        // Link to detail page
        if (linkToDetail) {
          return (
            <li key={item.id}>
              <CollectionEditLink
                collection={collection as any}
                id={item.id}
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                {CollectionIcon && (
                  <CollectionIcon className="size-3 text-muted-foreground" />
                )}
                {displayText}
                <ArrowRight className="size-3" />
              </CollectionEditLink>
            </li>
          );
        }

        // Read-only
        return (
          <li key={item.id} className="text-sm flex items-center gap-1">
            {CollectionIcon && (
              <CollectionIcon className="size-3 text-muted-foreground" />
            )}
            {displayText}
          </li>
        );
      })}
    </ul>
  );
}
