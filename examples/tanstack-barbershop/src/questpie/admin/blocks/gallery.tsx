/**
 * Gallery Block
 *
 * Image gallery with grid layout.
 * Design: Responsive masonry-style grid with lightbox support.
 */

import type { BlockRendererProps } from "@questpie/admin/client";
import { cn } from "../../../lib/utils";

type GalleryImage = {
  id: string;
  caption?: string;
};

type GalleryValues = {
  title?: string;
  images: GalleryImage[];
  columns: "2" | "3" | "4";
  gap: "small" | "medium" | "large";
};

type GalleryPrefetchedData = {
  imageUrls: Record<string, string>;
};

export function GalleryRenderer({ values, data }: BlockRendererProps<GalleryValues>) {
  const galleryData = (data as GalleryPrefetchedData) || {};
  const imageUrls = galleryData?.imageUrls || {};

  const columnsClass = {
    "2": "md:grid-cols-2",
    "3": "md:grid-cols-2 lg:grid-cols-3",
    "4": "md:grid-cols-2 lg:grid-cols-4" }[values.columns || "3"];

  const gapClass = {
    small: "gap-2",
    medium: "gap-4",
    large: "gap-8" }[values.gap || "medium"];

  return (
    <section className="py-20 px-6">
      <div className="container">
        {values.title && (
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-12 text-center">
            {values.title}
          </h2>
        )}

        <div className={cn("grid grid-cols-1", columnsClass, gapClass)}>
          {values.images?.map((image) => {
            const url = imageUrls[image.id];
            return (
              <figure
                key={image.id}
                className="group relative overflow-hidden rounded-lg bg-muted aspect-square cursor-pointer hover:shadow-lg transition-all"
              >
                {url ? (
                  <img
                    src={url}
                    alt={image.caption || ""}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No image
                  </div>
                )}
                {image.caption && (
                  <figcaption className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-3 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    {image.caption}
                  </figcaption>
                )}
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}


