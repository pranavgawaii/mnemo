"""Read-only, labelled evaluation of the agent-context API.

Unlike the retrieval benchmark, this runner does not seed or clear a database.
Cases reference memory UUIDs from a prepared namespace. Reports contain IDs and
metrics, not source text, so an operator can compare runs without exporting the
stored facts. These checks measure context selection, not generated answers.
"""
