# Operator shortcuts. PYTHONPATH=. lets the tests/CLI import the app package
# from a plain checkout without installing it.
PYTHONPATH := .

.PHONY: lint typecheck test

lint:
	ruff check .

typecheck:
	mypy app

test:
	PYTHONPATH=$(PYTHONPATH) pytest tests/ -v
