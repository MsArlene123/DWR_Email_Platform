# DWRemail.online — MCP API Route Specification
## Routes the MCP server will call

All routes live under `/api/mcp/` and require the header `X-MCP-Key` with a shared secret.
All responses are JSON. All errors return `{"error": "description"}` with an appropriate HTTP status code.

---

## Authentication

Every request must include:
```
X-MCP-Key: <shared-secret>
Content-Type: application/json
```

If the key is missing or wrong, return `401 {"error": "Unauthorized"}`.

---

## Route 1: GET /api/mcp/lists

**Purpose:** Return all email lists with contact counts.

**Response:**
```json
{
  "lists": [
    {
      "id": "list_abc123",
      "name": "Press Media Aug 2026",
      "description": "Verified press/media contacts for Launch Month",
      "contact_count": 818,
      "created_at": "2026-08-10T14:00:00Z"
    }
  ],
  "total": 1
}
```

---

## Route 2: POST /api/mcp/lists

**Purpose:** Create a new email list.

**Request body:**
```json
{
  "name": "Press Media Aug 2026",
  "description": "Optional description"
}
```

**Response (201):**
```json
{
  "id": "list_abc123",
  "name": "Press Media Aug 2026",
  "description": "Optional description",
  "contact_count": 0,
  "created_at": "2026-08-10T14:00:00Z"
}
```

---

## Route 3: POST /api/mcp/lists/:id/contacts

**Purpose:** Add contacts to an existing list. Skip duplicates.

**Request body:**
```json
{
  "contacts": [
    {
      "email": "editor@newspaper.com",
      "first_name": "Jane",
      "last_name": "Smith",
      "organization": "Daily Tribune"
    },
    {
      "email": "producer@radiostation.com",
      "first_name": "Marcus"
    }
  ]
}
```

**Response (200):**
```json
{
  "added": 2,
  "skipped": 0,
  "errors": [],
  "list_id": "list_abc123",
  "new_total": 820
}
```

If a contact already exists on the list, increment `skipped` and do not add a duplicate.
If an email is malformed, add it to `errors` with a reason and continue processing the rest.

---

## Route 4: GET /api/mcp/campaigns

**Purpose:** Return all campaigns with status and schedule info.

**Query parameters (all optional):**
- `status` — filter by: draft, active, paused, completed

**Response:**
```json
{
  "campaigns": [
    {
      "id": "camp_xyz789",
      "name": "Campaign 1: Press Introduction Email 1",
      "status": "draft",
      "subject": "13,018 women asked for help in a single day.",
      "sender_name": "Jacqueline Stevens",
      "sender_email": "admin@docwritereview.online",
      "list_id": "list_abc123",
      "list_name": "Press Media Aug 2026",
      "scheduled_at": null,
      "sent_count": 0,
      "created_at": "2026-08-11T10:00:00Z"
    }
  ],
  "total": 1
}
```

---

## Route 5: POST /api/mcp/campaigns

**Purpose:** Create a new email campaign.

**Request body:**
```json
{
  "name": "Campaign 1: Press Introduction Email 1",
  "subject": "13,018 women asked for help in a single day.",
  "body": "<html>Full HTML email body with {{contact.FIRSTNAME}} tags</html>",
  "sender_name": "Jacqueline Stevens",
  "sender_email": "admin@docwritereview.online",
  "list_id": "list_abc123",
  "schedule": "2026-08-12T10:00:00Z"
}
```

If `schedule` is omitted, save as draft. If provided, schedule the send.

**Response (201):**
```json
{
  "id": "camp_xyz789",
  "name": "Campaign 1: Press Introduction Email 1",
  "status": "draft",
  "subject": "13,018 women asked for help in a single day.",
  "sender_name": "Jacqueline Stevens",
  "sender_email": "admin@docwritereview.online",
  "list_id": "list_abc123",
  "scheduled_at": "2026-08-12T10:00:00Z",
  "created_at": "2026-08-11T10:00:00Z"
}
```

---

## Route 6: PATCH /api/mcp/campaigns/:id

**Purpose:** Update a campaign (pause, resume, reschedule).

**Request body:**
```json
{
  "action": "pause"
}
```

Valid actions: `pause`, `resume`, `reschedule`

For reschedule, include `schedule`:
```json
{
  "action": "reschedule",
  "schedule": "2026-08-15T10:00:00Z"
}
```

**Response (200):**
```json
{
  "id": "camp_xyz789",
  "status": "paused",
  "message": "Campaign paused successfully"
}
```

---

## Route 7: GET /api/mcp/campaigns/:id/stats

**Purpose:** Return delivery stats for one campaign.

**Response:**
```json
{
  "campaign_id": "camp_xyz789",
  "campaign_name": "Campaign 1: Press Introduction Email 1",
  "stats": {
    "total_sent": 200,
    "delivered": 194,
    "opened": 42,
    "clicked": 8,
    "bounced": 6,
    "unsubscribed": 1,
    "open_rate": 21.6,
    "click_rate": 4.1,
    "bounce_rate": 3.1,
    "unsubscribe_rate": 0.5
  },
  "status": "active",
  "last_sent_at": "2026-08-12T10:07:00Z"
}
```

---

## Route 8: GET /api/mcp/stats/overview

**Purpose:** Aggregate stats across all campaigns. Daily health check.

**Response:**
```json
{
  "total_campaigns": 6,
  "active_campaigns": 3,
  "total_sent": 1200,
  "total_delivered": 1164,
  "total_opened": 252,
  "total_bounced": 36,
  "overall_open_rate": 21.6,
  "overall_bounce_rate": 3.0,
  "sender_health": "warning",
  "last_updated": "2026-08-11T15:00:00Z"
}
```

`sender_health` values: "good" (bounce <3%), "warning" (3-5%), "critical" (>5%)

---

## Route 9: GET /api/mcp/stats/bounces

**Purpose:** Return recent bounce records for investigation.

**Query parameters:**
- `limit` — number of records (default 50, max 200)

**Response:**
```json
{
  "bounces": [
    {
      "email": "old@defunct.org",
      "campaign_id": "camp_xyz789",
      "campaign_name": "Campaign 1: Press Introduction Email 1",
      "bounce_type": "hard",
      "reason": "Mailbox not found",
      "bounced_at": "2026-08-12T10:05:00Z"
    }
  ],
  "total": 1
}
```

---

## Route 10: GET /api/mcp/contacts/search

**Purpose:** Find a contact across all lists.

**Query parameters:**
- `email` — the email address to search for

**Response:**
```json
{
  "email": "editor@newspaper.com",
  "found": true,
  "lists": [
    {
      "list_id": "list_abc123",
      "list_name": "Press Media Aug 2026",
      "added_at": "2026-08-10T14:00:00Z"
    }
  ],
  "send_history": {
    "total_sent": 3,
    "last_opened": "2026-08-12T11:00:00Z",
    "status": "active"
  }
}
```

If not found: `{"email": "...", "found": false, "lists": [], "send_history": null}`

---

## Implementation Notes

1. **Warm-up awareness:** The stats routes are critical during the first two weeks when you're throttling sends. The MCP will use bounce rate data to decide whether to recommend pausing.

2. **Stats source:** DWRemail.online sends through Hostinger SMTP (smtp.hostinger.com, port 587). The stats routes pull from DWRemail.online's own tracking database (delivery confirmations, open pixels, click tracking, bounce responses from the SMTP server). The MCP doesn't need to know how tracking works internally, it just needs the JSON response.

3. **Idempotent contact adds:** The contacts route should check for existing emails on the list before adding. This lets the MCP safely call it multiple times without creating duplicates (important because Claude might retry a failed tool call).

4. **Rate limiting:** Consider adding a basic rate limit (e.g., 60 requests per minute) to protect the server from accidental floods. Return `429 {"error": "Rate limited"}` if exceeded.
