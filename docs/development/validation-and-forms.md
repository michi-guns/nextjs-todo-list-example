# Validation and Forms

## Zod

Define input schemas close to the owning module’s presentation boundary. Parse again on the server even when the client has already validated the form.

## Forms

Use native Server Action form flows for simple mutations. Add client form state or a form library only when the interaction genuinely requires it.

Validation errors should be translated into stable user-facing or JSON boundary errors without exposing database or provider details.
