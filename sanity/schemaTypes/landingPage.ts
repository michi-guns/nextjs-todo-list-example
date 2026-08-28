import { DocumentIcon } from "@sanity/icons/Document"
import { defineField, defineType } from "sanity"

export const landingPage = defineType({
  name: "landingPage",
  title: "Landing page",
  type: "document",
  icon: DocumentIcon,
  fields: [
    defineField({
      name: "headline",
      title: "Headline",
      type: "string",
      validation: (rule) => rule.required().min(1).max(160),
    }),
    defineField({
      name: "blurb",
      title: "Blurb",
      type: "text",
      rows: 5,
      validation: (rule) => rule.required().min(1).max(500),
    }),
    defineField({
      name: "primaryCtaLabel",
      title: "Primary CTA label",
      type: "string",
      validation: (rule) => rule.required().min(1).max(80),
    }),
    defineField({
      name: "secondaryCtaLabel",
      title: "Secondary CTA label",
      type: "string",
      validation: (rule) => rule.max(80),
    }),
  ],
  preview: {
    select: {
      title: "headline",
      subtitle: "primaryCtaLabel",
    },
  },
})
