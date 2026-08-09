# Implementation Workflow

1. Read the documentation index and protocol.
2. Identify the owning module and current-state documents.
3. Check the product contract, assumptions, open questions, and related ADRs.
4. Implement one thin vertical slice through domain, application, infrastructure, and presentation as needed.
5. Add focused unit and boundary tests.
6. Update documentation when behavior or architecture changes.
7. Run the relevant quality gates and report skipped checks.

Start with the smallest complete user journey rather than scaffolding abstractions for hypothetical features.
