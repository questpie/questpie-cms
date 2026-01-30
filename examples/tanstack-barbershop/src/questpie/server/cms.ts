import { adminModule } from "@questpie/admin/server";
import { ConsoleAdapter, pgBossAdapter, q, SmtpAdapter } from "questpie";
// Import jobs
import { appointments } from "@/questpie/server/collections";
import {
	createBooking,
	getActiveBarbers,
	getAvailableTimeSlots,
	getRevenueStats,
} from "@/questpie/server/functions";
import { migrations } from "../../migrations";
import { barberServices } from "./collections/barber-services";
// Import collections
import { barbers } from "./collections/barbers";
import { pages } from "./collections/pages";
import { reviews } from "./collections/reviews";
import { services } from "./collections/services";
// Import globals
import { siteSettings } from "./globals";
import {
	sendAppointmentCancellation,
	sendAppointmentConfirmation,
	sendAppointmentReminder,
} from "./jobs";

const DATABASE_URL =
	process.env.DATABASE_URL || "postgres://localhost/barbershop";

// ============================================================================
// I18n Messages (Backend)
// ============================================================================

const backendMessages = {
	en: {
		"appointment.created": "Appointment booked for {{date}} at {{time}}",
		"appointment.cancelled": "Appointment has been cancelled",
		"appointment.slotNotAvailable": "This time slot is no longer available",
		"appointment.pastDateNotAllowed": "Cannot book appointments in the past",
		"barber.notAvailable": "Selected barber is not available at this time",
		"service.notOffered": "Selected service is not offered by this barber",
	},
	sk: {
		"appointment.created": "Rezervácia vytvorená na {{date}} o {{time}}",
		"appointment.cancelled": "Rezervácia bola zrušená",
		"appointment.slotNotAvailable": "Tento termín už nie je dostupný",
		"appointment.pastDateNotAllowed":
			"Nie je možné rezervovať termín v minulosti",
		"barber.notAvailable": "Vybraný holič nie je v tomto čase dostupný",
		"service.notOffered": "Vybranú službu tento holič neposkytuje",
	},
} as const;

// ============================================================================
// CMS Instance
// ============================================================================

const baseInstance = q({
	name: "base",
})
	.use(adminModule)
	.collections({
		barbers,
		services,
		barberServices,
		appointments,
		reviews,
		pages,
	})
	// Define global settings
	.globals({
		siteSettings,
	})
	// Define background jobs
	.jobs({
		sendAppointmentConfirmation,
		sendAppointmentCancellation,
		sendAppointmentReminder,
	})
	// Configure content locales (for i18n tables)
	.locale({
		locales: [
			{
				code: "en",
				label: "English",
				fallback: true,
				flagCountryCode: "us", // Show US flag instead of UK
			},
			{ code: "sk", label: "Slovenčina" },
		],
		defaultLocale: "en",
		fallbacks: {
			"en-US": "en",
			"en-GB": "en",
		},
	})
	// Add custom backend messages for i18n
	.messages(backendMessages)
	// Configure authentication (Better Auth)
	.auth({
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: false,
		},
		baseURL: process.env.APP_URL || "http://localhost:3000",
		basePath: "/api/cms/auth",
		secret:
			process.env.BETTER_AUTH_SECRET || "demo-secret-change-in-production",
	})
	// Add migrations
	.migrations(migrations);

export const cms = q({ name: "barbershop" })
	// Include starter module for auth and file uploads
	.use(baseInstance)
	.functions({
		getActiveBarbers,
		getRevenueStats,
		getAvailableTimeSlots,
		createBooking,
	})
	// Build with runtime configuration
	.build({
		app: {
			url: process.env.APP_URL || "http://localhost:3000",
		},
		db: {
			url: DATABASE_URL,
		},
		storage: {
			basePath: "/api/cms",
		},
		secret: process.env.SECRET,
		email: {
			adapter:
				process.env.MAIL_ADAPTER === "console"
					? new ConsoleAdapter({ logHtml: false })
					: new SmtpAdapter({
							transport: {
								host: process.env.SMTP_HOST || "localhost",
								port: Number.parseInt(process.env.SMTP_PORT || "1025", 10),
								secure: false,
							},
						}),
		},
		queue: {
			adapter: pgBossAdapter({
				connectionString: DATABASE_URL,
			}),
		},
	});

// ============================================================================
// Type Exports
// ============================================================================

/**
 * Full CMS type including all modules, collections, globals, jobs, and functions.
 * Use this type with getApp<AppCMS>() in hooks and jobs.
 */
export type AppCMS = typeof cms;

/**
 * Base CMS type without functions - useful in function handlers to avoid circular dependencies.
 * Use this with getApp<BaseCMS>() when defining functions that need to reference the CMS.
 *
 * @example
 * ```ts
 * import { getApp } from "questpie";
 * import type { BaseCMS } from "./cms";
 *
 * export const getStats = q.fn({
 *   handler: async ({ app }) => {
 *     const cms = getApp<BaseCMS>(app);
 *     return cms.api.collections.posts.find();
 *   }
 * });
 * ```
 */
export type BaseCMS = typeof baseInstance.$inferCms;
