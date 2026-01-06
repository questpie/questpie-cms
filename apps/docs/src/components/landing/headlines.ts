export type Headline = {
	top: string;
	highlight: string;
};

export const headlines: Headline[] = [
	{
		top: "CMS Speedrun",
		highlight: "any%",
	},
	{
		top: "Drizzle + Auth + Queues.",
		highlight: "Ship it.",
	},
	{
		top: "It's Just Drizzle",
		highlight: "All the Way Down",
	},
	{
		top: "Your Favorite Libraries.",
		highlight: "One Backend.",
	},
	{
		top: "Stop Reinventing.",
		highlight: "Start Shipping.",
	},
	{
		top: "The TypeScript CMS",
		highlight: "Without the BS",
	},
	{
		top: "Postgres Goes",
		highlight: "Brrrr",
	},
	{
		top: "Finally, a CMS Built on",
		highlight: "Tools You Know",
	},
];

export function getRandomHeadlineIndex(): number {
	return Math.floor(Math.random() * headlines.length);
}
