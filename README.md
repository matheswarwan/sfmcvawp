# sfmcvawp

A small Node.js (Express) app for looking up emails that Salesforce Marketing Cloud (SFMC) sent to a subscriber, previewing them through their "view as web page" (VAWP) link, and saving them as PDF.

It is aimed at SFMC admins or support staff who need to answer "which emails did this person get, and what did they look like?" without logging in to Marketing Cloud. It is a prototype, not a finished product.

## Features

As implemented in `app.js` and `index.html`:

- Search by email address. The server reads the 20 most recent rows for that address from a send log data extension (ordered by sent date) through the SFMC REST API.
- Results table with email name, date sent, a "View Email" link and a "Download PDF" link.
- Preview: the server fetches the email's view-as-web-page HTML and the page renders it inline.
- Tracking domains are stripped: occurrences of `click.<domain>`, `open.<domain>` and `view.<domain>` for the configured SFMC domain are removed from the fetched HTML.
- PDF export: the server converts the fetched HTML to a PDF with `html-pdf`, writes it to `pdfs/<uuid>.pdf` and returns a link. A streaming variant (`POST /downloadStream`) returns the PDF directly.

## How it works

1. `GET /search/:email` requests an OAuth token from the SFMC auth endpoint (`v2/token`, client credentials grant), then calls `data/v1/customobjectdata/key/<DE key>/rowset` filtered on the email column.
2. For each row it returns `EmailName` (from `emailname`), `View_Email_URL` (from `view_email_url`) and `DateSent` (from `sentdate`). These column names are hardcoded.
3. `POST /preview` with `{ "view_email_url": "..." }` fetches that URL and returns the cleaned HTML.
4. `POST /download` with `{ "download_email_url": "..." }` fetches the HTML, renders a PDF into `pdfs/`, and returns `{ fileName, filePath, fileLocation }`.
5. The whole project directory is served statically (`express.static('.')`), which is how `index.html` and the generated PDFs are reachable.

The send log data extension is expected to have at least these columns: an email address column (name configurable), `emailname`, `view_email_url` and `sentdate`.

## Setup

Prerequisites:

- Node.js and npm.
- An SFMC installed package with a server-to-server API integration that can read the send log data extension.
- `html-pdf` depends on PhantomJS, which must be able to install and run on your platform.

Install and run:

```sh
npm install
npm start      # runs "npm install && node app.js"
```

The server listens on `PORT` (default 8080).

### Environment variables

Configuration is read from environment variables in `app.js`. Some have hardcoded fallbacks in the code; set all of them explicitly and do not rely on the fallbacks.

| Name | Purpose |
| --- | --- |
| `PORT` | HTTP port (default 8080) |
| `authURI` | SFMC tenant auth base URL (ending in `/`) |
| `restURI` | SFMC tenant REST base URL (ending in `/`) |
| `clientId` | Installed package client ID |
| `clientSecret` | Installed package client secret |
| `accountId` | MID of the business unit |
| `packageName` | Label only, not used in API calls |
| `name` | Send log data extension name (not used in API calls) |
| `key` | Send log data extension external key |
| `subscriberKey` | Subscriber key column name (not used in API calls) |
| `emailAddres` | Name of the email address column used in the filter (spelling as in code) |
| `sfmcDomain` | Your SFMC sender domain, used to strip `click.`, `open.` and `view.` tracking hosts |

## Usage

- Open `/search` in a browser. It serves `index.html`, a basic form.
- Enter an email address and click Search.
- Click "View Email" to preview, or "Download PDF" to generate a PDF and get a link to it.

The front end (`index.html`) calls a hardcoded base URL (`url = ...` near the top of its script). Change it to your own host (for example `http://localhost:8080`) before using it locally.

API summary:

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `/search` | none | The search page |
| GET | `/search/:email` | none | `{ status, count, emails: [{ EmailName, View_Email_URL, DateSent }] }` |
| POST | `/preview` | `{ view_email_url }` | Email HTML |
| POST | `/download` | `{ download_email_url }` | `{ fileName, filePath, fileLocation }` |
| POST | `/downloadStream` | `{ download_email_url }` | PDF stream |

## Project structure

```
app.js            Express server, SFMC auth, DE query, HTML fetch, PDF generation
index.html        Search UI (jQuery + axios from CDNs)
index.js          Leftover client-side URL constants (mostly commented out)
em.html           Test page embedding a sample PDF as base64
views/            Unused hbs and pug templates from experiments
pdfs/             Output folder for generated PDFs
*.pdf             Sample generated PDFs committed at the root and in pdfs/
LICENSE           GPL-3.0
```

## Status and known limitations

This is an experiment. Treat it as a starting point.

- No authentication. Anyone who can reach the server can look up the send history of any email address and fetch its emails.
- `express.static('.')` serves the whole project folder, including source files and anything else in it. Do not deploy it as is.
- `/preview` and `/download` fetch any URL passed in the request body. There is no check that it is an SFMC view-as-web-page URL.
- Generated PDFs are written to `pdfs/` and never cleaned up. Some generated PDFs are committed to the repo.
- `GET /` returns a variable that is only set by an `init()` function that is commented out, so it returns nothing useful.
- `GET /download`, `GET /download-old` and `GET /d` are leftover experiments. They reference files that are not in the repo (`bc.pdf`, `template.html`).
- `uuid` is used but not listed in `package.json` (it resolves only as a transitive dependency). `ejs`, `hbs`, `pug` and `html-pdf-node` are installed but not needed by the main flow.
- The DE column names are hardcoded (marked TODO in the code).
- `npm start` runs `npm install` every time.
- No tests.

## Ideas

- Move all config to environment variables with no fallbacks, and add a `.env.example`.
- Add authentication and restrict fetched URLs to the SFMC view domain.
- Serve only `index.html` and `pdfs/`, or stream PDFs and stop writing them to disk.
- Remove the unused routes, templates and dependencies.
