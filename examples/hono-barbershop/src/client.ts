/**
 * Barbershop Client Example
 *
 * Demonstrates:
 * - Unified client combining CMS CRUD + Hono RPC
 * - Type-safe operations across both
 * - Cleaner API with single client instance
 */

import { createClientFromHono } from "@questpie/hono/client";
import type { cms } from "./cms";
import type { AppType } from "./server";

// ============================================================================
// Client Setup
// ============================================================================

const BASE_URL = "http://localhost:3000";

// Unified client - combines CMS CRUD with Hono RPC
// ✨ Single client for everything!
// IMPORTANT: Use `typeof cms` directly for proper type inference
const client = createClientFromHono<AppType, typeof cms>({
	baseURL: BASE_URL,
	basePath: "/api",
});

// ============================================================================
// Usage Examples
// ============================================================================

async function exampleUsage() {
	console.log("🪒 Barbershop Client Examples\n");

	// ========================================================================
	// 1. Browse Barbers (CMS CRUD)
	// ========================================================================

	console.log("📋 Fetching active barbers...");
	const barbers = await client.collections.barbers.find({
		where: { isActive: true },
		orderBy: { name: "asc" },
	});

	console.log(`Found ${barbers.length} barbers:`);
	for (const barber of barbers) {
		console.log(`  - ${barber.name} (${barber.email})`);
	}
	console.log();

	// ========================================================================
	// 2. Browse Services (CMS CRUD)
	// ========================================================================

	console.log("💇 Fetching available services...");
	const services = await client.collections.services.find({
		where: { isActive: true },
		orderBy: { price: "asc" },
	});

	console.log(`Found ${services.length} services:`);
	for (const service of services) {
		console.log(
			`  - ${service.name}: $${service.price / 100} (${service.duration} min)`,
		);
	}
	console.log();

	// ========================================================================
	// 3. Check Availability (Custom API)
	// ========================================================================

	if (barbers.length > 0 && services.length > 0) {
		const barber = barbers[0];
		const service = services[0];
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		const date = tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD

		console.log(`🗓️  Checking availability for ${barber.name} on ${date}...`);
		const availability = await client.api.barbers[
			":barberId"
		].availability.$get({
			param: { barberId: barber.id },
			query: {
				date,
				serviceId: service.id,
			},
		});

		if (availability.ok) {
			const data = await availability.json();
			console.log(`Available slots: ${data.availableSlots.join(", ")}`);
		}
		console.log();

		// ====================================================================
		// 4. Book Appointment (Custom API)
		// ====================================================================

		console.log("📅 Booking appointment...");

		// First, you need to be authenticated
		// For demo purposes, we'll show the request structure

		const bookingData = {
			barberId: barber.id,
			serviceId: service.id,
			scheduledAt: new Date(tomorrow.setHours(10, 0, 0, 0)).toISOString(),
			notes: "First time customer",
		};

		console.log("Booking payload:", bookingData);
		console.log("(Requires authentication - see server.ts for auth setup)");
		console.log();

		// Example of actual booking (when authenticated):
		/*
		const booking = await client.api.appointments.book.$post({
			json: bookingData
		});

		if (booking.ok) {
			const result = await booking.json();
			console.log('✅ Appointment booked:', result.appointment);
		}
		*/
	}

	// ========================================================================
	// 5. Get My Appointments (Custom API)
	// ========================================================================

	console.log("📝 Fetching my appointments...");
	console.log("(Requires authentication)");
	console.log();

	// Example when authenticated:
	/*
	const myAppointments = await client.api.my.appointments.$get();

	if (myAppointments.ok) {
		const data = await myAppointments.json();
		console.log(`You have ${data.appointments.length} appointments:`);
		for (const apt of data.appointments) {
			console.log(`  - ${apt.scheduledAt}: ${apt.service.name} with ${apt.barber.name}`);
		}
	}
	*/

	// ========================================================================
	// 6. Cancel Appointment (Custom API)
	// ========================================================================

	console.log("❌ Cancelling appointment...");
	console.log("(Requires authentication and appointment ID)");
	console.log();

	// Example when authenticated:
	/*
	const appointmentId = 'some-uuid';
	const cancellation = await client.api.appointments[':id'].cancel.$post({
		param: { id: appointmentId },
		json: {
			reason: 'Schedule conflict'
		}
	});

	if (cancellation.ok) {
		const result = await cancellation.json();
		console.log('✅ Appointment cancelled:', result.appointment);
	}
	*/

	// ========================================================================
	// 7. Leave Review (CMS CRUD)
	// ========================================================================

	console.log("⭐ Leaving review...");
	console.log("(After appointment is completed)");
	console.log();

	// Example review:
	/*
	const review = await client.collections.reviews.create({
		appointmentId: 'completed-appointment-id',
		customerId: 'user-id',
		barberId: barber.id,
		rating: 5,
		comment: 'Excellent service! Very professional.'
	});

	console.log('✅ Review posted:', review);
	*/

	// ========================================================================
	// 8. Admin: View All Appointments (CMS CRUD with relations)
	// ========================================================================

	console.log("👨‍💼 Admin: Viewing all appointments with relations...");
	const allAppointments = await client.collections.appointments.find({
		limit: 10,
		with: {
			customer: true,
			barber: true,
			service: true,
		},
		orderBy: { scheduledAt: "desc" },
	});

	console.log(`Found ${allAppointments.length} recent appointments`);
	console.log();

	// ========================================================================
	// Summary
	// ========================================================================

	console.log("✨ Summary:");
	console.log(
		"  • Unified Client: Single client for both CMS CRUD and custom routes",
	);
	console.log("  • client.collections.*: CMS CRUD operations");
	console.log("  • client.api.*: Hono RPC for custom business logic");
	console.log("  • Fully type-safe end-to-end");
	console.log("  • Relations are automatically typed and loaded");
}

// ============================================================================
// Authentication Example
// ============================================================================

async function _authExample() {
	console.log("\n🔐 Authentication Example\n");

	// Register new user
	console.log("Registering new customer...");

	const registerResponse = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			email: "customer@example.com",
			password: "secure_password_123",
			name: "John Doe",
		}),
	});

	if (registerResponse.ok) {
		const session = await registerResponse.json();
		console.log("✅ Registered:", session.user.email);

		// Now you can use the session token for authenticated requests
		const sessionToken = session.token; // or get from cookies

		// Example: Book appointment with authentication
		const bookingResponse = await client.api.appointments.book.$post(
			{
				json: {
					barberId: "barber-uuid",
					serviceId: "service-uuid",
					scheduledAt: new Date().toISOString(),
				},
			},
			{
				headers: {
					Cookie: `session_token=${sessionToken}`,
				},
			},
		);

		console.log("Booking result:", bookingResponse.ok);
	}
}

// ============================================================================
// Run Examples
// ============================================================================

if (import.meta.main) {
	try {
		await exampleUsage();
		// await authExample(); // Uncomment to test auth
	} catch (error) {
		console.error("Error:", error);
	}
}
