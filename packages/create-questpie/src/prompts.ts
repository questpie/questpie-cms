import * as p from "@clack/prompts";
import pc from "picocolors";
import { templates } from "./templates.js";
import { isValidPackageName, toDbName } from "./utils.js";

export type ProjectOptions = {
	projectName: string;
	templateId: string;
	databaseName: string;
	installDeps: boolean;
	initGit: boolean;
};

export async function runPrompts(
	args: Partial<ProjectOptions> & { projectName?: string },
): Promise<ProjectOptions> {
	p.intro(pc.bgCyan(pc.black(" QUESTPIE — Create a new project ")));

	const questions = await p.group(
		{
			projectName: () => {
				if (args.projectName) return Promise.resolve(args.projectName);
				return p.text({
					message: "Project name",
					placeholder: "my-questpie-app",
					validate: (value) => {
						if (!value) return "Project name is required";
						if (!isValidPackageName(value))
							return "Invalid package name (use lowercase, hyphens, no spaces)";
					},
				});
			},
			templateId: () => {
				if (args.templateId) return Promise.resolve(args.templateId);
				if (templates.length === 1) return Promise.resolve(templates[0].id);
				return p.select({
					message: "Select a template",
					options: templates.map((t) => ({
						value: t.id,
						label: t.label,
						hint: t.hint,
					})),
				});
			},
			databaseName: ({ results }) => {
				if (args.databaseName) return Promise.resolve(args.databaseName);
				const defaultDb = toDbName(results.projectName as string);
				return p.text({
					message: "Database name",
					placeholder: defaultDb,
					defaultValue: defaultDb,
				});
			},
			installDeps: () => {
				if (args.installDeps !== undefined)
					return Promise.resolve(args.installDeps);
				return p.confirm({
					message: "Install dependencies?",
					initialValue: true,
				});
			},
			initGit: () => {
				if (args.initGit !== undefined) return Promise.resolve(args.initGit);
				return p.confirm({
					message: "Initialize git repository?",
					initialValue: true,
				});
			},
		},
		{
			onCancel: () => {
				p.cancel("Operation cancelled.");
				process.exit(0);
			},
		},
	);

	return {
		projectName: questions.projectName as string,
		templateId: questions.templateId as string,
		databaseName: questions.databaseName as string,
		installDeps: questions.installDeps as boolean,
		initGit: questions.initGit as boolean,
	};
}
