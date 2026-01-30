export type Headline = {
	top: string;
	highlight: string;
};

export const headlines: Headline[] = [
	{
		top: "The CMS You'd Build",
		highlight: "If You Had Time",
	},
];

export function getRandomHeadlineIndex(): number {
	return 0;
}
