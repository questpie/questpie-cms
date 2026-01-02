import React from "react";
import { useForm, FormProvider } from "react-hook-form";
import type { QCMS } from "@questpie/cms/server";
import type { QCMSClient } from "@questpie/cms/client";
import {
	useCollection,
	useCollectionItemById,
} from "../../hooks/use-collection-db";
import { Button } from "../ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";

/**
 * Collection item type helper
 */
type CollectionItem<
	T extends QCMS<any, any, any>,
	K extends keyof QCMSClient<T>["collections"],
> = Awaited<
	ReturnType<QCMSClient<T>["collections"][K]["find"]>
> extends { docs: Array<infer TItem> }
	? TItem
	: never;

/**
 * CollectionForm props
 */
export type CollectionFormProps<
	T extends QCMS<any, any, any>,
	K extends keyof QCMSClient<T>["collections"],
> = {
	/**
	 * Collection name
	 */
	collection: K;

	/**
	 * Item ID (for edit mode)
	 */
	id?: string;

	/**
	 * Default values (for create mode)
	 */
	defaultValues?: Partial<CollectionItem<T, K>>;

	/**
	 * Custom field renderer
	 */
	children: React.ReactNode;

	/**
	 * On submit success callback
	 */
	onSuccess?: (item: CollectionItem<T, K>) => void;

	/**
	 * On cancel callback
	 */
	onCancel?: () => void;

	/**
	 * Form title
	 */
	title?: string;

	/**
	 * Header actions (e.g. locale switcher)
	 */
	headerActions?: React.ReactNode;

	/**
	 * Submit button text
	 */
	submitText?: string;

	/**
	 * Cancel button text
	 */
	cancelText?: string;
};

/**
 * CollectionForm - Form wrapper for CMS collections
 * Uses React Hook Form + TanStack DB Collection for optimistic updates
 *
 * @example
 * ```tsx
 * import { CollectionForm } from '@questpie/admin/components'
 * import type { cms } from './server/cms'
 *
 * function PostForm({ id }: { id?: string }) {
 *   return (
 *     <CollectionForm<typeof cms, 'posts'>
 *       collection="posts"
 *       id={id}
 *       title={id ? 'Edit Post' : 'Create Post'}
 *       onSuccess={() => router.push('/posts')}
 *     >
 *       <FormField name="title" label="Title" />
 *       <FormField name="content" label="Content" type="textarea" />
 *     </CollectionForm>
 *   )
 * }
 * ```
 */
export function CollectionForm<
	T extends QCMS<any, any, any>,
	K extends keyof QCMSClient<T>["collections"],
>({
	collection,
	id,
	defaultValues,
	children,
	onSuccess,
	onCancel,
	title,
	headerActions,
	submitText = "Save",
	cancelText = "Cancel",
}: CollectionFormProps<T, K>): React.ReactElement {
	const collectionData = useCollection<T, K>(collection);
	const item = id ? useCollectionItemById(collectionData, id) : null;

	const form = useForm({
		defaultValues: (item ?? defaultValues ?? {}) as any,
	});

	React.useEffect(() => {
		form.reset((item ?? defaultValues ?? {}) as any);
	}, [form, item, defaultValues]);

	const onSubmit = async (data: any) => {
		try {
			let result: any;

			if (id) {
				// Update existing item
				await collectionData.update(id, data);
				result = { ...item, ...data };
			} else {
				// Create new item
				result = await collectionData.insert(data);
			}

			onSuccess?.(result);
		} catch (error) {
			console.error("Form submission error:", error);
			// TODO: Show error toast
		}
	};

	return (
		<FormProvider {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)}>
				<Card>
					{(title || headerActions) && (
						<CardHeader className="flex flex-wrap items-center justify-between gap-3">
							{title && <CardTitle>{title}</CardTitle>}
							{headerActions && <div>{headerActions}</div>}
						</CardHeader>
					)}
					<CardContent className="space-y-4">{children}</CardContent>
					<CardFooter className="flex justify-end gap-2">
						{onCancel && (
							<Button type="button" variant="outline" onClick={onCancel}>
								{cancelText}
							</Button>
						)}
						<Button type="submit" disabled={form.formState.isSubmitting}>
							{form.formState.isSubmitting ? "Saving..." : submitText}
						</Button>
					</CardFooter>
				</Card>
			</form>
		</FormProvider>
	);
}
