import { presentationTool } from "sanity/presentation"

import {
  editorialPresentationOptions,
  isEditorialPresentationEnabled,
} from "./presentation-options"

/** Presentation plugin list for the Studio: empty unless preview is enabled. */
export function editorialPresentationPlugins(
  flag: string | undefined,
  dataset: string
) {
  return isEditorialPresentationEnabled(flag, dataset)
    ? [presentationTool(editorialPresentationOptions)]
    : []
}
