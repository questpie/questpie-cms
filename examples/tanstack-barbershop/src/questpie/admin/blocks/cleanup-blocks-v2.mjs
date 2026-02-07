import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const blocksDir =
	"/Users/drepkovsky/questpie/repos/questpie-cms/examples/tanstack-barbershop/src/questpie/admin/blocks";

const files = readdirSync(blocksDir).filter(
	(f) => f.endsWith(".tsx") && f !== "index.tsx",
);

for (const file of files) {
	const filePath = join(blocksDir, file);
	let content = readFileSync(filePath, "utf-8");

	// Remove the builder import if it exists
	content = content.replace(
		/import\s*{\s*builder\s*}\s*from\s*["']\.\.\/builder["'];?\n?/g,
		"",
	);

	// Remove the block definition (everything from export const ... = builder.block(...) to .build())
	const blockDefRegex =
		/export\s+const\s+\w+\s*=\s*builder\s*\.block\([\s\S]*?\.build\(\);?/g;
	content = content.replace(blockDefRegex, "");

	// Export all functions that look like renderers
	content = content.replace(/function\s+(\w+Renderer)/g, "export function $1");

	// Remove old trailing exports if any
	content = content.replace(/\nexport\s+{\s*[\w,\s]*\s*};?\n?$/g, "");

	writeFileSync(filePath, content);
	console.log(`Cleaned properly: ${file}`);
}
