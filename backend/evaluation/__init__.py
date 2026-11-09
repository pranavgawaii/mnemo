"""Separate measurements for context selection, lifecycle and conflict flags.

The labelled selection runner is read-only. Lifecycle and conflict runners write
expiring synthetic facts to fresh namespaces on a disposable API and archive
them after measurement. The load sample and local dump/restore drill measure bounded operational
behaviour. None of these runners measures generated-answer quality.
"""
