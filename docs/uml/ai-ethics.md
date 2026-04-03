# AI Ethics & Responsible Use — MzansiBuilds

## Overview

MzansiBuilds integrates an AI language model to enhance the developer experience through smart project tag suggestions. This document describes how AI is used, what safeguards are in place, and our commitment to responsible and transparent AI use.

---

## What AI is used for

| Feature | Description |
|---|---|
| Smart tag suggestions | When a developer creates or edits a project, the AI analyses the title and description to suggest relevant tech stack tags (e.g. "React", "REST API", "Machine Learning"). |

AI is **not** used for authentication decisions, content moderation, access control, or any decision that affects a user's standing on the platform.

---

## Data privacy

- **What is sent to the AI provider:** Only the project title and description text that the developer has explicitly typed into the creation form.
- **What is never sent:** Email addresses, passwords, authentication tokens, personal identifiers, private messages, or collaboration request content.
- **Retention:** We do not log prompts or AI responses beyond the duration of the API call. Refer to the AI provider's own data retention policy for their commitments.

---

## Transparency in the UI

Every AI-generated suggestion in the platform is visibly labelled with a "Suggested by AI" indicator. Users can accept, edit, or completely ignore any suggestion with no consequence to their account or project.

---

## Human oversight

AI suggestions are advisory only. No suggestion is automatically applied without explicit user confirmation. Developers remain fully in control of all project data and metadata at all times.

---

## Bias and fairness

We acknowledge that language models can reflect biases present in their training data. To mitigate risk:

- Tag suggestions are limited to a predefined allowlist of known technologies and categories, so the model cannot surface unexpected or discriminatory output.
- The allowlist is reviewed and updated as the platform grows.
- Users can report a suggestion they find inappropriate via the feedback button next to any AI suggestion.

---

## Developer use of AI tools

During the development of MzansiBuilds, AI coding assistants were used to accelerate boilerplate generation, documentation drafting, and test scaffolding. All AI-generated code was reviewed, tested, and understood by the developer before being committed. AI-generated code is not committed blindly — the developer takes full responsibility for every line in this repository.

---



*Last updated: April 2026*