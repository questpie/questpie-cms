import "./questpie/server/.generated/index";
import type { Registry } from "questpie";

// Check ~fieldTypes
type HasFieldTypes = "~fieldTypes" extends keyof Registry ? true : false;
type FieldTypes = Registry["~fieldTypes"];
type _AllFieldTypes = Registry extends { "~fieldTypes": infer F } ? F : "FALLBACK";

// Check keys
type FieldTypeKeys = keyof FieldTypes;

declare const a: HasFieldTypes; const _a: never = a;
declare const b: FieldTypes; const _b: never = b;
declare const c: _AllFieldTypes; const _c: never = c;
declare const d: FieldTypeKeys; const _d: never = d;
