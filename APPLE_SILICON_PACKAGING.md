# Apple Silicon Packaging Guide

This document explains how to produce an Apple Silicon (arm64) build of the Automotive Appraisal desktop application when your primary development machine is an Intel Mac. It complements the project README by focusing on the cross-architecture steps that involve the GraphicsMagick bundle and GitHub Actions workflow.

## Key Components

- **GraphicsMagick bundle**: Created by `scripts/bundle-graphicsmagick.sh`. The bundle always matches the architecture of the machine where it is generated.
- **Electron Forge make step**: Runs `npm run make -- --platform=darwin --arch=arm64` to create the distributable DMG and `.app` bundle.
- **GitHub Actions workflow**: `.github/workflows/macos-arm64-build.yml` provides an on-demand Apple Silicon build environment.

## When You Are on an Apple Silicon Mac

1. Install dependencies and ensure Homebrew supplies Apple Silicon (`arm64`) bottles: `arch -arm64 brew install graphicsmagick ghostscript` (if not already installed).
2. Run `npm ci` and then `npm run bundle:gm` to generate an arm64 GraphicsMagick bundle.
3. Package the application with `npm run make -- --platform=darwin --arch=arm64`.
4. (Optional) Execute `npm run verify:gm` to confirm the bundle contains only `@loader_path` references.

## When You Are on an Intel Mac

Use the GitHub Actions workflow to build on Apple Silicon hardware:

1. Commit and push your changes to the repository.
2. Navigate to the **macOS Apple Silicon Build** workflow on GitHub and select **Run workflow**.
3. Leave the *Run unit tests before packaging* input set to `true`, or set it to `false` if you only need a quick build.
4. Wait for the workflow to finish. It will:
   - Install dependencies under `automotive-appraisal/`
   - Run `npm run bundle:gm` to create the arm64 GraphicsMagick bundle
   - Execute `npm run make -- --platform=darwin --arch=arm64`
   - Publish both `out/make/` artifacts and the packaged `.app`
5. Download the artifacts from the workflow run summary. The DMG image is ready to distribute to Apple Silicon users.

## Verification Steps

Regardless of where you build:

- Run `npm run verify:gm` to ensure the `graphicsmagick-bundle/` directory contains only `@loader_path` references and the expected architecture.
- Run `npm run verify:package` to confirm the packaged Electron app has the correct module structure.
- Optionally launch the packaged `.app` on an Apple Silicon machine to perform an end-to-end smoke test to ensure OCR and PDF rendering work correctly.

## Troubleshooting

| Issue | Recommended Fix |
|-------|-----------------|
| **Workflow cannot find GraphicsMagick or Ghostscript** | Ensure Homebrew is preinstalled on the runner (macOS-14 images include it). If running locally, install with `brew install graphicsmagick ghostscript`. |
| **Validation script reports absolute paths** | Remove the `graphicsmagick-bundle/` directory and rerun `npm run bundle:gm` to regenerate the bundle. |
| **Artifacts missing after workflow run** | Confirm the workflow succeeded and that the `Upload packaged artifacts` step completed without warnings. |
| **Local Intel build still produces x86_64 binaries** | This is expected. Use the GitHub workflow or an Apple Silicon machine to generate arm64 binaries. |

## Next Steps

- Automate publishing by chaining the GitHub workflow with a release pipeline if regular arm64 builds are required.
- Consider building universal binaries by running `npm run make` on both Intel and Apple Silicon hardware and merging the results with `lipo` if you need a single `.app` bundle supporting both architectures.
