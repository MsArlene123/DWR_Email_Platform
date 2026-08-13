# DWRemail MCP Tools — Integration Instructions
## How to Add DWRemail.online Tools to Your Existing MCP Server

This document walks you through every step of connecting DWRemail.online to your MCP server at mcp.docwritereview.work so that Claude can manage your email campaigns directly from chat.

There are two sides to this integration. The **DWRemail.online side** (the API routes your platform exposes) and the **MCP server side** (the tools Claude uses to call those routes). These instructions cover the MCP server side. The companion document "DWRemail_API_Routes_Spec.md" covers what the DWRemail.online routes need to accept and return.

---

## PREREQUISITES

Before starting, you need:

1. **The API routes built and working on DWRemail.online.** Each route listed in DWRemail_API_Routes_Spec.md must be live and responding. Test each one in your browser or with curl before proceeding. If the routes are not ready, the MCP tools will have nothing to call and every tool will return a connection error.

2. **An API key for DWRemail.online.** This is a shared secret that the MCP server sends with every request so DWRemail.online knows the request is authorized. Generate any random string (32+ characters recommended). You will put this same key in two places: in DWRemail.online's route authentication logic, and in the MCP server's .env file.

3. **WinSCP connected to your VPS** (159.198.76.107, root, port 22). You will be editing files on the VPS directly.

---

## STEP 1: Install the httpx Library

The existing MCP server uses Python's built-in libraries for everything (subprocess, csv, glob, etc.) because all the existing tools read local files or run shell commands. The DWRemail tools need to make HTTP requests to a remote server, so they need the `httpx` library. httpx is the modern async HTTP client for Python, which is important because FastMCP tool functions are async (they use `async def`).

**Using WinSCP's terminal (Ctrl+T), run:**

```
pip install httpx --break-system-packages
```

The `--break-system-packages` flag is required on this VPS because Python is system-managed. Without it, pip refuses to install.

**Then update requirements.txt so the dependency is documented.** Open `/root/.hermes/mcp/requirements.txt` in WinSCP's editor and add this line:

```
httpx>=0.27.0
```

---

## STEP 2: Update the .env File

Open `/root/.hermes/mcp/.env` in WinSCP's editor. Add two new lines:

```
DWREMAIL_BASE_URL=https://dwremail.online
DWREMAIL_API_KEY=your-secret-key-here
```

Replace `your-secret-key-here` with the actual API key you created for DWRemail.online's route authentication.

**Why both variables:** The base URL is separated from the key so that if you ever move DWRemail.online to a different domain or need to test against a local development version, you change one line in .env instead of editing every tool function in server.py.

---

## STEP 3: Edit server.py — Add the Import

Open `/root/.hermes/mcp/server.py` in WinSCP's editor.

Find the import section at the top of the file. It currently ends with:

```python
from pydantic import BaseModel, Field, ConfigDict
```

Add this line directly below it:

```python
import httpx
```

---

## STEP 4: Edit server.py — Add the Configuration Variables

Find the Configuration section. It currently has variables like `HERMES_ROOT`, `HERMES_DATA`, `AUTH_TOKEN`, `BRAND_DIRS`, and `SCRAPER_CATEGORIES`.

Add these two lines after the `AUTH_TOKEN` line:

```python
DWREMAIL_BASE_URL = os.getenv("DWREMAIL_BASE_URL", "https://dwremail.online")
DWREMAIL_API_KEY = os.getenv("DWREMAIL_API_KEY", "")
```

These read the values you just put in the .env file. The second argument in each is the fallback default if the .env value is missing.

---

## STEP 5: Edit server.py — Add the Helper Function

Find the Helpers section. It currently has `safe_read()`, `list_files()`, and `tail_file()`.

Add this new function after `tail_file()`:

```python
async def dwremail_request(method: str, endpoint: str, json_data: dict = None) -> dict:
    """Make an authenticated request to DWRemail.online API."""
    url = f"{DWREMAIL_BASE_URL}/api/mcp{endpoint}"
    headers = {"X-MCP-Key": DWREMAIL_API_KEY, "Content-Type": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if method == "GET":
                resp = await client.get(url, headers=headers, params=json_data)
            elif method == "POST":
                resp = await client.post(url, headers=headers, json=json_data)
            elif method == "PATCH":
                resp = await client.patch(url, headers=headers, json=json_data)
            else:
                return {"error": f"Unsupported method: {method}"}
            resp.raise_for_status()
            return resp.json()
    except httpx.TimeoutException:
        return {"error": f"DWRemail.online request timed out: {method} {endpoint}"}
    except httpx.HTTPStatusError as e:
        return {"error": f"DWRemail.online returned {e.response.status_code}: {e.response.text[:500]}"}
    except httpx.ConnectError:
        return {"error": "Cannot connect to DWRemail.online. Is the server running?"}
    except Exception as e:
        return {"error": f"DWRemail.online request failed: {str(e)}"}
```

**What this function does:** Every DWRemail tool calls this one helper instead of writing its own HTTP logic. It handles three things automatically:

- **Authentication:** It attaches your API key to every request via the `X-MCP-Key` header, so DWRemail.online knows the request is coming from the MCP server and not from a random outsider.

- **Timeouts:** It gives DWRemail.online 30 seconds to respond. If the server is slow or frozen, the tool returns a clean error message instead of hanging forever.

- **Error handling:** If DWRemail.online is down, returns an error code, or times out, the function catches it and returns a readable error message that Claude can understand and report to you. Without this, a failed HTTP call would crash the entire MCP server.

---

## STEP 6: Edit server.py — Add the Tool Definitions

Find the section in server.py that says:

```python
# =========================================================================
#  PROMPTS — Reusable prompt templates
# =========================================================================
```

Directly ABOVE that line, paste the entire tool definitions section from the `dwremail_mcp_tools.py` file. Start pasting from the first class definition (`class DwremailListAllInput`) and include everything through the last function (`async def dwremail_search_contact`).

Do NOT paste the instruction comments at the top of that file (the block starting with "STEP 1: Add these imports"). Those were the instructions you are following right now. Only paste the actual Python code: the class definitions and the tool functions.

**Why they go before the PROMPTS section:** The server.py file is organized in order: configuration, helpers, resources, tools, prompts, then the entry point. The DWRemail tools are tools, so they belong in the tools section, which is right before prompts.

---

## STEP 7: Save and Verify Syntax

After saving server.py, verify that the Python syntax is correct before restarting. In WinSCP's terminal (Ctrl+T), run:

```
python3 -c "import py_compile; py_compile.compile('/root/.hermes/mcp/server.py', doraise=True)"
```

If the syntax is clean, this command produces no output. If there is an error (a missing comma, an unclosed parenthesis, an indentation problem), it will tell you exactly which line number has the problem.

**Why this matters:** If you restart the MCP server with a syntax error in server.py, the server will crash and Claude will lose the connection to all tools, including the existing ones that are already working. Checking syntax first prevents that.

---

## STEP 8: Restart the MCP Server

The MCP server runs as a process on the VPS. To pick up the code changes, it needs to be restarted.

First, find out how the MCP process is currently managed. In WinSCP's terminal, try:

```
systemctl status hermes-gateway
```

If hermes-gateway is the service that runs the MCP server, restart it with:

```
systemctl restart hermes-gateway
```

If the MCP server runs as a separate process from Hermes (check by looking at whether hermes-gateway starts server.py or something else), you may need to find and restart it differently. Check what is listening on port 8900:

```
lsof -i :8900
```

That will show the process ID. Kill it and restart:

```
kill <process-id>
cd /root/.hermes/mcp && python3 server.py &
```

After restarting, verify the server is running:

```
curl -s http://127.0.0.1:8900/ | head -20
```

If you get a response (even an error page), the server is up.

---

## STEP 9: Reconnect in Claude.ai

Claude.ai caches the list of available tools when you first connect an MCP server. Adding new tools requires Claude.ai to refresh that list. To do this:

1. Go to Claude.ai
2. Open your settings or the connectors/integrations panel
3. Find the DWR Hub connector (mcp.docwritereview.work)
4. Disconnect it
5. Reconnect it

When you reconnect, Claude.ai will pull the updated tool list from the MCP server, which now includes the nine new DWRemail tools alongside the eight existing Hermes tools.

---

## STEP 10: Test the Connection

Start a new conversation in Claude.ai and ask:

> "List all email lists on DWRemail.online."

If the integration is working, Claude will call the `dwremail_list_all` tool, which will hit your `GET /api/mcp/lists` route on DWRemail.online, and return whatever lists you have.

If you get an error, the error message will tell you which part failed:

- **"Cannot connect to DWRemail.online"** means the MCP server cannot reach DWRemail.online over the network. Check that the URL in .env is correct and that DWRemail.online is running.

- **"DWRemail.online returned 401"** means the API key in .env does not match the key DWRemail.online expects. Check both sides.

- **"DWRemail.online returned 404"** means the route does not exist yet on DWRemail.online. Check that the routes are built and deployed at the `/api/mcp/` path.

- **"DWRemail.online request timed out"** means DWRemail.online received the request but took more than 30 seconds to respond. Check the route's database queries for performance issues.

---

## SUMMARY OF ALL NINE TOOLS

Once connected, here is what Claude can do and the command language you can use:

| What you say to Claude | Tool that runs | What it does |
|---|---|---|
| "Show me all my email lists" | dwremail_list_all | Lists every list with contact counts |
| "Create a list called Press Media Aug 2026" | dwremail_create_list | Creates a new empty list, returns its ID |
| "Add these contacts to the press list" | dwremail_add_contacts | Loads contacts into a list, skips duplicates |
| "Show me all active campaigns" | dwremail_list_campaigns | Lists campaigns filtered by status |
| "Create Campaign 1 Email 1 for the press list" | dwremail_create_campaign | Builds a campaign with subject, body, sender, and schedule |
| "Pause Campaign 1" | dwremail_update_campaign | Pauses, resumes, or reschedules a campaign |
| "How is Campaign 1 performing?" | dwremail_campaign_stats | Returns open rate, click rate, bounce rate for one campaign |
| "Give me an overall email health check" | dwremail_overview_stats | Aggregate stats across all campaigns with sender health rating |
| "Show me recent bounces" | dwremail_bounces | Lists bounce records for investigation |
| "Is editor@newspaper.com in any of our lists?" | dwremail_search_contact | Searches for a contact across all lists |

---

## THE FULL PIPELINE ONCE CONNECTED

Here is what a typical workflow looks like after integration:

1. You say: "Pull the verified press contacts from Hermes and load them into a new list on DWRemail called Press Media Aug 2026."

2. Claude calls `dwr_list_contacts` (existing Hermes MCP tool) to pull the contacts from the VPS.

3. Claude calls `dwremail_create_list` to create the new list on DWRemail.online.

4. Claude calls `dwremail_add_contacts` to load those contacts into the list.

5. You say: "Now create Campaign 1 Email 1 using the WomenShield email from the drip plan."

6. Claude pulls the email content from the drip campaign plan (already in this project), formats it with Brevo personalization tags, and calls `dwremail_create_campaign` to build it on DWRemail.online.

7. You say: "How are the bounces looking after the first 200 sends?"

8. Claude calls `dwremail_bounces` and `dwremail_campaign_stats` and tells you whether you're within the safe threshold or need to pause.

All of that happens in one conversation. No switching apps. No copying and pasting. No downloading CSVs.
