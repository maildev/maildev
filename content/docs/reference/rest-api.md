---
title: REST API
description: >-
    The JSON API under /api for listing, reading, searching, downloading, relaying, and deleting mail — plus the Socket.IO events the web inbox uses for live updates.
ogTitle: MailDev REST API reference
permalink: /docs/reference/rest-api/
sourceUrl: >-
    https://github.com/maildev/maildev/blob/main/docs/rest.md
---

<!-- Vendored from maildev/maildev docs/rest.md (sha256:57e5f5964ab0).
     Do not edit here: run `make sync-docs` after changing it upstream. -->

MailDev provides an easily consumable REST API. All routes are served under the
`/api` prefix at `http://localhost:1080` unless configured otherwise. If a
`--base-pathname` (or `basePathname`) is set, it is prepended to the prefix
(e.g. `/maildev/api`). All data is returned as JSON unless specified.

## Example email response

Get all emails:

```shell
$ curl 'http://localhost:1080/api/email'
```

Returns:

```json
[
    {
        "id": "XwgKAxto",
        "time": "2026-01-05T19:02:09.156Z",
        "read": false,
        "subject": "The ex-presidents are surfers",
        "from": [
            {
                "address": "angelo.pappas@fbi.gov",
                "name": "Angelo Pappas"
            }
        ],
        "to": [
            {
                "address": "johnny.utah@fbi.gov",
                "name": "Johnny Utah"
            }
        ],
        "cc": [],
        "date": "2026-01-05T19:02:09.000Z",
        "text": "The wax at the bank was surfer wax!!!",
        "html": "<!DOCTYPE html><html><head></head><body><p>The wax at the bank was surfer wax!!!</p></body></html>",
        "headers": {
            "content-type": "multipart/mixed; boundary=\"--_boundary\"",
            "from": "Angelo Pappas <angelo.pappas@fbi.gov>",
            "to": "Johnny Utah <johnny.utah@fbi.gov>",
            "subject": "The ex-presidents are surfers",
            "message-id": "<1412535729142-cc4cb0f1@fbi.gov>",
            "date": "Sun, 05 Jan 2026 19:02:09 +0000",
            "mime-version": "1.0"
        },
        "priority": "normal",
        "attachments": [
            {
                "filename": "attachment-1.txt",
                "generatedFileName": "attachment-1.txt",
                "contentType": "text/plain",
                "contentDisposition": "attachment",
                "contentId": "0958713110a99ea2afc3b117c9d5feb3@maildev",
                "size": 24
            }
        ],
        "envelope": {
            "from": { "address": "angelo.pappas@fbi.gov" },
            "to": [{ "address": "johnny.utah@fbi.gov" }],
            "host": "djf-3.local",
            "remoteAddress": "127.0.0.1"
        },
        "size": 1024,
        "sizeHuman": "1 KB"
    }
]
```

## Endpoints

All paths are relative to the `/api` prefix.

**GET /api/email/summary** - Get a page of email summaries, newest first
(see [Listing a large inbox](#listing-a-large-inbox))

**GET /api/email** - Get all emails (supports filtering and pagination)

**GET /api/email/:id** - Get a given email by id (marks it as read)

**DELETE /api/email/:id** - Delete a given email by id

**POST /api/email/delete** - Delete multiple emails by id

**DELETE /api/email/all** - Delete all emails

**PATCH /api/email/read-all** - Mark all emails as read (returns the count)

**GET /api/email/:id/html** - Get a given email's HTML body with embedded
attachments

**GET /api/email/:id/source** - Get the raw email source (RFC 822)

**GET /api/email/:id/download** - Download a given email as an `.eml` file

**GET /api/email/:id/attachment/:filename** - Get a given email's file
attachment

**POST /api/email/:id/relay/:relayTo?** - If configured, relay a given email to
its real "to" address, or to the optional `relayTo` recipient override

**GET /api/reloadMailsFromDirectory** - Reload emails from the configured mail
directory

**GET /api/config** - Get the application configuration

**GET /api/healthz** - Health check

## Bulk Delete

The **POST /api/email/delete** endpoint deletes a specific set of emails in one
request. The request body must include an `ids` array.

```json
{
    "ids": ["XwgKAxto", "29wQJq2q"]
}
```

It returns the IDs that were deleted and any IDs that were not found:

```json
{
    "deleted": ["XwgKAxto"],
    "notFound": ["29wQJq2q"]
}
```

## Real-time updates

In addition to the REST API, the web server exposes a [Socket.IO](https://socket.io/)
endpoint at `/socket.io` for real-time notifications. It emits a `newMail` event
when an email arrives and a `deleteMail` event when one is removed.

The `newMail` payload is a summary (the same shape as
**GET /api/email/summary** returns), not the full email — fetch
**GET /api/email/:id** if you need the body.

## Listing a large inbox

**GET /api/email** returns every email in full, bodies included. That is
convenient for a handful of messages and expensive for thousands: a 10,000
email inbox serializes to well over 100 MB.

**GET /api/email/summary** returns a bounded page of summaries instead — no
`html`, `text` or `headers` — along with the counts needed to paginate. This is
what the web interface uses.

```plaintext
GET /api/email/summary?skip=0&limit=50&search=welcome&sort=desc&unread=true
```

| Parameter | Default | Description                                           |
| --------- | ------- | ----------------------------------------------------- |
| `skip`    | `0`     | Matching emails to skip                               |
| `limit`   | `50`    | Page size, clamped to 200                             |
| `search`  | —       | Case-insensitive match on subject, participants, body |
| `sort`    | `desc`  | `desc` for newest first, `asc` for oldest first       |
| `unread`  | —       | `true` to return only unread emails                   |

```json
{
    "items": [
        {
            "id": "abc123",
            "time": "2026-07-27T09:12:44.000Z",
            "read": false,
            "subject": "The ex-presidents are surfers",
            "size": 3072,
            "sizeHuman": "3 KB",
            "from": [
                { "address": "angelo.pappas@fbi.gov", "name": "Angelo Pappas" }
            ],
            "to": [{ "address": "johnny.utah@fbi.gov", "name": "Johnny Utah" }],
            "attachmentCount": 1,
            "preview": "The wax at the bank was surfer wax!!!"
        }
    ],
    "total": 1024,
    "storeTotal": 1024,
    "unread": 17,
    "skip": 0,
    "limit": 50
}
```

`total` counts the emails matching `search`; `storeTotal` and `unread` describe
the whole store and ignore the search.

## Pagination

The **GET /api/email** endpoint allows for simple skip/limit pagination.

```plaintext
GET /api/email?skip=10&limit=25
```

Without `limit` it returns every email from `skip` onwards. Emails come back in
arrival order unless `sort` is given, in which case they are ordered by received
time — `sort=desc` for newest first, `sort=asc` for oldest first. Combine it with
`limit` to fetch the most recent emails:

```plaintext
GET /api/email?limit=25&sort=desc
```

## Filtering

The **GET /api/email** endpoint allows simple filtering. Any query parameter
that isn't a reserved keyword (`skip`, `limit`) is treated as an exact-match filter
against a field of the returned email. Nested fields can be addressed with dot
syntax (`from.address=value`).

For example:

`GET /api/email?subject=Big wave coming # only emails with the exact subject`

`GET /api/email?from.address=angelo.pappas@fbi.gov # only emails from this sender`

`GET /api/email?read=false&subject=test # only unread emails with the exact subject`
