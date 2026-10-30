# Little Sparks

A daily puzzle app with Letterlight, Pocket Sudoku, Dot & Match, The Aha Moment, Bloom Trail, Time Lens, and Little Neighbours.

Three difficulty levels, hints, past-day puzzles, and browser-local saved progress.

## Run locally

Requires Python 3:

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000. No build or package installation is required.

## Validate puzzles

Requires Node.js:

```sh
node verify.cjs
node verify-levels.cjs
node verify-extras.cjs
```

## Original source history

The source files match Sites commit `bc750bf3ed629364f2c8761c1a031aba4b51758a`.
All four original commits, including their authors, timestamps and exact hashes, are preserved in `history/little-sparks-original.bundle`.

GitHub's connected API imported the current files as a new commit; the four original commits are inside the bundle, not ancestors of this repository's main branch. To restore them as a local branch:

```sh
git bundle verify history/little-sparks-original.bundle
git fetch history/little-sparks-original.bundle main:sites-history
git log sites-history
```

To make that original branch visible on GitHub, from an authenticated local clone:

```sh
git push origin sites-history
```

## Hosting and credits

The existing Sites hosting configuration is retained in `.openai/hosting.json`.
This GitHub copy is not automatically synchronized with future Sites changes.

Photo source links and credits are preserved in `dist/photos.js`. Third-party assets retain their applicable rights and attribution requirements.
