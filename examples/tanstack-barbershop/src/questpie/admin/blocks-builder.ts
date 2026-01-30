/**
 * Blocks Builder
 *
 * Builder with registered blocks for type-safe allowedBlocks in pages collection.
 */

import { builder } from "./builder";
import blocks from "./blocks";

export const blocksBuilder = builder.blocks(blocks);
