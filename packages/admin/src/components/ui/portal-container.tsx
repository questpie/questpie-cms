"use client";

import * as React from "react";

/**
 * Context for portal container element.
 * Portals will render into this container instead of document.body,
 * ensuring they inherit CSS variables from the admin scope.
 */
const PortalContainerContext = React.createContext<HTMLElement | null>(null);

/**
 * Hook to get the portal container element.
 * Returns null if no container is set (portals will use document.body).
 */
export function usePortalContainer(): HTMLElement | null {
  return React.useContext(PortalContainerContext);
}

/**
 * Provider for portal container.
 * Wrap your admin layout with this to ensure portals render inside the admin scope.
 */
export function PortalContainerProvider({
  children,
  container,
}: {
  children: React.ReactNode;
  container: HTMLElement | null;
}) {
  return (
    <PortalContainerContext.Provider value={container}>
      {children}
    </PortalContainerContext.Provider>
  );
}

export { PortalContainerContext };
