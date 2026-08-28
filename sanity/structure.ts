import { DocumentIcon } from "@sanity/icons/Document"
import type { StructureResolver } from "sanity/structure"

const LANDING_PAGE_ID = "landingPage"
const LANDING_PAGE_TYPE = "landingPage"

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      S.listItem()
        .title("Landing page")
        .icon(DocumentIcon)
        .child(
          S.document()
            .id(LANDING_PAGE_ID)
            .schemaType(LANDING_PAGE_TYPE)
            .documentId(LANDING_PAGE_ID)
            .title("Landing page")
        ),
      S.divider(),
      ...S.documentTypeListItems().filter(
        (listItem) => listItem.getId() !== LANDING_PAGE_TYPE
      ),
    ])
