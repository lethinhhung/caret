@AGENTS.md

# Conventions

## Keep files under 120 lines

No source file goes over **120 lines**. A file that outgrows it is reporting
that it holds more than one job — split it rather than raise the ceiling.

Exempt: `src/components/ui/**`. shadcn's CLI generates and overwrites those, so
their length is not ours to decide.

Splitting is not just moving lines to a new file. Each piece has to stand on its
own: one responsibility, a name that says what it does, and no reaching back
into its former neighbours for state.
