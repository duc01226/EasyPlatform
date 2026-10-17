# Skill Dependency Setup

Read this guide when a selected skill helper needs a runtime, package or external tool.
Read the selected `SKILL.md` and its setup reference first; its manifest owns exact requirements.
Install only what the requested operation needs and verify the actual helper afterward.

## Contents

- [Select the dependency owner](#select-the-dependency-owner)
- [Check the runtime](#check-the-runtime)
- [Install selected packages](#install-selected-packages)
- [Optional broad installers](#optional-broad-installers)
- [Configure credentials](#configure-credentials)
- [Verify and recover](#verify-and-recover)

## Select the dependency owner

Do not infer setup from a skill's subject or an upstream example. Read the installed entrypoint:

| Operation | Read when preparing it |
| --- | --- |
| Catalog scanning/generation | [Script setup](../scripts/README.md#installation), with the declared Python requirements and bounded PyYAML recovery |
| Skill structure/navigation validation | [skill-creator helper paths](skill-creator/SKILL.md#helper-invocation-paths); Node/Python standard libraries only |
| HTML export | [html-export](html-export/SKILL.md); its [package manifest](html-export/package.json) and selected export reference own browser/PDF/video dependencies |
| PDF or DOCX conversion | [pdf-convert](pdf-convert/SKILL.md) or [docx-convert](docx-convert/SKILL.md); read only the selected direction's setup |
| Optional task workspace | [task-track engine protocol](task-track/references/engine-protocol.md); its runtime/package setup differs from project-guide mode |
| Code graph | [Graph setup](../docs/code-graph-setup.md); graph packages and install-on-use behavior have their own owner |

## Check the runtime

Run probes from the project root. Use the selected helper's version requirement rather than a
single version for every skill. Node-based validation and sync run through plain `node` commands.
Some optional helpers require a newer Node version; inspect their manifest.

```sh
node --version
# macOS / Linux
python3 --version
```

```powershell
# Windows
py -3 --version
```

A missing runtime is a setup problem. Use the host's supported provisioning path, then re-probe the
same executable the helper will use. Do not report a missing required check as passing.

## Install selected packages

Follow the selected owner's command and manifest. Read [the script dependency guide](../scripts/README.md#installation)
when using its declared requirements or bounded recovery. For other Python helpers, use an isolated
virtual environment when the owner requires packages and the system interpreter is managed.
Use `python3 -m venv <environment-path>` on macOS/Linux or `py -3 -m venv <environment-path>` on Windows,
then invoke that environment's interpreter for its declared requirements. Do not override system
Python protections or install a guessed package set.

For Node helpers, install at the package directory the skill names and preserve its lockfile and
startup policy. Do not substitute a root `npm run` command for a self-running framework entrypoint.
Read the export owner's setup before adding browser binaries, FFmpeg or other system tools.

## Optional broad installers

Read [install.sh](install.sh) on macOS/Linux or [install.ps1](install.ps1) on Windows before requesting
broad machine setup. These are interactive convenience installers that can install package managers,
system tools and global packages; they are broader than most individual skill operations.
Their current prompts/options are authoritative. Prefer the selected helper's setup for ordinary work;
inspect the script's result summary and any partial failures when a broad install is requested.

## Configure credentials

Read the selected helper's environment loader and setup instructions for its credential names and
precedence. Do not assume every helper uses one `.env` search order or needs an API key.
Use environment variables or the configured secret store, keep real values out of source/logs, and
preserve the requested operation's authorization boundaries.

## Verify and recover

Probe the actual consumer after setup, then run the selected operation's check and inspect its
output artifact or state. Installing a package alone does not prove that the helper can import or
execute it. On failure, retain the command, exit code and redacted diagnostic under project `tmp/`;
distinguish missing setup from a source defect before editing. Use the owning skill's bounded
recovery path; stop with the missing capability when a required check remains unavailable.
