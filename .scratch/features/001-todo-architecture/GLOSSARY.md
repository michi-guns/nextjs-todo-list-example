# Glossary

Feature-specific terms only. Add entries when a term is introduced, renamed, disambiguated, or rejected.

## Language

**Module**: A business capability boundary under `src/modules/`; it owns domain behavior, application use cases, infrastructure adapters, and presentation adapters where applicable.

**Contract**: A normative type, schema, API, storage shape, or boundary rule that implementation must satisfy.

**Example**: An illustrative snippet or flow that explains a contract but does not replace the contract.

**Composition route**: A file under `app/` that assembles module APIs into a Next.js page or route without owning business rules.

**Repository port**: A module-owned TypeScript interface describing the persistence or provider capability an application use case needs, without exposing the adapter implementation.

**Adapter**: Infrastructure code that translates an external system such as Drizzle, Better Auth, or Sanity into a module contract.

**View model**: A presentation-facing shape derived from an application DTO for a page, action result, or JSON response.

**Infrastructure seat**: A root location reserved for a provider client, schema, or migration concern, not a separate business capability.
