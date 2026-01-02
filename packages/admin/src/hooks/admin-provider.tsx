import React, { createContext, useContext } from "react";
import type { QCMSClient } from "@questpie/cms/client";
import type { QCMS } from "@questpie/cms/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Admin context - provides access to CMS client
 */
export type AdminContext<T extends QCMS<any, any, any>> = {
	client: QCMSClient<T>;
	locale?: string;
	setLocale?: (locale: string) => void;
	locales?: {
		default: string;
		available: string[];
	};
};

const AdminContextInstance = createContext<AdminContext<any> | null>(null);

/**
 * Hook to access admin context
 */
export function useAdminContext<T extends QCMS<any, any, any>>(): AdminContext<T> {
	const context = useContext(AdminContextInstance);
	if (!context) {
		throw new Error(
			"useAdminContext must be used within AdminProvider. Wrap your app with <AdminProvider client={client}>",
		);
	}
	return context;
}

/**
 * Admin provider props
 */
export type AdminProviderProps<T extends QCMS<any, any, any>> = {
	client: QCMSClient<T>;
	queryClient?: QueryClient;
	locales?: {
		default: string;
		available: string[];
	};
	children: React.ReactNode;
};

/**
 * Admin provider - provides CMS client and query client to the app
 *
 * @example
 * ```tsx
 * import { AdminProvider } from '@questpie/admin/hooks'
 * import { createQCMSClient } from '@questpie/cms/client'
 * import { QueryClient } from '@tanstack/react-query'
 * import type { cms } from './server/cms'
 *
 * const client = createQCMSClient<typeof cms>({
 *   baseURL: 'http://localhost:3000'
 * })
 *
 * const queryClient = new QueryClient()
 *
 * function App() {
 *   return (
 *     <AdminProvider client={client} queryClient={queryClient}>
 *       <YourAdminApp />
 *     </AdminProvider>
 *   )
 * }
 * ```
 */
export function AdminProvider<T extends QCMS<any, any, any>>({
	client,
	queryClient,
	locales,
	children,
}: AdminProviderProps<T>): React.ReactElement {
	const [defaultQueryClient] = React.useState(
		() => queryClient ?? new QueryClient(),
	);
	const [locale, setLocale] = React.useState(() => {
		if (locales?.default) return locales.default;
		if (locales?.available?.length) return locales.available[0];
		return typeof client.getLocale === "function" ? client.getLocale() : undefined;
	});

	React.useEffect(() => {
		if (!locales?.available?.length) return;
		if (!locale || !locales.available.includes(locale)) {
			setLocale(locales.default ?? locales.available[0]);
		}
	}, [locale, locales]);

	React.useEffect(() => {
		if (typeof client.setLocale !== "function") return;
		client.setLocale(locale);
	}, [client, locale]);

	return (
		<AdminContextInstance.Provider value={{ client, locale, setLocale, locales }}>
			<QueryClientProvider client={defaultQueryClient}>
				{children}
			</QueryClientProvider>
		</AdminContextInstance.Provider>
	);
}
