# MJR-M1
# mjr-m2

## Running locally

    node server.js            # http://localhost:3000

## Enquiries

All forms POST to `/api/enquiry` (server.js). Each lead is saved to
`data/enquiries.jsonl` (git-ignored, never served) and, if
`ENQUIRY_WEBHOOK_URL` is set, forwarded there (Google Apps Script, Zapier or
the CRM's lead webhook). Set it before launch so leads reach the sales team:

    ENQUIRY_WEBHOOK_URL=https://... node server.js

If the site is hosted elsewhere, set `window.MJR_ENQUIRY_ENDPOINT` before
js/main.js loads.

## Content the sales team owns

- `js/plots-data.js`: sold plots (`SOLD`) and the availability date (`UPDATED`).
- `js/site-data.js`: map pin, road distances, development status, dated site
  photos and completed projects. Empty lists hide their block.
- `index.html`: amenity status labels (`data-status` + label text).
