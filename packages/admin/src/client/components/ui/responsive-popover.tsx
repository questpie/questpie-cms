"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { cn } from "#questpie/admin/client/lib/utils";
import { useIsMobile } from "#questpie/admin/client/hooks/use-media-query";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer";

/**
 * ResponsivePopover - Uses Popover on desktop, Drawer on mobile
 *
 * @example
 * ```tsx
 * <ResponsivePopover>
 *   <ResponsivePopoverTrigger asChild>
 *     <Button>Open</Button>
 *   </ResponsivePopoverTrigger>
 *   <ResponsivePopoverContent>
 *     <ResponsivePopoverHeader>
 *       <ResponsivePopoverTitle>Title</ResponsivePopoverTitle>
 *       <ResponsivePopoverDescription>Description</ResponsivePopoverDescription>
 *     </ResponsivePopoverHeader>
 *     <div>Content here</div>
 *   </ResponsivePopoverContent>
 * </ResponsivePopover>
 * ```
 */

interface ResponsivePopoverContextValue {
  isMobile: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ResponsivePopoverContext =
  React.createContext<ResponsivePopoverContextValue | null>(null);

function useResponsivePopover() {
  const context = React.useContext(ResponsivePopoverContext);
  if (!context) {
    throw new Error(
      "ResponsivePopover components must be used within ResponsivePopover",
    );
  }
  return context;
}

export interface ResponsivePopoverProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

function ResponsivePopover({
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultOpen = false,
}: ResponsivePopoverProps) {
  const isMobile = useIsMobile();
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = isControlled
    ? (controlledOnOpenChange ?? (() => {}))
    : setUncontrolledOpen;

  const contextValue = React.useMemo(
    () => ({ isMobile, open, onOpenChange }),
    [isMobile, open, onOpenChange],
  );

  if (isMobile) {
    return (
      <ResponsivePopoverContext.Provider value={contextValue}>
        <Drawer open={open} onOpenChange={onOpenChange}>
          {children}
        </Drawer>
      </ResponsivePopoverContext.Provider>
    );
  }

  return (
    <ResponsivePopoverContext.Provider value={contextValue}>
      <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
        {children}
      </PopoverPrimitive.Root>
    </ResponsivePopoverContext.Provider>
  );
}

function ResponsivePopoverTrigger({
  children,
  asChild = false,
  className,
  ...props
}: {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
} & React.ComponentProps<"button">) {
  const { isMobile } = useResponsivePopover();

  if (isMobile) {
    return (
      <DrawerTrigger asChild={asChild} className={className} {...props}>
        {children}
      </DrawerTrigger>
    );
  }

  return (
    <PopoverPrimitive.Trigger
      className={className}
      render={asChild ? (children as React.ReactElement) : undefined}
      {...props}
    >
      {!asChild ? children : undefined}
    </PopoverPrimitive.Trigger>
  );
}

export interface ResponsivePopoverContentProps {
  children: React.ReactNode;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  align?: "start" | "center" | "end";
  alignOffset?: number;
}

function ResponsivePopoverContent({
  children,
  className,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
}: ResponsivePopoverContentProps) {
  const { isMobile } = useResponsivePopover();

  if (isMobile) {
    return (
      <DrawerContent className={cn("px-4 pb-6", className)}>
        {children}
      </DrawerContent>
    );
  }

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className="isolate z-50"
      >
        <PopoverPrimitive.Popup
          data-slot="responsive-popover-content"
          className={cn(
            "bg-popover/95 backdrop-blur-xl text-popover-foreground",
            "data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0",
            "data-closed:zoom-out-95 data-open:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
            "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            "border border-border flex flex-col gap-2 p-3 text-xs shadow-lg duration-100",
            "z-50 w-72 origin-(--transform-origin) outline-hidden",
            className,
          )}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

function ResponsivePopoverHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { isMobile } = useResponsivePopover();

  if (isMobile) {
    return <DrawerHeader className={className} {...props} />;
  }

  return (
    <div
      data-slot="responsive-popover-header"
      className={cn("flex flex-col gap-1 text-xs", className)}
      {...props}
    />
  );
}

function ResponsivePopoverTitle({
  className,
  children,
  ...props
}: React.ComponentProps<"h3">) {
  const { isMobile } = useResponsivePopover();

  if (isMobile) {
    return (
      <DrawerTitle className={className} {...props}>
        {children}
      </DrawerTitle>
    );
  }

  return (
    <PopoverPrimitive.Title
      data-slot="responsive-popover-title"
      className={cn("text-sm font-medium", className)}
      {...props}
    >
      {children}
    </PopoverPrimitive.Title>
  );
}

function ResponsivePopoverDescription({
  className,
  children,
  ...props
}: React.ComponentProps<"p">) {
  const { isMobile } = useResponsivePopover();

  if (isMobile) {
    return (
      <DrawerDescription className={className} {...props}>
        {children}
      </DrawerDescription>
    );
  }

  return (
    <PopoverPrimitive.Description
      data-slot="responsive-popover-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    >
      {children}
    </PopoverPrimitive.Description>
  );
}

function ResponsivePopoverFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { isMobile } = useResponsivePopover();

  if (isMobile) {
    return <DrawerFooter className={className} {...props} />;
  }

  return (
    <div
      data-slot="responsive-popover-footer"
      className={cn("flex flex-col gap-2 mt-2", className)}
      {...props}
    />
  );
}

function ResponsivePopoverClose({
  children,
  asChild = false,
  className,
  ...props
}: {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
} & React.ComponentProps<"button">) {
  const { isMobile, onOpenChange } = useResponsivePopover();

  if (isMobile) {
    return (
      <DrawerClose asChild={asChild} className={className} {...props}>
        {children}
      </DrawerClose>
    );
  }

  // For desktop popover, just close on click
  return (
    <button
      type="button"
      onClick={() => onOpenChange(false)}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

export {
  ResponsivePopover,
  ResponsivePopoverTrigger,
  ResponsivePopoverContent,
  ResponsivePopoverHeader,
  ResponsivePopoverTitle,
  ResponsivePopoverDescription,
  ResponsivePopoverFooter,
  ResponsivePopoverClose,
  useResponsivePopover,
};
