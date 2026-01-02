/**
 * RichTextEditor Component
 *
 * Tiptap-based rich text editor with toolbar controls.
 */

import * as React from "react";
import { Extension, type Editor, type Range } from "@tiptap/core";
import type { Extension as TiptapExtension } from "@tiptap/core";
import { BubbleMenu, EditorContent, ReactRenderer, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import CharacterCount from "@tiptap/extension-character-count";
import Suggestion from "@tiptap/suggestion";
import tippy, { type Instance } from "tippy.js";
import { lowlight } from "lowlight";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { LocaleBadge } from "../locale-badge";
import {
	Popover,
	PopoverContent,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "../../ui/popover";
import type { FieldComponentProps } from "../../../config/component-registry";
import { cn } from "../../../utils";

export type RichTextFeatures = {
	toolbar?: boolean;
	bubbleMenu?: boolean;
	slashCommands?: boolean;
	history?: boolean;
	heading?: boolean;
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	strike?: boolean;
	code?: boolean;
	codeBlock?: boolean;
	blockquote?: boolean;
	bulletList?: boolean;
	orderedList?: boolean;
	horizontalRule?: boolean;
	align?: boolean;
	link?: boolean;
	image?: boolean;
	table?: boolean;
	tableControls?: boolean;
	characterCount?: boolean;
};

export interface RichTextEditorProps extends FieldComponentProps<any> {
	/**
	 * Output format
	 */
	outputFormat?: "json" | "html" | "markdown";

	/**
	 * Custom Tiptap extensions
	 */
	extensions?: TiptapExtension[];

	/**
	 * Feature toggles
	 */
	features?: RichTextFeatures;

	/**
	 * Show character count
	 */
	showCharacterCount?: boolean;

	/**
	 * Max character limit
	 */
	maxCharacters?: number;

	/**
	 * Enable image uploads
	 */
	enableImages?: boolean;

	/**
	 * Image upload handler
	 */
	onImageUpload?: (file: File) => Promise<string>;
}

type OutputValue = Record<string, any> | string;

type ToolbarButtonProps = {
	active?: boolean;
	disabled?: boolean;
	title?: string;
	onClick: () => void;
	children: React.ReactNode;
};

type SlashCommandItem = {
	title: string;
	description?: string;
	keywords?: string[];
	command: (editor: Editor) => void;
};

type SlashCommandListProps = {
	items: SlashCommandItem[];
	command: (item: SlashCommandItem) => void;
};

type SlashCommandListHandle = {
	onKeyDown: (props: { event: KeyboardEvent }) => boolean;
};

const defaultFeatures: Required<RichTextFeatures> = {
	toolbar: true,
	bubbleMenu: true,
	slashCommands: true,
	history: true,
	heading: true,
	bold: true,
	italic: true,
	underline: true,
	strike: true,
	code: true,
	codeBlock: true,
	blockquote: true,
	bulletList: true,
	orderedList: true,
	horizontalRule: true,
	align: true,
	link: true,
	image: true,
	table: true,
	tableControls: true,
	characterCount: true,
};

function ToolbarButton({
	active,
	disabled,
	title,
	onClick,
	children,
}: ToolbarButtonProps) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="xs"
			data-active={active}
			title={title}
			disabled={disabled}
			onClick={onClick}
			className="data-[active=true]:bg-muted data-[active=true]:text-foreground"
		>
			{children}
		</Button>
	);
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex items-center gap-1 border-r border-border pr-2 last:border-r-0 last:pr-0">
			{children}
		</div>
	);
}

const SlashCommandList = React.forwardRef<
	SlashCommandListHandle,
	SlashCommandListProps
>(function SlashCommandList({ items, command }, ref) {
	const [selectedIndex, setSelectedIndex] = React.useState(0);

	React.useEffect(() => {
		setSelectedIndex(0);
	}, [items]);

	const selectItem = React.useCallback(
		(index: number) => {
			const item = items[index];
			if (item) {
				command(item);
			}
		},
		[command, items],
	);

	React.useImperativeHandle(ref, () => ({
		onKeyDown: ({ event }) => {
			if (items.length === 0) return false;
			if (event.key === "ArrowDown") {
				setSelectedIndex((prev) => (prev + 1) % items.length);
				return true;
			}

			if (event.key === "ArrowUp") {
				setSelectedIndex((prev) =>
					(prev - 1 + items.length) % items.length,
				);
				return true;
			}

			if (event.key === "Enter") {
				selectItem(selectedIndex);
				return true;
			}

			return false;
		},
	}));

	return (
		<div className="qp-rich-text-editor__slash">
			{items.length === 0 && (
				<div className="qp-rich-text-editor__slash-empty">
					No results
				</div>
			)}
			{items.map((item, index) => (
				<button
					key={item.title}
					type="button"
					className={cn(
						"qp-rich-text-editor__slash-item",
						index === selectedIndex
							? "qp-rich-text-editor__slash-item--active"
							: "",
					)}
					onClick={() => selectItem(index)}
				>
					<span className="qp-rich-text-editor__slash-title">
						{item.title}
					</span>
					{item.description && (
						<span className="qp-rich-text-editor__slash-description">
							{item.description}
						</span>
					)}
				</button>
			))}
		</div>
	);
});

function getHeadingLevel(editor: ReturnType<typeof useEditor>) {
	if (!editor) return "paragraph";
	for (let level = 1; level <= 6; level += 1) {
		if (editor.isActive("heading", { level })) {
			return String(level);
		}
	}
	return "paragraph";
}

function getOutput(
	editor: NonNullable<ReturnType<typeof useEditor>>,
	outputFormat: "json" | "html" | "markdown",
) {
	if (outputFormat === "html") {
		return editor.getHTML();
	}

	if (outputFormat === "markdown") {
		const markdown = (editor.storage as any)?.markdown?.getMarkdown?.();
		if (typeof markdown === "string") {
			return markdown;
		}
		return editor.getHTML();
	}

	return editor.getJSON();
}

function isSameValue(a: OutputValue | undefined, b: OutputValue | undefined) {
	if (a === b) return true;
	if (!a || !b) return false;
	if (typeof a === "string" && typeof b === "string") return a === b;
	try {
		return JSON.stringify(a) === JSON.stringify(b);
	} catch {
		return false;
	}
}

function createSlashCommandExtension(getItems: (editor: Editor) => SlashCommandItem[]) {
	return Extension.create({
		name: "slashCommand",
		addOptions() {
			return {
				suggestion: {
					char: "/",
					startOfLine: true,
					command: ({ editor, range, props }: { editor: Editor; range: Range; props: SlashCommandItem }) => {
						editor
							.chain()
							.focus()
							.deleteRange(range)
							.run();
						props.command(editor);
					},
					items: ({ query, editor }: { query: string; editor: Editor }) => {
						const items = getItems(editor);
						if (!query) return items;
						const search = query.toLowerCase();
						return items.filter((item) => {
							return (
								item.title.toLowerCase().includes(search) ||
								item.description?.toLowerCase().includes(search) ||
								item.keywords?.some((keyword) =>
									keyword.toLowerCase().includes(search),
								)
							);
						});
					},
					render: () => {
						let component: ReactRenderer<SlashCommandListHandle> | null = null;
						let popup: Instance[] | null = null;

						return {
							onStart: (props: any) => {
								component = new ReactRenderer(SlashCommandList, {
									props,
									editor: props.editor,
								});

								if (!props.clientRect) {
									return;
								}

								popup = tippy("body", {
									getReferenceClientRect: props.clientRect,
									appendTo: () => document.body,
									content: component.element,
									showOnCreate: true,
									interactive: true,
									trigger: "manual",
									placement: "bottom-start",
									theme: "qp-rich-text-editor",
								});
							},

							onUpdate: (props: any) => {
								component?.updateProps(props);

								if (!props.clientRect) {
									return;
								}

								popup?.[0].setProps({
									getReferenceClientRect: props.clientRect,
								});
							},

							onKeyDown: (props: any) => {
								if (props.event.key === "Escape") {
									popup?.[0].hide();
									return true;
								}

								return component?.ref?.onKeyDown(props) ?? false;
							},

							onExit: () => {
								popup?.[0].destroy();
								component?.destroy();
							},
						};
					},
				},
			};
		},
		addProseMirrorPlugins() {
			return [Suggestion(this.options.suggestion)];
		},
	});
}

export function RichTextEditor({
	name,
	value,
	onChange,
	disabled,
	readOnly,
	label,
	description,
	placeholder,
	required,
	error,
	localized,
	locale,
	outputFormat = "json",
	extensions,
	features,
	showCharacterCount,
	maxCharacters,
	enableImages,
	onImageUpload,
}: RichTextEditorProps) {
	const [linkOpen, setLinkOpen] = React.useState(false);
	const [linkUrl, setLinkUrl] = React.useState("");
	const [imageOpen, setImageOpen] = React.useState(false);
	const [imageUrl, setImageUrl] = React.useState("");
	const [imageAlt, setImageAlt] = React.useState("");
	const [uploadingImage, setUploadingImage] = React.useState(false);
	const fileInputRef = React.useRef<HTMLInputElement | null>(null);

	const resolvedFeatures = React.useMemo(
		() => ({
			...defaultFeatures,
			...features,
		}),
		[features],
	);

	const allowImages = resolvedFeatures.image && (enableImages ?? true);
	const allowLinks = resolvedFeatures.link;
	const allowTables = resolvedFeatures.table;
	const allowTableControls = resolvedFeatures.tableControls && allowTables;
	const allowSlashCommands = resolvedFeatures.slashCommands;
	const allowBubbleMenu = resolvedFeatures.bubbleMenu;
	const allowToolbar = resolvedFeatures.toolbar;
	const allowCharacterCount =
		resolvedFeatures.characterCount && (showCharacterCount || maxCharacters);

	const resolvedExtensions = React.useMemo(() => {
		const starterKitConfig: Record<string, any> = {
			codeBlock: false,
		};

		if (!resolvedFeatures.bold) starterKitConfig.bold = false;
		if (!resolvedFeatures.italic) starterKitConfig.italic = false;
		if (!resolvedFeatures.strike) starterKitConfig.strike = false;
		if (!resolvedFeatures.code) starterKitConfig.code = false;
		if (!resolvedFeatures.blockquote) starterKitConfig.blockquote = false;
		if (!resolvedFeatures.heading) starterKitConfig.heading = false;
		if (!resolvedFeatures.bulletList) starterKitConfig.bulletList = false;
		if (!resolvedFeatures.orderedList) starterKitConfig.orderedList = false;
		if (!resolvedFeatures.bulletList && !resolvedFeatures.orderedList) {
			starterKitConfig.listItem = false;
		}
		if (!resolvedFeatures.horizontalRule)
			starterKitConfig.horizontalRule = false;
		if (!resolvedFeatures.history) starterKitConfig.history = false;

		const items: TiptapExtension[] = [
			StarterKit.configure(starterKitConfig),
			Placeholder.configure({
				placeholder: placeholder || "Start writing...",
			}),
		];

		if (resolvedFeatures.underline) {
			items.push(Underline);
		}

		if (allowLinks) {
			items.push(
				Link.configure({
					openOnClick: false,
					autolink: true,
					linkOnPaste: true,
				}),
			);
		}

		if (resolvedFeatures.align) {
			items.push(TextAlign.configure({ types: ["heading", "paragraph"] }));
		}

		if (allowImages) {
			items.push(Image);
		}

		if (allowTables) {
			items.push(
				Table.configure({ resizable: true }),
				TableRow,
				TableHeader,
				TableCell,
			);
		}

		if (resolvedFeatures.codeBlock) {
			items.push(CodeBlockLowlight.configure({ lowlight }));
		}

		if (allowCharacterCount) {
			items.push(
				CharacterCount.configure({
					limit: maxCharacters,
				}),
			);
		}

		if (allowSlashCommands) {
			items.push(
				createSlashCommandExtension((editor) => {
					const commands: SlashCommandItem[] = [];

					if (resolvedFeatures.heading) {
						commands.push(
							{
								title: "Heading 1",
								description: "Large section heading",
								keywords: ["h1"],
								command: (cmdEditor) =>
									cmdEditor.chain().focus().toggleHeading({ level: 1 }).run(),
							},
							{
								title: "Heading 2",
								description: "Medium section heading",
								keywords: ["h2"],
								command: (cmdEditor) =>
									cmdEditor.chain().focus().toggleHeading({ level: 2 }).run(),
							},
							{
								title: "Heading 3",
								description: "Small section heading",
								keywords: ["h3"],
								command: (cmdEditor) =>
									cmdEditor.chain().focus().toggleHeading({ level: 3 }).run(),
							},
						);
					}

					commands.push({
						title: "Paragraph",
						description: "Start with plain text",
						keywords: ["text"],
						command: (cmdEditor) =>
							cmdEditor.chain().focus().setParagraph().run(),
					});

					if (resolvedFeatures.bulletList) {
						commands.push({
							title: "Bullet list",
							description: "Create a bulleted list",
							keywords: ["list", "ul"],
							command: (cmdEditor) =>
								cmdEditor.chain().focus().toggleBulletList().run(),
						});
					}

					if (resolvedFeatures.orderedList) {
						commands.push({
							title: "Numbered list",
							description: "Create an ordered list",
							keywords: ["list", "ol"],
							command: (cmdEditor) =>
								cmdEditor.chain().focus().toggleOrderedList().run(),
						});
					}

					if (resolvedFeatures.blockquote) {
						commands.push({
							title: "Quote",
							description: "Capture a quote",
							keywords: ["blockquote"],
							command: (cmdEditor) =>
								cmdEditor.chain().focus().toggleBlockquote().run(),
						});
					}

					if (resolvedFeatures.codeBlock) {
						commands.push({
							title: "Code block",
							description: "Insert code snippet",
							keywords: ["code"],
							command: (cmdEditor) =>
								cmdEditor.chain().focus().toggleCodeBlock().run(),
						});
					}

					if (resolvedFeatures.horizontalRule) {
						commands.push({
							title: "Divider",
							description: "Insert a horizontal rule",
							keywords: ["hr"],
							command: (cmdEditor) =>
								cmdEditor.chain().focus().setHorizontalRule().run(),
						});
					}

					if (allowTables) {
						commands.push({
							title: "Table",
							description: "Insert a 3x3 table",
							keywords: ["grid"],
							command: (cmdEditor) =>
								cmdEditor
									.chain()
									.focus()
									.insertTable({ rows: 3, cols: 3, withHeaderRow: true })
									.run(),
						});
					}

					return commands;
				}),
			);
		}

		if (extensions?.length) {
			items.push(...extensions);
		}

		return items;
	}, [
		allowCharacterCount,
		allowImages,
		allowLinks,
		allowSlashCommands,
		allowTables,
		extensions,
		maxCharacters,
		placeholder,
		resolvedFeatures,
	]);

	const editor = useEditor({
		extensions: resolvedExtensions,
		content: value ?? "",
		editorProps: {
			attributes: {
				class: "qp-rich-text-editor__content",
			},
		},
		editable: !disabled && !readOnly,
		onUpdate: ({ editor: currentEditor }) => {
			if (disabled || readOnly) return;
			const nextValue = getOutput(currentEditor, outputFormat);
			onChange(nextValue as OutputValue);
		},
	});

	const isEditable = !disabled && !readOnly;
	const headingValue = getHeadingLevel(editor);
	const inTable = editor?.isActive("table") ?? false;

	React.useEffect(() => {
		if (!editor) return;
		editor.setEditable(isEditable);
	}, [editor, isEditable]);

	React.useEffect(() => {
		if (!editor) return;
		if (value === undefined) return;

		const currentValue = getOutput(editor, outputFormat);
		if (isSameValue(value as OutputValue, currentValue as OutputValue)) {
			return;
		}

		editor.commands.setContent(value ?? "", false);
	}, [editor, outputFormat, value]);

	React.useEffect(() => {
		if (!linkOpen || !editor) return;
		const currentLink = editor.getAttributes("link").href as string | undefined;
		setLinkUrl(currentLink || "");
	}, [editor, linkOpen]);

	const handleApplyLink = React.useCallback(() => {
		if (!editor) return;
		if (!linkUrl) {
			editor.chain().focus().unsetLink().run();
			setLinkOpen(false);
			return;
		}

		editor
			.chain()
			.focus()
			.setLink({
				href: linkUrl,
				target: "_blank",
				rel: "noopener noreferrer",
			})
			.run();
		setLinkOpen(false);
	}, [editor, linkUrl]);

	const handleRemoveLink = React.useCallback(() => {
		if (!editor) return;
		editor.chain().focus().unsetLink().run();
		setLinkOpen(false);
	}, [editor]);

	const handleInsertImageUrl = React.useCallback(() => {
		if (!editor || !imageUrl) return;
		editor
			.chain()
			.focus()
			.setImage({ src: imageUrl, alt: imageAlt || undefined })
			.run();
		setImageUrl("");
		setImageAlt("");
		setImageOpen(false);
	}, [editor, imageAlt, imageUrl]);

	const handleImageUpload = React.useCallback(
		async (event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (!file || !editor || !onImageUpload) return;

			try {
				setUploadingImage(true);
				const url = await onImageUpload(file);
				if (url) {
					editor
						.chain()
						.focus()
						.setImage({ src: url, alt: imageAlt || undefined })
						.run();
					setImageUrl("");
					setImageAlt("");
					setImageOpen(false);
				}
			} finally {
				setUploadingImage(false);
				event.target.value = "";
			}
		},
		[editor, imageAlt, onImageUpload],
	);

	const characterCount = React.useMemo(() => {
		if (!editor) return { characters: 0, words: 0 };
		const storage = editor.storage as any;
		if (storage?.characterCount) {
			return {
				characters: storage.characterCount.characters(),
				words: storage.characterCount.words(),
			};
		}
		const text = editor.getText();
		const words = text.trim().length
			? text.trim().split(/\s+/).length
			: 0;
		return { characters: text.length, words };
	}, [editor, value]);

	return (
		<div className="space-y-2" data-disabled={disabled || readOnly}>
			{label && (
				<div className="flex items-center gap-2">
					<Label htmlFor={name}>
						{label}
						{required && <span className="text-destructive ml-1">*</span>}
					</Label>
					{localized && <LocaleBadge locale={locale || "i18n"} />}
				</div>
			)}

			<div
				className={cn(
					"qp-rich-text-editor rounded-md border bg-background",
					disabled || readOnly ? "opacity-60" : "",
					error ? "border-destructive" : "border-input",
				)}
			>
				{editor && allowToolbar && (
					<div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 p-2">
						{resolvedFeatures.history && (
							<ToolbarGroup>
								<ToolbarButton
									disabled={!isEditable || !editor.can().undo()}
									title="Undo"
									onClick={() => editor.chain().focus().undo().run()}
								>
									Undo
								</ToolbarButton>
								<ToolbarButton
									disabled={!isEditable || !editor.can().redo()}
									title="Redo"
									onClick={() => editor.chain().focus().redo().run()}
								>
									Redo
								</ToolbarButton>
							</ToolbarGroup>
						)}

						{resolvedFeatures.heading && (
							<ToolbarGroup>
								<select
									className="h-6 rounded-sm border bg-background px-2 text-xs"
									value={headingValue}
									onChange={(event) => {
										if (!editor) return;
										const nextValue = event.target.value;
										if (nextValue === "paragraph") {
											editor.chain().focus().setParagraph().run();
											return;
										}
										editor
											.chain()
											.focus()
											.toggleHeading({ level: Number(nextValue) })
											.run();
									}}
									disabled={!isEditable}
								>
									<option value="paragraph">Paragraph</option>
									<option value="1">Heading 1</option>
									<option value="2">Heading 2</option>
									<option value="3">Heading 3</option>
									<option value="4">Heading 4</option>
									<option value="5">Heading 5</option>
									<option value="6">Heading 6</option>
								</select>
							</ToolbarGroup>
						)}

						<ToolbarGroup>
							{resolvedFeatures.bold && (
								<ToolbarButton
									active={editor.isActive("bold")}
									disabled={!isEditable}
									title="Bold"
									onClick={() => editor.chain().focus().toggleBold().run()}
								>
									Bold
								</ToolbarButton>
							)}
							{resolvedFeatures.italic && (
								<ToolbarButton
									active={editor.isActive("italic")}
									disabled={!isEditable}
									title="Italic"
									onClick={() => editor.chain().focus().toggleItalic().run()}
								>
									Italic
								</ToolbarButton>
							)}
							{resolvedFeatures.underline && (
								<ToolbarButton
									active={editor.isActive("underline")}
									disabled={!isEditable}
									title="Underline"
									onClick={() => editor.chain().focus().toggleUnderline().run()}
								>
									Underline
								</ToolbarButton>
							)}
							{resolvedFeatures.strike && (
								<ToolbarButton
									active={editor.isActive("strike")}
									disabled={!isEditable}
									title="Strikethrough"
									onClick={() => editor.chain().focus().toggleStrike().run()}
								>
									Strike
								</ToolbarButton>
							)}
							{resolvedFeatures.code && (
								<ToolbarButton
									active={editor.isActive("code")}
									disabled={!isEditable}
									title="Inline code"
									onClick={() => editor.chain().focus().toggleCode().run()}
								>
									Code
								</ToolbarButton>
							)}
							{resolvedFeatures.codeBlock && (
								<ToolbarButton
									active={editor.isActive("codeBlock")}
									disabled={!isEditable}
									title="Code block"
									onClick={() => editor.chain().focus().toggleCodeBlock().run()}
								>
									Code Block
								</ToolbarButton>
							)}
						</ToolbarGroup>

						<ToolbarGroup>
							{resolvedFeatures.bulletList && (
								<ToolbarButton
									active={editor.isActive("bulletList")}
									disabled={!isEditable}
									title="Bullet list"
									onClick={() => editor.chain().focus().toggleBulletList().run()}
								>
									Bullet List
								</ToolbarButton>
							)}
							{resolvedFeatures.orderedList && (
								<ToolbarButton
									active={editor.isActive("orderedList")}
									disabled={!isEditable}
									title="Numbered list"
									onClick={() => editor.chain().focus().toggleOrderedList().run()}
								>
									Numbered List
								</ToolbarButton>
							)}
							{resolvedFeatures.blockquote && (
								<ToolbarButton
									active={editor.isActive("blockquote")}
									disabled={!isEditable}
									title="Blockquote"
									onClick={() => editor.chain().focus().toggleBlockquote().run()}
								>
									Quote
								</ToolbarButton>
							)}
							{resolvedFeatures.horizontalRule && (
								<ToolbarButton
									disabled={!isEditable}
									title="Horizontal rule"
									onClick={() => editor.chain().focus().setHorizontalRule().run()}
								>
									Divider
								</ToolbarButton>
							)}
						</ToolbarGroup>

						{resolvedFeatures.align && (
							<ToolbarGroup>
								<ToolbarButton
									active={editor.isActive({ textAlign: "left" })}
									disabled={!isEditable}
									title="Align left"
									onClick={() =>
										editor.chain().focus().setTextAlign("left").run()
									}
								>
									Align Left
								</ToolbarButton>
								<ToolbarButton
									active={editor.isActive({ textAlign: "center" })}
									disabled={!isEditable}
									title="Align center"
									onClick={() =>
										editor.chain().focus().setTextAlign("center").run()
									}
								>
									Align Center
								</ToolbarButton>
								<ToolbarButton
									active={editor.isActive({ textAlign: "right" })}
									disabled={!isEditable}
									title="Align right"
									onClick={() =>
										editor.chain().focus().setTextAlign("right").run()
									}
								>
									Align Right
								</ToolbarButton>
								<ToolbarButton
									active={editor.isActive({ textAlign: "justify" })}
									disabled={!isEditable}
									title="Align justify"
									onClick={() =>
										editor.chain().focus().setTextAlign("justify").run()
									}
								>
									Justify
								</ToolbarButton>
							</ToolbarGroup>
						)}

						<ToolbarGroup>
							{allowLinks && (
								<Popover open={linkOpen} onOpenChange={setLinkOpen}>
									<PopoverTrigger asChild>
										<Button
											type="button"
											variant="ghost"
											size="xs"
											disabled={!isEditable}
											data-active={editor.isActive("link")}
										>
											Link
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-72">
										<PopoverHeader>
											<PopoverTitle>Insert link</PopoverTitle>
										</PopoverHeader>
										<div className="space-y-2">
											<Input
												value={linkUrl}
												placeholder="https://example.com"
												onChange={(event) =>
													setLinkUrl(event.target.value)
												}
												disabled={!isEditable}
											/>
											<div className="flex justify-end gap-2">
												<Button
													type="button"
													size="xs"
													variant="outline"
													onClick={handleRemoveLink}
													disabled={!isEditable || !editor.isActive("link")}
												>
													Remove
												</Button>
												<Button
													type="button"
													size="xs"
													onClick={handleApplyLink}
													disabled={!isEditable}
												>
													Apply
												</Button>
											</div>
										</div>
									</PopoverContent>
								</Popover>
							)}

							{allowImages && (
								<Popover open={imageOpen} onOpenChange={setImageOpen}>
									<PopoverTrigger asChild>
										<Button
											type="button"
											variant="ghost"
											size="xs"
											disabled={!isEditable}
										>
											Image
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-80">
										<PopoverHeader>
											<PopoverTitle>Insert image</PopoverTitle>
										</PopoverHeader>
										<div className="space-y-3">
											<div className="space-y-2">
												<Input
													value={imageUrl}
													placeholder="https://example.com/image.jpg"
													onChange={(event) =>
														setImageUrl(event.target.value)
													}
													disabled={!isEditable}
												/>
												<Input
													value={imageAlt}
													placeholder="Alt text (optional)"
													onChange={(event) =>
														setImageAlt(event.target.value)
													}
													disabled={!isEditable}
												/>
												<div className="flex justify-end gap-2">
													<Button
														type="button"
														size="xs"
														onClick={handleInsertImageUrl}
														disabled={!isEditable || !imageUrl}
													>
														Insert URL
													</Button>
												</div>
											</div>

											{onImageUpload && (
												<div className="space-y-2">
													<div className="text-xs font-medium">
														Upload file
													</div>
													<input
														ref={fileInputRef}
														type="file"
														accept="image/*"
														onChange={handleImageUpload}
														className="sr-only"
														disabled={!isEditable || uploadingImage}
													/>
													<Button
														type="button"
														size="xs"
														variant="outline"
														onClick={() => fileInputRef.current?.click()}
														disabled={!isEditable || uploadingImage}
													>
														{uploadingImage ? "Uploading..." : "Choose file"}
													</Button>
												</div>
											)}
										</div>
									</PopoverContent>
								</Popover>
							)}

							{allowTableControls && (
								<Popover>
									<PopoverTrigger asChild>
										<Button
											type="button"
											variant="ghost"
											size="xs"
											disabled={!isEditable}
										>
											Table
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-80">
										<PopoverHeader>
											<PopoverTitle>Table tools</PopoverTitle>
										</PopoverHeader>
										<div className="grid grid-cols-2 gap-2">
											<Button
												type="button"
												size="xs"
												onClick={() =>
													editor
														.chain()
														.focus()
														.insertTable({
															rows: 3,
															cols: 3,
															withHeaderRow: true,
														})
														.run()
												}
												disabled={!isEditable}
											>
												Insert table
											</Button>
											<Button
												type="button"
												size="xs"
												variant="outline"
												onClick={() => editor.chain().focus().addRowBefore().run()}
												disabled={!isEditable || !inTable}
											>
												Add row before
											</Button>
											<Button
												type="button"
												size="xs"
												variant="outline"
												onClick={() => editor.chain().focus().addRowAfter().run()}
												disabled={!isEditable || !inTable}
											>
												Add row after
											</Button>
											<Button
												type="button"
												size="xs"
												variant="outline"
												onClick={() => editor.chain().focus().addColumnBefore().run()}
												disabled={!isEditable || !inTable}
											>
												Add column before
											</Button>
											<Button
												type="button"
												size="xs"
												variant="outline"
												onClick={() => editor.chain().focus().addColumnAfter().run()}
												disabled={!isEditable || !inTable}
											>
												Add column after
											</Button>
											<Button
												type="button"
												size="xs"
												variant="outline"
												onClick={() => editor.chain().focus().deleteRow().run()}
												disabled={!isEditable || !inTable}
											>
												Delete row
											</Button>
											<Button
												type="button"
												size="xs"
												variant="outline"
												onClick={() => editor.chain().focus().deleteColumn().run()}
												disabled={!isEditable || !inTable}
											>
												Delete column
											</Button>
											<Button
												type="button"
												size="xs"
												variant="outline"
												onClick={() => editor.chain().focus().toggleHeaderRow().run()}
												disabled={!isEditable || !inTable}
											>
												Toggle header row
											</Button>
											<Button
												type="button"
												size="xs"
												variant="outline"
												onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
												disabled={!isEditable || !inTable}
											>
												Toggle header column
											</Button>
											<Button
												type="button"
												size="xs"
												variant="outline"
												onClick={() => editor.chain().focus().mergeCells().run()}
												disabled={!isEditable || !inTable}
											>
												Merge cells
											</Button>
											<Button
												type="button"
												size="xs"
												variant="outline"
												onClick={() => editor.chain().focus().splitCell().run()}
												disabled={!isEditable || !inTable}
											>
												Split cell
											</Button>
											<Button
												type="button"
												size="xs"
												variant="outline"
												onClick={() => editor.chain().focus().deleteTable().run()}
												disabled={!isEditable || !inTable}
											>
												Delete table
											</Button>
										</div>
									</PopoverContent>
								</Popover>
							)}
						</ToolbarGroup>
					</div>
				)}

				{editor && allowBubbleMenu && (
					<BubbleMenu
						editor={editor}
						className="flex items-center gap-1 rounded-md border bg-background p-1 shadow"
					>
						{resolvedFeatures.bold && (
							<ToolbarButton
								active={editor.isActive("bold")}
								disabled={!isEditable}
								title="Bold"
								onClick={() => editor.chain().focus().toggleBold().run()}
							>
								Bold
							</ToolbarButton>
						)}
						{resolvedFeatures.italic && (
							<ToolbarButton
								active={editor.isActive("italic")}
								disabled={!isEditable}
								title="Italic"
								onClick={() => editor.chain().focus().toggleItalic().run()}
							>
								Italic
							</ToolbarButton>
						)}
						{resolvedFeatures.underline && (
							<ToolbarButton
								active={editor.isActive("underline")}
								disabled={!isEditable}
								title="Underline"
								onClick={() => editor.chain().focus().toggleUnderline().run()}
							>
								Underline
							</ToolbarButton>
						)}
					</BubbleMenu>
				)}

				<EditorContent editor={editor} id={name} />

				{allowCharacterCount && showCharacterCount && (
					<div className="flex items-center justify-between border-t bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
						<span>
							{characterCount.words} word{characterCount.words === 1 ? "" : "s"}
						</span>
						<span>
							{characterCount.characters}
							{typeof maxCharacters === "number"
								? ` / ${maxCharacters}`
								: ""}
							 characters
						</span>
					</div>
				)}
			</div>

			{description && (
				<p className="text-muted-foreground text-xs">{description}</p>
			)}
			{error && <p className="text-destructive text-xs">{error}</p>}
		</div>
	);
}
