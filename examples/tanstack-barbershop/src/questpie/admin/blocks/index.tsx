/**
 * Blocks Index
 *
 * Exports all block renderers for the barbershop.
 */

import { BookingCtaRenderer } from "./booking-cta";
import { ContactInfoRenderer } from "./contact-info";
import { CTARenderer } from "./cta";
import { GalleryRenderer } from "./gallery";
import { HeadingRenderer } from "./heading";
import { HeroRenderer } from "./hero";
import { HoursRenderer } from "./hours";
import { ImageTextRenderer } from "./image-text";
import { ColumnsRenderer, DividerRenderer, SpacerRenderer } from "./layout";
import { ReviewsRenderer } from "./reviews";
import { ServicesRenderer } from "./services";
import { StatsRenderer } from "./stats";
import { TeamRenderer } from "./team";
import { TextRenderer } from "./text";

export const renderers = {
	// Sections
	hero: HeroRenderer,
	services: ServicesRenderer,
	team: TeamRenderer,
	reviews: ReviewsRenderer,
	cta: CTARenderer,
	"booking-cta": BookingCtaRenderer,
	// Content
	text: TextRenderer,
	heading: HeadingRenderer,
	"image-text": ImageTextRenderer,
	gallery: GalleryRenderer,
	stats: StatsRenderer,
	hours: HoursRenderer,
	"contact-info": ContactInfoRenderer,
	// Layout
	columns: ColumnsRenderer,
	spacer: SpacerRenderer,
	divider: DividerRenderer,
} as any;

export default renderers;
