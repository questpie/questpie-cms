/**
 * Collection Builder Tests
 *
 * Tests for CollectionBuilder class and collection() factory.
 */

import { describe, expect, expectTypeOf, it } from "vitest";
import { AdminBuilder } from "#questpie/admin/client/builder/admin-builder";
import { collection } from "#questpie/admin/client/builder/collection/collection";
import { CollectionBuilder } from "#questpie/admin/client/builder/collection/collection-builder";
import { editView, listView } from "#questpie/admin/client/builder/view/view";
import {
	createEmailField,
	createFormView,
	createNumberField,
	createTextField,
	MockIcon,
} from "../utils/helpers";

describe("collection() factory", () => {
	it("should create a CollectionBuilder with the given name", () => {
		const posts = collection("posts");

		expect(posts).toBeInstanceOf(CollectionBuilder);
		expect(posts.state.name).toBe("posts");
	});

	it("should initialize with undefined ~adminApp", () => {
		const posts = collection("posts");

		expect(posts.state["~adminApp"]).toBeUndefined();
	});

	it("should allow any string as collection name", () => {
		const camelCase = collection("myCollection");
		const kebabCase = collection("my-collection");
		const snakeCase = collection("my_collection");

		expect(camelCase.state.name).toBe("myCollection");
		expect(kebabCase.state.name).toBe("my-collection");
		expect(snakeCase.state.name).toBe("my_collection");
	});
});

describe("CollectionBuilder.use()", () => {
	it("should bind admin module to collection", () => {
		const adminModule = AdminBuilder.empty().fields({
			text: createTextField(),
		});

		const posts = collection("posts").use(adminModule);

		expect(posts.state["~adminApp"]).toBe(adminModule);
	});

	it("should return new builder instance", () => {
		const adminModule = AdminBuilder.empty();
		const original = collection("posts");
		const withModule = original.use(adminModule);

		expect(original).not.toBe(withModule);
	});

	it("should not mutate original builder", () => {
		const adminModule = AdminBuilder.empty();
		const original = collection("posts");

		original.use(adminModule);

		expect(original.state["~adminApp"]).toBeUndefined();
	});

	it("should allow replacing admin module", () => {
		const module1 = AdminBuilder.empty().fields({ text: createTextField() });
		const module2 = AdminBuilder.empty().fields({ email: createEmailField() });

		const posts = collection("posts").use(module1).use(module2);

		expect(posts.state["~adminApp"]).toBe(module2);
	});
});

describe("CollectionBuilder.meta()", () => {
	it("should set label", () => {
		const posts = collection("posts").meta({ label: "Blog Posts" });

		expect(posts.state.label).toBe("Blog Posts");
	});

	it("should set icon", () => {
		const posts = collection("posts").meta({ icon: MockIcon });

		expect(posts.state.icon).toBe(MockIcon);
	});

	it("should set description", () => {
		const posts = collection("posts").meta({
			description: "Manage blog posts",
		});

		expect(posts.state.description).toBe("Manage blog posts");
	});

	it("should set multiple metadata at once", () => {
		const posts = collection("posts").meta({
			label: "Blog Posts",
			icon: MockIcon,
			description: "Manage blog posts",
		});

		expect(posts.state.label).toBe("Blog Posts");
		expect(posts.state.icon).toBe(MockIcon);
		expect(posts.state.description).toBe("Manage blog posts");
	});

	it("should return new builder instance", () => {
		const original = collection("posts");
		const withMeta = original.meta({ label: "Posts" });

		expect(original).not.toBe(withMeta);
	});

	it("should not mutate original builder", () => {
		const original = collection("posts");

		original.meta({ label: "Posts" });

		expect(original.state.label).toBeUndefined();
	});

	it("should preserve existing state", () => {
		const posts = collection("posts")
			.meta({ label: "Posts" })
			.meta({ description: "Blog posts" });

		expect(posts.state.label).toBe("Posts");
		expect(posts.state.description).toBe("Blog posts");
	});
});

describe("CollectionBuilder.fields()", () => {
	it("should receive r (FieldRegistryProxy) in callback", () => {
		const adminModule = AdminBuilder.empty().fields({
			text: createTextField(),
			email: createEmailField(),
		});

		let receivedR: any;
		collection("posts")
			.use(adminModule)
			.fields(({ r }) => {
				receivedR = r;
				return {};
			});

		expect(receivedR).toBeDefined();
		expect(typeof receivedR.text).toBe("function");
		expect(typeof receivedR.email).toBe("function");
	});

	it("should allow defining fields using registry proxy", () => {
		const adminModule = AdminBuilder.empty().fields({
			text: createTextField(),
		});

		const posts = collection("posts")
			.use(adminModule)
			.fields(({ r }) => ({
				title: r.text(),
				body: r.text(),
			}));

		expect(posts.state.fields).toBeDefined();
		expect(posts.state.fields?.title).toBeDefined();
		expect(posts.state.fields?.body).toBeDefined();
	});

	it("should pass options through r.fieldType(options)", () => {
		const adminModule = AdminBuilder.empty().fields({
			text: createTextField(),
		});

		const posts = collection("posts")
			.use(adminModule)
			.fields(({ r }) => ({
				title: r.text({ maxLength: 200 } as any),
			}));

		expect(posts.state.fields?.title["~options"]).toEqual({ maxLength: 200 });
	});

	it("should preserve field type (name property)", () => {
		const adminModule = AdminBuilder.empty().fields({
			text: createTextField(),
			email: createEmailField(),
		});

		const posts = collection("posts")
			.use(adminModule)
			.fields(({ r }) => ({
				title: r.text(),
				authorEmail: r.email(),
			}));

		expect(posts.state.fields?.title.name).toBe("text");
		expect(posts.state.fields?.authorEmail.name).toBe("email");
	});

	it("should return new builder instance", () => {
		const adminModule = AdminBuilder.empty().fields({
			text: createTextField(),
		});

		const original = collection("posts").use(adminModule);
		const withFields = original.fields(({ r }) => ({ title: r.text() }));

		expect(original).not.toBe(withFields);
	});

	it("should not mutate original builder", () => {
		const adminModule = AdminBuilder.empty().fields({
			text: createTextField(),
		});

		const original = collection("posts").use(adminModule);
		original.fields(({ r }) => ({ title: r.text() }));

		expect(original.state.fields).toBeUndefined();
	});

	it("should work without admin module (empty registry)", () => {
		let receivedR: any;
		collection("posts").fields(({ r }) => {
			receivedR = r;
			return {};
		});

		// r should be empty object
		expect(Object.keys(receivedR)).toHaveLength(0);
	});
});

describe("CollectionBuilder.list()", () => {
	it("should receive f (FieldProxy) in callback", () => {
		const adminModule = AdminBuilder.empty().fields({
			text: createTextField(),
		});

		let receivedF: any;
		collection("posts")
			.use(adminModule)
			.fields(({ r }) => ({
				title: r.text(),
				body: r.text(),
			}))
			.list(({ f }) => {
				receivedF = f;
				return {};
			});

		expect(receivedF).toBeDefined();
		expect(receivedF.title).toBe("title");
		expect(receivedF.body).toBe("body");
	});

	it("should allow configuring columns using field proxy", () => {
		const adminModule = AdminBuilder.empty().fields({
			text: createTextField(),
		});

		const posts = collection("posts")
			.use(adminModule)
			.fields(({ r }) => ({
				title: r.text(),
				body: r.text(),
			}))
			.list(({ f }) => ({
				columns: [f.title, f.body],
			}));

		expect(posts.state.list?.columns).toEqual(["title", "body"]);
	});

	it("should allow complex column config", () => {
		const adminModule = AdminBuilder.empty().fields({
			text: createTextField(),
		});

		const posts = collection("posts")
			.use(adminModule)
			.fields(({ r }) => ({
				title: r.text(),
				status: r.text(),
			}))
			.list(({ f }) => ({
				columns: [f.title, { field: f.status, width: "100px", sortable: true }],
			}));

		expect(posts.state.list?.columns).toHaveLength(2);
	});

	it("should allow configuring default sort", () => {
		const adminModule = AdminBuilder.empty().fields({
			text: createTextField(),
		});

		const posts = collection("posts")
			.use(adminModule)
			.fields(({ r }) => ({
				title: r.text(),
				createdAt: r.text(),
			}))
			.list(({ f }) => ({
				defaultSort: { field: f.createdAt, direction: "desc" },
			}));

		expect(posts.state.list?.defaultSort).toEqual({
			field: "createdAt",
			direction: "desc",
		});
	});

	it("should allow configuring search fields", () => {
		const adminModule = AdminBuilder.empty().fields({
			text: createTextField(),
		});

		const posts = collection("posts")
			.use(adminModule)
			.fields(({ r }) => ({
				title: r.text(),
				body: r.text(),
			}))
			.list(({ f }) => ({
				searchable: true,
				searchFields: [f.title, f.body],
			}));

		expect(posts.state.list?.searchable).toBe(true);
		expect(posts.state.list?.searchFields).toEqual(["title", "body"]);
	});

	it("should return new builder instance", () => {
		const adminModule = AdminBuilder.empty().fields({
			text: createTextField(),
		});

		const original = collection("posts")
			.use(adminModule)
			.fields(({ r }) => ({ title: r.text() }));

		const withList = original.list(({ f }) => ({ columns: [f.title] }));

		expect(original).not.toBe(withList);
	});

	it("should work with empty fields", () => {
		const posts = collection("posts").list(({ f }) => ({
			columns: [],
		}));

		expect(posts.state.list?.columns).toEqual([]);
	});
});

describe("CollectionBuilder.form()", () => {
	it("should receive v and f proxies in callback", () => {
		const adminModule = AdminBuilder.empty()
			.fields({
				text: createTextField(),
			})
			.views({
				form: createFormView(),
			});

		let receivedF: any;
		let receivedV: any;
		collection("posts")
			.use(adminModule)
			.fields(({ r }) => ({
				title: r.text(),
				body: r.text(),
			}))
			.form(({ v, f }) => {
				receivedV = v;
				receivedF = f;
				return v.form({ fields: [] });
			});

		expect(receivedV).toBeDefined();
		expect(receivedF).toBeDefined();
		expect(receivedF.title).toBe("title");
		expect(receivedF.body).toBe("body");
	});

	it("should allow configuring sidebar fields", () => {
		const adminModule = AdminBuilder.empty()
			.fields({
				text: createTextField(),
			})
			.views({
				form: createFormView(),
			});

		const posts = collection("posts")
			.use(adminModule)
			.fields(({ r }) => ({
				title: r.text(),
				status: r.text(),
			}))
			.form(({ v, f }) =>
				v.form({
					sidebar: {
						position: "right",
						fields: [f.status],
					},
					fields: [],
				}),
			);

		expect(posts.state.form?.["~config"]?.sidebar).toBeDefined();
		expect(posts.state.form?.["~config"]?.sidebar?.fields).toEqual(["status"]);
	});

	it("should allow configuring form sections", () => {
		const adminModule = AdminBuilder.empty()
			.fields({
				text: createTextField(),
			})
			.views({
				form: createFormView(),
			});

		const posts = collection("posts")
			.use(adminModule)
			.fields(({ r }) => ({
				title: r.text(),
				body: r.text(),
			}))
			.form(({ v, f }) =>
				v.form({
					fields: [
						{
							type: "section",
							label: "Content",
							fields: [f.title, f.body],
						},
					],
				}),
			);

		expect(posts.state.form?.["~config"]?.fields).toHaveLength(1);
		expect(posts.state.form?.["~config"]?.fields?.[0].fields).toEqual([
			"title",
			"body",
		]);
	});

	it("should allow configuring form tabs", () => {
		const adminModule = AdminBuilder.empty()
			.fields({
				text: createTextField(),
			})
			.views({
				form: createFormView(),
			});

		const posts = collection("posts")
			.use(adminModule)
			.fields(({ r }) => ({
				title: r.text(),
				body: r.text(),
				seo: r.text(),
			}))
			.form(({ v, f }) =>
				v.form({
					fields: [
						{
							type: "tabs",
							tabs: [
								{ id: "content", label: "Content", fields: [f.title, f.body] },
								{ id: "seo", label: "SEO", fields: [f.seo] },
							],
						},
					],
				}),
			);

		expect(posts.state.form?.["~config"]?.fields).toHaveLength(1);
		expect(posts.state.form?.["~config"]?.fields?.[0].tabs).toHaveLength(2);
	});

	it("should return new builder instance", () => {
		const adminModule = AdminBuilder.empty()
			.fields({
				text: createTextField(),
			})
			.views({
				form: createFormView(),
			});

		const original = collection("posts")
			.use(adminModule)
			.fields(({ r }) => ({ title: r.text() }));

		const withForm = original.form(({ v, f }) => v.form({ fields: [f.title] }));

		expect(original).not.toBe(withForm);
	});
});

describe("CollectionBuilder.state", () => {
	it("should expose readonly state", () => {
		const posts = collection("posts")
			.meta({ label: "Blog Posts" })
			.fields(({ r }) => ({}));

		expect(posts.state).toBeDefined();
		expect(posts.state.name).toBe("posts");
		expect(posts.state.label).toBe("Blog Posts");
	});
});

describe("CollectionBuilder - Full Configuration Chain", () => {
	it("should allow complete configuration chain", () => {
		const adminModule = AdminBuilder.empty()
			.fields({
				text: createTextField(),
				number: createNumberField(),
			})
			.views({
				form: createFormView(),
			});

		const posts = collection("posts")
			.use(adminModule)
			.meta({
				label: "Blog Posts",
				icon: MockIcon,
				description: "Manage your blog content",
			})
			.fields(({ r }) => ({
				title: r.text({ maxLength: 200 } as any),
				body: r.text(),
				views: r.number(),
			}))
			.list(({ f }) => ({
				columns: [f.title, { field: f.views, width: "80px" }],
				defaultSort: { field: f.title, direction: "asc" },
				searchable: true,
				searchFields: [f.title],
			}))
			.form(({ v, f }) =>
				v.form({
					fields: [
						{
							type: "section",
							label: "Content",
							fields: [f.title, f.body],
						},
					],
					sidebar: {
						position: "right",
						fields: [f.views],
					},
				}),
			);

		// Verify all state is correctly set
		expect(posts.state.name).toBe("posts");
		expect(posts.state.label).toBe("Blog Posts");
		expect(posts.state.icon).toBe(MockIcon);
		expect(posts.state.description).toBe("Manage your blog content");
		expect(posts.state.fields?.title.name).toBe("text");
		expect(posts.state.fields?.views.name).toBe("number");
		expect(posts.state.list?.columns).toHaveLength(2);
		expect(posts.state.form?.["~config"]?.fields).toHaveLength(1);
		expect(posts.state.form?.["~config"]?.sidebar?.fields).toEqual(["views"]);
	});
});

describe("CollectionBuilder - Type Safety", () => {
	it("should type field proxy based on defined fields", () => {
		const adminModule = AdminBuilder.empty().fields({
			text: createTextField(),
		});

		collection("posts")
			.use(adminModule)
			.fields(({ r }) => ({
				title: r.text(),
				body: r.text(),
			}))
			.list(({ f }) => {
				// Type-level: f should have title and body
				expectTypeOf(f.title).toEqualTypeOf<"title">();
				expectTypeOf(f.body).toEqualTypeOf<"body">();
				return { columns: [f.title] };
			});
	});

	it("should type registry proxy based on admin module fields", () => {
		const adminModule = AdminBuilder.empty().fields({
			text: createTextField(),
			email: createEmailField(),
		});

		collection("posts")
			.use(adminModule)
			.fields(({ r }) => {
				// Type-level: r should have text and email
				expectTypeOf(r.text).toBeFunction();
				expectTypeOf(r.email).toBeFunction();
				return {};
			});
	});
});

describe("CollectionBuilder immutability", () => {
	it("should create new instance on every method call", () => {
		const adminModule = AdminBuilder.empty().fields({
			text: createTextField(),
		});

		const a = collection("posts");
		const b = a.use(adminModule);
		const c = b.meta({ label: "Posts" });
		const d = c.fields(({ r }) => ({ title: r.text() }));
		const e = d.list(({ f }) => ({ columns: [f.title] }));
		const f = e.form(({ f }) => ({ fields: [f.title] }));

		expect(a).not.toBe(b);
		expect(b).not.toBe(c);
		expect(c).not.toBe(d);
		expect(d).not.toBe(e);
		expect(e).not.toBe(f);
	});
});

describe("Custom view extensibility", () => {
	// Simulating a custom Kanban view
	interface KanbanViewConfig {
		groupByField: string;
		cardTitle?: string;
		columns?: string[];
	}

	interface KanbanViewProps {
		collection: string;
		viewConfig?: KanbanViewConfig;
		navigate: (path: string) => void;
	}

	const KanbanView: React.FC<KanbanViewProps> = () => null;

	it("should allow registering custom list views", () => {
		// 1. Create the custom view definition
		const kanbanView = listView("kanban", { component: KanbanView });

		// 2. Register it in a module
		const adminModule = AdminBuilder.empty()
			.fields({ text: createTextField() })
			.views({ kanban: kanbanView });

		expect(adminModule.state.listViews.kanban).toBeDefined();
		expect(adminModule.state.listViews.kanban.name).toBe("kanban");
		expect(adminModule.state.listViews.kanban.kind).toBe("list");
	});

	it("should provide typed config when using custom view in collection", () => {
		const kanbanView = listView("kanban", { component: KanbanView });

		const adminModule = AdminBuilder.empty()
			.fields({ text: createTextField() })
			.views({ kanban: kanbanView });

		// 3. Use the custom view in a collection
		const tasks = collection("tasks")
			.use(adminModule)
			.fields(({ r }) => ({
				title: r.text(),
				status: r.text(),
			}))
			.list(({ v, f }) =>
				v.kanban({
					groupByField: f.status,
					cardTitle: f.title,
					columns: [f.title],
				}),
			);

		// Verify the config contains our custom properties
		const config = tasks.state.list?.["~config"];
		expect(config.groupByField).toBe("status");
		expect(config.cardTitle).toBe("title");
		expect(config.columns).toEqual(["title"]);
	});

	it("should allow multiple custom views", () => {
		// Multiple custom views
		const kanbanView = listView("kanban", { component: KanbanView });

		interface CalendarViewConfig {
			dateField: string;
			titleField: string;
		}
		const CalendarView: React.FC<{ viewConfig?: CalendarViewConfig }> = () =>
			null;
		const calendarView = listView("calendar", { component: CalendarView });

		interface WizardFormConfig {
			steps: { id: string; fields: string[] }[];
		}
		const WizardForm: React.FC<{ viewConfig?: WizardFormConfig }> = () => null;
		const wizardView = editView("wizard", { component: WizardForm });

		const adminModule = AdminBuilder.empty()
			.fields({ text: createTextField() })
			.views({
				kanban: kanbanView,
				calendar: calendarView,
				wizard: wizardView,
			});

		// Verify all views are registered
		expect(Object.keys(adminModule.state.listViews)).toContain("kanban");
		expect(Object.keys(adminModule.state.listViews)).toContain("calendar");
		expect(Object.keys(adminModule.state.editViews)).toContain("wizard");
	});
});
