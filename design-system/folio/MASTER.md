# Folio workspace

Folio is a study SaaS for turning existing course materials into answers and practice. The interface should make the next study action clear wherever the user enters.

- **Navigation:** Overview gives orientation. Library contains courses and documents. Study tools contains assistant, flashcards, tests, and focus timer. Settings sits with account identity. At narrow widths, use one labeled disclosure that exposes the same destinations.
- **Hierarchy:** Use a single clear page title, a short description, and one visually dominant action per surface. Overview leads with the assistant; labeled metrics are shortcuts to their respective collections. Empty collections direct users to where they can add content.
- **Color:** Use a quiet neutral canvas, white or dark surfaces, and teal for selected states and actions. The forest panel is reserved for the assistant entry point and account entry. Keep control boundaries, focus, and error states distinct. Both themes share the semantic tokens in `frontend/src/index.css`.
- **Type and geometry:** Use Geist for headings and body, with stronger weight and tighter tracking on display headings. Use tabular figures for counts and time. Keep consistent 8–12 px spacing within groups and larger gaps between sections. Use Lucide icons with text where possible.
- **States:** Use the same visible heading, navigation, grid, and control footprints for loading and loaded views. Skeleton controls are inert. Keep visible keyboard focus, predictable reading order, and motion optional.
