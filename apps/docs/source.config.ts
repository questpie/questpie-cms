import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { remarkAutoTypeTable, createGenerator, createFileSystemGeneratorCache } from 'fumadocs-typescript';

const generator = createGenerator({
  // Use a stable cache directory
  cache: createFileSystemGeneratorCache('./.source/fumadocs-typescript'),
});

export const docs = defineDocs({
  dir: 'content/docs',
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [[remarkAutoTypeTable, { generator }]],
  },
});