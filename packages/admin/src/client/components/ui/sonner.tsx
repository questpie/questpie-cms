"use client";

import type * as React from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
	Info,
	Warning,
	XCircle,
	Spinner,
	CheckCircleIcon,
} from "@phosphor-icons/react";

export interface AdminToasterProps extends ToasterProps {
	/**
	 * Theme can be provided by parent app's theme context
	 * Falls back to "system" if not provided
	 */
	theme?: "light" | "dark" | "system";
}

const Toaster = ({ theme = "system", ...props }: AdminToasterProps) => {
	return (
		<Sonner
			theme={theme}
			className="toaster group"
			richColors
			icons={{
				success: <CheckCircleIcon className="size-4" />,
				info: <Info className="size-4" />,
				warning: <Warning className="size-4" />,
				error: <XCircle className="size-4" />,
				loading: <Spinner className="size-4 animate-spin" />,
			}}
			style={
				{
					"--normal-bg": "var(--popover)",
					"--normal-text": "var(--popover-foreground)",
					"--normal-border": "var(--border)",
					"--border-radius": "var(--radius)",
				} as React.CSSProperties
			}
			toastOptions={{
				classNames: {
					toast: "cn-toast !backdrop-blur-sm !border",
					description: "!text-current/90",
					success: "!bg-primary/10 !text-primary !border-primary/20 ",
					error: "!bg-destructive/10 !text-destructive !border-destructive/20",
					warning: "!bg-yellow-600/10 !text-yellow-600 !border-yellow-600/20",
					info: "!bg-secondary/10 !text-secondary !border-secondary/20",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
