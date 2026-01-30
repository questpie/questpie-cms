/**
 * User Collection Admin Config
 *
 * Default admin UI configuration for the built-in user collection.
 * Works with Better Auth's user model (admin plugin).
 */

import { LockKey, UserPlus, UsersIcon } from "@phosphor-icons/react";
import { coreAdminModule } from "../core";

/**
 * User collection admin configuration
 *
 * Provides admin UI for managing users with:
 * - Name, email, and role fields
 * - Ban status management
 * - Table view with key columns
 * - Create user with credentials (no email dependency)
 *
 * @example
 * ```ts
 * import { adminStarterModule } from "@questpie/admin/builder/defaults";
 *
 * const admin = qa().use(adminStarterModule);
 * // User collection is automatically configured
 * ```
 */
export const userCollectionAdmin = coreAdminModule
	.collection("user")
	.meta({
		label: { key: "defaults.users.label" },
		icon: UsersIcon,
		description: { key: "defaults.users.description" },
	})
	.fields(({ r }) => ({
		name: r.text({
			label: { key: "defaults.users.fields.name.label" },
			placeholder: { key: "defaults.users.fields.name.placeholder" },
		}),
		email: r.email({
			label: { key: "defaults.users.fields.email.label" },
			description: { key: "defaults.users.fields.email.description" },
		}),
		role: r.select({
			label: { key: "defaults.users.fields.role.label" },
			options: [
				{
					value: "admin",
					label: { key: "defaults.users.fields.role.options.admin" },
				},
				{
					value: "user",
					label: { key: "defaults.users.fields.role.options.user" },
				},
			],
		}),
		emailVerified: r.checkbox({
			label: { key: "defaults.users.fields.emailVerified.label" },
			description: { key: "defaults.users.fields.emailVerified.description" },
		}),
		banned: r.checkbox({
			label: { key: "defaults.users.fields.banned.label" },
			description: { key: "defaults.users.fields.banned.description" },
		}),
		banReason: r.textarea({
			label: { key: "defaults.users.fields.banReason.label" },
			placeholder: { key: "defaults.users.fields.banReason.placeholder" },
			rows: 2,
		}),
	}))
	.list(({ v, f, a, r }) =>
		v.table({
			columns: [f.name, f.email, f.role, f.banned],
			searchFields: [f.name, f.email],
			searchable: true,
			defaultSort: {
				field: f.name,
				direction: "asc",
			},
			actions: {
				header: {
					primary: [
						// Create User - opens form dialog, shows credentials to copy
						a.action({
							id: "createUser",
							label: { key: "defaults.users.actions.createUser.label" },
							icon: UserPlus,
							variant: "default",
							handler: {
								type: "form",
								config: {
									title: { key: "defaults.users.actions.createUser.title" },
									description: {
										key: "defaults.users.actions.createUser.description",
									},
									fields: {
										name: r.text({
											label: { key: "defaults.users.fields.name.label" },
											placeholder: {
												key: "defaults.users.fields.name.placeholder",
											},
											required: true,
										}),
										email: r.email({
											label: { key: "defaults.users.fields.email.label" },
											placeholder: { key: "auth.emailPlaceholder" },
											required: true,
										}),
										password: r.password({
											label: {
												key: "defaults.users.actions.createUser.fields.password.label",
											},
											placeholder: {
												key: "defaults.users.actions.createUser.fields.password.placeholder",
											},
											required: true,
										}),
										role: r.select({
											label: { key: "defaults.users.fields.role.label" },
											options: [
												{
													value: "user",
													label: {
														key: "defaults.users.fields.role.options.user",
													},
												},
												{
													value: "admin",
													label: {
														key: "defaults.users.fields.role.options.admin",
													},
												},
											],
										}),
									},
									submitLabel: {
										key: "defaults.users.actions.createUser.submit",
									},
									onSubmit: async (data, ctx) => {
										if (!ctx.authClient) {
											ctx.helpers.toast.error(
												ctx.helpers.t(
													"defaults.users.actions.createUser.errorNoAuth",
												),
											);
											return;
										}

										try {
											// Use admin.createUser to create user without logging out current admin
											const result = await ctx.authClient.admin.createUser({
												email: data.email,
												password: data.password,
												name: data.name,
												role: data.role || "user",
											});

											if (result.error) {
												ctx.helpers.toast.error(
													result.error.message ||
														ctx.helpers.t("form.createError", {
															name: ctx.helpers.t("defaults.users.label"),
														}),
												);
												return;
											}

											ctx.helpers.toast.success(
												ctx.helpers.t(
													"defaults.users.actions.createUser.success",
													{
														email: data.email,
													},
												),
											);
											await ctx.helpers.invalidateCollection();
											ctx.helpers.closeDialog();
										} catch (error) {
											ctx.helpers.toast.error(
												error instanceof Error
													? error.message
													: ctx.helpers.t("form.createError", {
															name: ctx.helpers.t("defaults.users.label"),
														}),
											);
										}
									},
								},
							},
						}),
					],
					secondary: [],
				},
				bulk: [
					a.deleteMany(),
					a.duplicate(), // Default visibility: only shows when 1 item selected
				],
			},
		}),
	)
	.form(({ v, f, a, r }) =>
		v.form({
			fields: [
				{
					type: "section",
					label: { key: "defaults.users.sections.basicInfo" },
					layout: "grid",
					columns: 2,
					fields: [f.name, f.email],
				},
				{
					type: "section",
					label: { key: "defaults.users.sections.permissions" },
					fields: [f.role, f.emailVerified],
				},
				{
					type: "section",
					label: { key: "defaults.users.sections.accessControl" },
					fields: [f.banned, f.banReason],
				},
			],
			actions: {
				primary: [],
				secondary: [
					// Reset Password
					a.action({
						id: "resetPassword",
						label: { key: "defaults.users.actions.resetPassword.label" },
						icon: LockKey,
						handler: {
							type: "form",
							config: {
								title: { key: "defaults.users.actions.resetPassword.title" },
								description: {
									key: "defaults.users.actions.resetPassword.description",
								},
								fields: {
									newPassword: r.password({
										label: {
											key: "defaults.users.actions.resetPassword.fields.newPassword.label",
										},
										placeholder: {
											key: "defaults.users.actions.resetPassword.fields.newPassword.placeholder",
										},
										required: true,
									}),
									confirmPassword: r.password({
										label: {
											key: "defaults.users.actions.resetPassword.fields.confirmPassword.label",
										},
										placeholder: {
											key: "defaults.users.actions.resetPassword.fields.confirmPassword.placeholder",
										},
										required: true,
									}),
								},
								submitLabel: {
									key: "defaults.users.actions.resetPassword.submit",
								},
								onSubmit: async (data, ctx) => {
									if (data.newPassword !== data.confirmPassword) {
										ctx.helpers.toast.error(
											ctx.helpers.t(
												"defaults.users.actions.resetPassword.errorMismatch",
											),
										);
										return;
									}
									// TODO: Call Better Auth password reset API
									// Show new password to copy
									ctx.helpers.toast.success(
										ctx.helpers.t(
											"defaults.users.actions.resetPassword.success",
										),
									);
									ctx.helpers.closeDialog();
								},
							},
						},
					}),
					// Duplicate (default: only visible for single item)
					a.duplicate(),
					// Delete (default: with confirmation dialog)
					a.delete({ label: { key: "defaults.users.actions.delete.label" } }),
				],
			},
		}),
	);
