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
	// We match until the end of the file since build() is usually the last call
	const blockDefRegex =
		/export\s+const\s+\w+\s*=\s*builder\s*\.block\([\s\S]*?\.build\(\);?/g;
	content = content.replace(blockDefRegex, "");

	// Ensure we export the renderers
	// We'll find functions named *Renderer and export them
	const rendererMatch = content.match(/function\s+(\w+Renderer)/);
	if (rendererMatch) {
		const rendererName = rendererMatch[1];
		if (!content.includes(`export { ${rendererName} }`)) {
			content += `\nexport { ${rendererName} };\n`;
		}
	}

	writeFileSync(filePath, content);
	console.log(`Cleaned: ${file}`);
}
