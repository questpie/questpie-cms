import {
	Calendar,
	Layout,
	Megaphone,
	Settings,
	ShoppingCart,
	Users,
} from "lucide-react";

const useCases = [
	{
		title: "Marketing Sites",
		icon: Megaphone,
		items: ["Blogs, landing pages", "Block editor", "Live preview"],
	},
	{
		title: "E-commerce",
		icon: ShoppingCart,
		items: ["Product catalogs", "Order management", "Customer data"],
	},
	{
		title: "SaaS Admin",
		icon: Settings,
		items: ["User management", "Configuration", "Activity logs"],
	},
	{
		title: "Booking Systems",
		icon: Calendar,
		items: ["Appointments", "Staff management", "Reminders"],
	},
	{
		title: "Internal Tools",
		icon: Layout,
		items: ["Directories", "Documents", "Workflows"],
	},
	{
		title: "Content Platforms",
		icon: Users,
		items: ["Multi-author blogs", "Courses", "Media libraries"],
	},
];

export function UseCases() {
	return (
		<section className="py-24 border-t border-border/50 relative overflow-hidden">
			{/* Background glow */}
			<div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2" />

			<div className="w-full max-w-7xl mx-auto px-4 relative z-10">
				<div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
					<h2 className="font-mono text-sm tracking-[0.2em] uppercase text-primary">
						Use Cases
					</h2>
					<h3 className="text-3xl md:text-4xl font-bold">What You Can Build</h3>
					<p className="text-muted-foreground">
						Flexible enough for any content-driven application.
					</p>
				</div>

				<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
					{useCases.map((useCase) => (
						<div
							key={useCase.title}
							className="group p-6 border border-border hover:border-primary/50 transition-colors"
						>
							<div className="p-2 border border-border group-hover:border-primary/50 w-fit mb-4 transition-colors">
								<useCase.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
							</div>

							<h4 className="font-bold mb-3 group-hover:text-primary transition-colors">
								{useCase.title}
							</h4>

							<ul className="space-y-1.5 text-sm text-muted-foreground">
								{useCase.items.map((item) => (
									<li key={item} className="flex items-center gap-2">
										<div className="w-1 h-1 bg-primary shrink-0" />
										{item}
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
