/**
 * Contacts List Block Renderer
 */

import type { BlockProps } from "../.generated/client";

export function ContactsListRenderer({
	values,
	data,
}: BlockProps<"contactsList">) {
	const contacts = (data as any)?.contacts || [];

	return (
		<section className="py-16 px-6">
			<div className="container mx-auto">
				{values.title && (
					<h2 className="text-3xl font-bold tracking-tight mb-8">
						{values.title}
					</h2>
				)}

				{contacts.length === 0 && (
					<p className="text-muted-foreground text-center py-8">
						No contacts available.
					</p>
				)}

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{contacts.map((contact: any) => (
						<div
							key={contact.id}
							className="border rounded-lg p-6 hover:shadow-md transition-shadow"
						>
							<h3 className="font-semibold text-lg mb-2">
								{contact.department}
							</h3>
							{contact.description && (
								<p className="text-sm text-muted-foreground mb-4">
									{contact.description}
								</p>
							)}
							<div className="space-y-1 text-sm">
								{contact.contactPerson && (
									<p className="font-medium">{contact.contactPerson}</p>
								)}
								{contact.email && (
									<p>
										<a
											href={`mailto:${contact.email}`}
											className="text-primary hover:underline"
										>
											{contact.email}
										</a>
									</p>
								)}
								{contact.phone && (
									<p>
										<a
											href={`tel:${contact.phone}`}
											className="text-primary hover:underline"
										>
											{contact.phone}
										</a>
									</p>
								)}
								{contact.officeHours && (
									<p className="text-muted-foreground">{contact.officeHours}</p>
								)}
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
