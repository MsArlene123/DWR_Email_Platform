# =========================================================================
#  DWREMAIL.ONLINE INTEGRATION
#  Add this section to server.py after the existing tools section
#  and before the PROMPTS section.
# =========================================================================
#
#  STEP 1: Add these imports at the top of server.py (with the other imports):
#
#      import httpx
#
#  STEP 2: Add this config line in the Configuration section:
#
#      DWREMAIL_BASE_URL = os.getenv("DWREMAIL_BASE_URL", "https://dwremail.online")
#      DWREMAIL_API_KEY = os.getenv("DWREMAIL_API_KEY", "")
#
#  STEP 3: Add this helper function after the existing helpers:
#
#      async def dwremail_request(method: str, endpoint: str, json_data: dict = None) -> dict:
#          """Make an authenticated request to DWRemail.online API."""
#          url = f"{DWREMAIL_BASE_URL}/api/mcp{endpoint}"
#          headers = {"X-MCP-Key": DWREMAIL_API_KEY, "Content-Type": "application/json"}
#          try:
#              async with httpx.AsyncClient(timeout=30.0) as client:
#                  if method == "GET":
#                      resp = await client.get(url, headers=headers, params=json_data)
#                  elif method == "POST":
#                      resp = await client.post(url, headers=headers, json=json_data)
#                  elif method == "PATCH":
#                      resp = await client.patch(url, headers=headers, json=json_data)
#                  else:
#                      return {"error": f"Unsupported method: {method}"}
#                  resp.raise_for_status()
#                  return resp.json()
#          except httpx.TimeoutException:
#              return {"error": f"DWRemail.online request timed out: {method} {endpoint}"}
#          except httpx.HTTPStatusError as e:
#              return {"error": f"DWRemail.online returned {e.response.status_code}: {e.response.text[:500]}"}
#          except httpx.ConnectError:
#              return {"error": "Cannot connect to DWRemail.online. Is the server running?"}
#          except Exception as e:
#              return {"error": f"DWRemail.online request failed: {str(e)}"}
#
#  STEP 4: Add "httpx" to requirements.txt
#
#  STEP 5: Add DWREMAIL_BASE_URL and DWREMAIL_API_KEY to .env
#
#  STEP 6: Paste the tool definitions below into server.py
#
# =========================================================================


# ---------------------------------------------------------------------------
# DWRemail: List Management
# ---------------------------------------------------------------------------

class DwremailListAllInput(BaseModel):
    """Input for listing all email lists."""
    model_config = ConfigDict(extra="forbid")


@mcp.tool(
    name="dwremail_list_all",
    annotations={
        "title": "List All Email Lists",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    },
)
async def dwremail_list_all(params: DwremailListAllInput) -> str:
    """
    List all email lists on DWRemail.online with their contact counts
    and creation dates. Use this to see what lists exist before
    creating campaigns or adding contacts.
    """
    result = await dwremail_request("GET", "/lists")
    return json.dumps(result, indent=2)


class DwremailCreateListInput(BaseModel):
    """Input for creating a new email list."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    name: str = Field(
        ...,
        description=(
            "Name for the new list. Use descriptive names that match campaigns. "
            "Examples: 'Press Media Aug 2026', 'BK Affiliates', "
            "'WomenShield Partners', 'DWR Law Firms', 'DWR Nonprofits'."
        ),
        max_length=200,
    )
    description: Optional[str] = Field(
        default=None,
        description="Optional description of the list purpose and source.",
        max_length=500,
    )


@mcp.tool(
    name="dwremail_create_list",
    annotations={
        "title": "Create Email List",
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": False,
    },
)
async def dwremail_create_list(params: DwremailCreateListInput) -> str:
    """
    Create a new email list on DWRemail.online. Returns the list ID
    which is needed for adding contacts and creating campaigns.
    """
    data = {"name": params.name}
    if params.description:
        data["description"] = params.description
    result = await dwremail_request("POST", "/lists", data)
    return json.dumps(result, indent=2)


class DwremailAddContactsInput(BaseModel):
    """Input for adding contacts to an email list."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    list_id: str = Field(
        ...,
        description="The ID of the list to add contacts to. Get this from dwremail_list_all.",
        max_length=100,
    )
    contacts: List[Dict[str, str]] = Field(
        ...,
        description=(
            "Array of contact objects. Each must have 'email'. "
            "Optional fields: 'first_name', 'last_name', 'organization'. "
            "Example: [{'email': 'jane@org.com', 'first_name': 'Jane', "
            "'organization': 'Helping Hands'}]"
        ),
    )


@mcp.tool(
    name="dwremail_add_contacts",
    annotations={
        "title": "Add Contacts to List",
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": False,
    },
)
async def dwremail_add_contacts(params: DwremailAddContactsInput) -> str:
    """
    Add contacts to an existing email list on DWRemail.online.
    Accepts an array of contact objects with email, first_name,
    last_name, and organization fields. Duplicates are skipped.
    Returns the count of contacts added and any skipped.
    """
    data = {"contacts": params.contacts}
    result = await dwremail_request("POST", f"/lists/{params.list_id}/contacts", data)
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# DWRemail: Campaign Management
# ---------------------------------------------------------------------------

class DwremailListCampaignsInput(BaseModel):
    """Input for listing all campaigns."""
    model_config = ConfigDict(extra="forbid")

    status: Optional[str] = Field(
        default=None,
        description=(
            "Filter by campaign status: 'draft', 'active', 'paused', "
            "'completed', or None for all."
        ),
        max_length=20,
    )


@mcp.tool(
    name="dwremail_list_campaigns",
    annotations={
        "title": "List Email Campaigns",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    },
)
async def dwremail_list_campaigns(params: DwremailListCampaignsInput) -> str:
    """
    List all email campaigns on DWRemail.online with their status,
    list assignment, and send schedule. Optionally filter by status.
    """
    query = {}
    if params.status:
        query["status"] = params.status
    result = await dwremail_request("GET", "/campaigns", query)
    return json.dumps(result, indent=2)


class DwremailCreateCampaignInput(BaseModel):
    """Input for creating a new email campaign."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    name: str = Field(
        ...,
        description=(
            "Campaign name. Examples: 'Campaign 1: Press Introduction Email 1 WomenShield', "
            "'Campaign 6: Seminar Email 3 Know Rules'."
        ),
        max_length=300,
    )
    subject: str = Field(
        ...,
        description="Email subject line. This is the most important line for open rates.",
        max_length=500,
    )
    body: str = Field(
        ...,
        description=(
            "Full email body in HTML. Use Brevo personalization tags: "
            "{{contact.FIRSTNAME}}, {{contact.ORGANIZATION_NAME}}."
        ),
    )
    sender_name: str = Field(
        ...,
        description="The 'From' name recipients see. Example: 'Jacqueline Stevens' or 'Arlene A. Smith-Scott'.",
        max_length=200,
    )
    sender_email: str = Field(
        ...,
        description=(
            "The 'From' email address. Must be a verified sender domain. "
            "Examples: admin@docwritereview.online, admin@womenshield.help, "
            "customerservice@bankruptcy.forum."
        ),
        max_length=200,
    )
    list_id: str = Field(
        ...,
        description="The ID of the recipient list. Get this from dwremail_list_all.",
        max_length=100,
    )
    schedule: Optional[str] = Field(
        default=None,
        description=(
            "ISO datetime to schedule sending. Example: '2026-08-12T10:00:00Z'. "
            "If omitted, campaign is saved as draft."
        ),
        max_length=50,
    )


@mcp.tool(
    name="dwremail_create_campaign",
    annotations={
        "title": "Create Email Campaign",
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
        "openWorldHint": False,
    },
)
async def dwremail_create_campaign(params: DwremailCreateCampaignInput) -> str:
    """
    Create a new email campaign on DWRemail.online. The campaign is
    created as a draft unless a schedule datetime is provided.
    Returns the campaign ID for tracking and management.
    """
    data = {
        "name": params.name,
        "subject": params.subject,
        "body": params.body,
        "sender_name": params.sender_name,
        "sender_email": params.sender_email,
        "list_id": params.list_id,
    }
    if params.schedule:
        data["schedule"] = params.schedule
    result = await dwremail_request("POST", "/campaigns", data)
    return json.dumps(result, indent=2)


class DwremailUpdateCampaignInput(BaseModel):
    """Input for updating a campaign."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    campaign_id: str = Field(
        ...,
        description="The ID of the campaign to update.",
        max_length=100,
    )
    action: str = Field(
        ...,
        description=(
            "Action to take: 'pause' (stop sending), 'resume' (restart sending), "
            "'reschedule' (change send time, requires schedule field)."
        ),
        max_length=20,
    )
    schedule: Optional[str] = Field(
        default=None,
        description="New schedule datetime (ISO format). Required when action is 'reschedule'.",
        max_length=50,
    )


@mcp.tool(
    name="dwremail_update_campaign",
    annotations={
        "title": "Update Email Campaign",
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    },
)
async def dwremail_update_campaign(params: DwremailUpdateCampaignInput) -> str:
    """
    Update an existing campaign: pause, resume, or reschedule.
    Use this to manage active campaigns without recreating them.
    """
    data = {"action": params.action}
    if params.schedule:
        data["schedule"] = params.schedule
    result = await dwremail_request("PATCH", f"/campaigns/{params.campaign_id}", data)
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# DWRemail: Campaign Stats and Delivery Monitoring
# ---------------------------------------------------------------------------

class DwremailCampaignStatsInput(BaseModel):
    """Input for getting campaign statistics."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    campaign_id: str = Field(
        ...,
        description="The ID of the campaign to get stats for.",
        max_length=100,
    )


@mcp.tool(
    name="dwremail_campaign_stats",
    annotations={
        "title": "Campaign Statistics",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    },
)
async def dwremail_campaign_stats(params: DwremailCampaignStatsInput) -> str:
    """
    Get delivery statistics for a specific campaign: open rate,
    click rate, bounce rate, unsubscribe rate, and total sends.
    Compare against benchmarks (15-25% open, 2-5% click, <3% bounce).
    """
    result = await dwremail_request("GET", f"/campaigns/{params.campaign_id}/stats")
    return json.dumps(result, indent=2)


class DwremailOverviewStatsInput(BaseModel):
    """Input for getting overview statistics."""
    model_config = ConfigDict(extra="forbid")


@mcp.tool(
    name="dwremail_overview_stats",
    annotations={
        "title": "Email Overview Statistics",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    },
)
async def dwremail_overview_stats(params: DwremailOverviewStatsInput) -> str:
    """
    Get aggregate statistics across all campaigns: total sent,
    total opens, total bounces, overall bounce rate. Use this
    for daily health checks on sender reputation.
    """
    result = await dwremail_request("GET", "/stats/overview")
    return json.dumps(result, indent=2)


class DwremailBouncesInput(BaseModel):
    """Input for getting recent bounces."""
    model_config = ConfigDict(extra="forbid")

    limit: int = Field(
        default=50,
        description="Maximum number of bounce records to return.",
        ge=1,
        le=200,
    )


@mcp.tool(
    name="dwremail_bounces",
    annotations={
        "title": "Recent Email Bounces",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    },
)
async def dwremail_bounces(params: DwremailBouncesInput) -> str:
    """
    Get recent email bounces across all campaigns. Critical for
    monitoring sender reputation during warm-up. If bounce rate
    exceeds 3%, sending should be paused for investigation.
    """
    result = await dwremail_request("GET", "/stats/bounces", {"limit": params.limit})
    return json.dumps(result, indent=2)


# ---------------------------------------------------------------------------
# DWRemail: Contact Search
# ---------------------------------------------------------------------------

class DwremailSearchContactInput(BaseModel):
    """Input for searching contacts."""
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    email: str = Field(
        ...,
        description="Email address to search for across all lists.",
        max_length=200,
    )


@mcp.tool(
    name="dwremail_search_contact",
    annotations={
        "title": "Search Email Contact",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False,
    },
)
async def dwremail_search_contact(params: DwremailSearchContactInput) -> str:
    """
    Search for a specific contact by email address across all lists.
    Returns which lists the contact belongs to and their status.
    Useful for checking whether a contact is already loaded before
    adding them to a new campaign.
    """
    result = await dwremail_request("GET", "/contacts/search", {"email": params.email})
    return json.dumps(result, indent=2)
