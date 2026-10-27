#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Fetch RVG project issues with linked issues and governance information.

Reads issues from the RVG project, retrieves linked issues (via "is direct lined by"
or "is governed by" relationships), and extracts key fields: summary, URL, chair,
vice-chair, and emails.

Usage:
    python get-rvg-issues.py
    python get-rvg-issues.py --output json --save output.json
    python get-rvg-issues.py --output csv --save output.csv
    python get-rvg-issues.py --jql "project = RVG AND status = Active"
    python get-rvg-issues.py --issues RVG-1 RVG-2 RVG-3
    python get-rvg-issues.py --verbose

Environment variables:
    JIRA_USER_EMAIL  - Your Jira account email (required)
    JIRA_API_TOKEN   - Your Jira API token (required)
    JIRA_SERVER_URL  - Jira server URL (default: https://riscv.atlassian.net)
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import time
from typing import Any, Dict, List, Optional, Tuple

import requests
from requests.adapters import HTTPAdapter
from requests.auth import HTTPBasicAuth
from urllib3.util.retry import Retry

# =========================
# Config / Constants
# =========================

JIRA_SERVER_URL = os.getenv("JIRA_SERVER_URL", "https://riscv.atlassian.net")
JIRA_USER_EMAIL = os.getenv("JIRA_USER_EMAIL")
JIRA_API_TOKEN = os.getenv("JIRA_API_TOKEN")
HTTP_TIMEOUT_SECS = int(os.getenv("JIRA_HTTP_TIMEOUT", "30"))

# Project key
PROJECT_KEY = "RVG"

# Default JQL to fetch parent issues with relevant statuses (exclude subtasks)
DEFAULT_JQL = f"project = {PROJECT_KEY} AND issuetype not in subTaskIssueTypes() AND status in (Active, Proposing, \"Structuring and Chartering\") ORDER BY status ASC, key ASC"

# Custom field IDs (from get-custom-fields.py)
CF_CHAIR = "customfield_10092"  # Chair
CF_CHAIR_EMAIL = "customfield_10093"  # Chair Email
CF_VICE_CHAIR = "customfield_10099"  # Vice-Chair
CF_VICE_CHAIR_EMAIL = "customfield_10100"  # Vice-Chair Email
CF_CHAIR_AFFILIATION = "customfield_10096"  # Chair Affiliation
CF_VICE_CHAIR_AFFILIATION = "customfield_10103"  # Vice-Chair Affiliation
CF_CHARTER = "customfield_10086"  # Charter
CF_CONFLUENCE_SPACE = "customfield_10122"  # Confluence Space
CF_MAILING_LIST = "customfield_10071"  # Mailing List (Groups.io)
CF_ACTIVITY_LEVEL = "customfield_10145"  # Activity Level (dropdown)
CF_MEETING_NOTES = "customfield_10088"  # Meeting Notes
CF_GROUP_CREATION_DATE = "customfield_10090"  # Group Creation Date
CF_NEXT_ELECTION_MONTH = "customfield_10312"  # Next Election Month
CF_NEXT_ELECTION_YEAR = "customfield_10313"  # Next Election Year
CF_LAST_ELECTION_MONTH = "customfield_10311"  # Last Election Month
CF_LAST_ELECTION_YEAR = "customfield_10310"  # Last Election Year
CF_IS_ACTING_CHAIR = "customfield_10094"  # Is Acting Chair?
CF_IS_ACTING_VICE_CHAIR = "customfield_10102"  # Is Acting Vice-Chair?
CF_RECHARTER_APPROVAL_DATE = "customfield_10643"  # Recharter Approval Date
CF_PARTICIPATION_VOTING = "customfield_10443"  # Participation & Voting Rights
CF_PROPOSAL_OF_WORK = "customfield_10178"  # Proposal of Work
CF_GROUP_TYPE = "customfield_10085"  # Group Type (IC/HC/TG/SIG/GC)
CF_LIFECYCLE_START_DATE = "customfield_10106"  # Group Lifecycle Starting Date
CF_CHAIR_START_DATE = "customfield_10097"  # Chair Start Date (term start)
CF_CHAIR_END_DATE = "customfield_10098"  # Chair End Date (term end)
CF_VICE_CHAIR_START_DATE = "customfield_10104"  # Vice-Chair Start Date (term start)
CF_VICE_CHAIR_END_DATE = "customfield_10105"  # Vice-Chair End Date (term end)
CF_ELECTION_STATUS = "customfield_10343"  # Election Status (CfC Open / Voting / Closed)
CF_TWO_YEARS_ACTIVE = "customfield_10574"  # 2+ Years Active (Jira automation)
CF_EXTENSION_REQUEST = "customfield_10608"  # 1 Year Extension Request
CF_EXTENSION_DECISION_DATE = "customfield_10610"  # 1 Year Extension Request Decision date
CF_DISBANDING_DATE = "customfield_10091"  # Group Disbanding Date

# Statuses that are shown on the dashboard. Every other RVG group (Archived,
# Cancelled, TODO) is appended to the grouped CSV as a history-only row so the
# dashboard can build a time series from the status changelog.
DASHBOARD_STATUSES = ("Active", "Proposing", "Structuring and Chartering")
# Elections (calls for candidates) that have not finished. The RVC project is
# the source of truth for an election in progress; the RVG Election Status
# field is not always updated when a call opens or closes.
OPEN_ELECTIONS_JQL = "project = RVC AND issuetype not in subTaskIssueTypes() AND statusCategory != Done ORDER BY key ASC"
HISTORY_JQL = f"project = {PROJECT_KEY} AND issuetype not in subTaskIssueTypes() AND status not in (Active, Proposing, \"Structuring and Chartering\") ORDER BY key ASC"

# Link types we're interested in (inward link names)
LINK_TYPES_OF_INTEREST = [
    "is direct-lined by",
    "is governed by",
]

# Fields to fetch from Jira
ISSUE_FIELDS = [
    "summary",
    "status",
    "created",
    "issuelinks",
    CF_CHAIR,
    CF_CHAIR_EMAIL,
    CF_CHAIR_AFFILIATION,
    CF_VICE_CHAIR,
    CF_VICE_CHAIR_EMAIL,
    CF_VICE_CHAIR_AFFILIATION,
    CF_CHARTER,
    CF_CONFLUENCE_SPACE,
    CF_MAILING_LIST,
    CF_ACTIVITY_LEVEL,
    CF_MEETING_NOTES,
    CF_GROUP_CREATION_DATE,
    CF_NEXT_ELECTION_MONTH,
    CF_NEXT_ELECTION_YEAR,
    CF_LAST_ELECTION_MONTH,
    CF_LAST_ELECTION_YEAR,
    CF_IS_ACTING_CHAIR,
    CF_IS_ACTING_VICE_CHAIR,
    CF_RECHARTER_APPROVAL_DATE,
    CF_PARTICIPATION_VOTING,
    CF_PROPOSAL_OF_WORK,
    CF_GROUP_TYPE,
    CF_LIFECYCLE_START_DATE,
    CF_CHAIR_START_DATE,
    CF_CHAIR_END_DATE,
    CF_VICE_CHAIR_START_DATE,
    CF_VICE_CHAIR_END_DATE,
    CF_ELECTION_STATUS,
    CF_TWO_YEARS_ACTIVE,
    CF_EXTENSION_REQUEST,
    CF_EXTENSION_DECISION_DATE,
    CF_DISBANDING_DATE,
]

# =========================
# Helpers
# =========================


def make_http_session() -> requests.Session:
    """
    Shared session for REST calls with retries/backoff.
    """
    s = requests.Session()
    retries = Retry(
        total=5,
        backoff_factor=0.8,
        status_forcelist=[410, 429, 500, 502, 503, 504],
        allowed_methods=["GET", "POST", "PUT"],
        raise_on_status=False,
    )
    s.mount("https://", HTTPAdapter(max_retries=retries))
    s.headers.update({"Accept": "application/json", "Content-Type": "application/json"})
    return s


def _respect_retry_after(resp: requests.Response) -> None:
    """Handle HTTP 429 rate limiting."""
    if resp.status_code != 429:
        return
    ra = resp.headers.get("Retry-After")
    try:
        sleep_s = max(int(ra), 1) if ra else 5
    except ValueError:
        sleep_s = 5
    print(f"   Rate limited, waiting {sleep_s}s...")
    time.sleep(sleep_s)


def extract_user_info(user_field: Any) -> Dict[str, Optional[str]]:
    """
    Extract user information from a Jira user field.
    Returns dict with displayName, emailAddress, accountId.
    """
    if not user_field:
        return {"displayName": None, "emailAddress": None, "accountId": None}

    if isinstance(user_field, dict):
        return {
            "displayName": user_field.get("displayName"),
            "emailAddress": user_field.get("emailAddress"),
            "accountId": user_field.get("accountId"),
        }

    # If it's a string (raw value), return as displayName
    if isinstance(user_field, str):
        return {"displayName": user_field, "emailAddress": None, "accountId": None}

    return {"displayName": None, "emailAddress": None, "accountId": None}


def extract_emails(email_field: Any) -> List[str]:
    """
    Extract emails from various field types (string, list, multi-user).
    """
    if not email_field:
        return []

    # If it's a string, split by common delimiters
    if isinstance(email_field, str):
        # Split by comma, semicolon, or whitespace
        parts = re.split(r"[,;\s]+", email_field)
        return [p.strip() for p in parts if p.strip() and "@" in p]

    # If it's a list (multi-user field)
    if isinstance(email_field, list):
        emails = []
        for item in email_field:
            if isinstance(item, dict):
                email = item.get("emailAddress")
                if email:
                    emails.append(email)
            elif isinstance(item, str) and "@" in item:
                emails.append(item)
        return emails

    return []


def get_issue_url(issue_key: str) -> str:
    """Generate the browse URL for an issue."""
    return f"{JIRA_SERVER_URL}/browse/{issue_key}"


def search_issues(
    sess: requests.Session,
    jql: str,
    fields: List[str],
    verbose: bool = False,
    strict: bool = False,
) -> List[Dict]:
    """
    Search for issues using JQL with pagination (v3 API with POST).
    Returns list of issue data. With strict=True an HTTP error exits the run
    instead of returning a partial list: a silent gap would publish wrong
    counts, and a failed run keeps the last good site live.
    """
    auth = HTTPBasicAuth(JIRA_USER_EMAIL, JIRA_API_TOKEN)
    url = f"{JIRA_SERVER_URL}/rest/api/3/search/jql"

    all_issues = []
    next_page_token = None
    max_results = 50

    while True:
        payload = {
            "jql": jql,
            "fields": fields,
            "maxResults": max_results,
        }
        if next_page_token:
            payload["nextPageToken"] = next_page_token

        if verbose:
            print(f"[VERBOSE] POST {url}")
            print(f"[VERBOSE] JQL: {jql}")
            if next_page_token:
                print(f"[VERBOSE] nextPageToken: {next_page_token[:20]}...")

        for attempt in range(6):
            resp = sess.post(
                url,
                data=json.dumps(payload),
                auth=auth,
                timeout=HTTP_TIMEOUT_SECS,
            )
            if resp.status_code == 429:
                _respect_retry_after(resp)
                continue
            break

        if resp.status_code != 200:
            print(f"Error searching issues: HTTP {resp.status_code}")
            try:
                error_data = resp.json()
                if "errorMessages" in error_data:
                    for msg in error_data["errorMessages"]:
                        print(f"  {msg}")
            except ValueError:
                print(f"  {resp.text[:500]}")
            if strict:
                sys.exit(1)
            return all_issues

        data = resp.json()
        issues = data.get("issues", [])
        all_issues.extend(issues)

        total = data.get("total", len(all_issues))
        if verbose:
            print(f"[VERBOSE] Fetched {len(all_issues)}/{total} issues")

        # Check for next page token
        next_page_token = data.get("nextPageToken")
        if not next_page_token:
            break

    return all_issues


def get_issue_details(
    sess: requests.Session,
    issue_key: str,
    fields: List[str],
    verbose: bool = False,
) -> Optional[Dict]:
    """
    Fetch a single issue with specified fields.
    """
    auth = HTTPBasicAuth(JIRA_USER_EMAIL, JIRA_API_TOKEN)
    url = f"{JIRA_SERVER_URL}/rest/api/3/issue/{issue_key}"
    params = {"fields": ",".join(fields)}

    if verbose:
        print(f"[VERBOSE] GET {url}")

    for attempt in range(6):
        resp = sess.get(url, params=params, auth=auth, timeout=HTTP_TIMEOUT_SECS)
        if resp.status_code == 429:
            _respect_retry_after(resp)
            continue
        break

    if resp.status_code == 200:
        return resp.json()
    elif resp.status_code == 404:
        print(f"Warning: Issue {issue_key} not found")
        return None
    else:
        print(f"Warning: Error fetching {issue_key}: HTTP {resp.status_code}")
        return None


def normalize_atlassian_url(url: Optional[str]) -> Optional[str]:
    """Rewrite links on the legacy lf-riscv.atlassian.net site to riscv.atlassian.net."""
    if not url:
        return url
    return url.replace("://lf-riscv.atlassian.net", "://riscv.atlassian.net")


def extract_url_field(field_value: Any) -> Optional[str]:
    """Extract URL from a Jira URL field (can be string or dict with href)."""
    if not field_value:
        return None
    if isinstance(field_value, str):
        return normalize_atlassian_url(field_value)
    if isinstance(field_value, dict):
        return normalize_atlassian_url(field_value.get("href") or field_value.get("url"))
    return None


def extract_dropdown_value(field_value: Any) -> Optional[str]:
    """Extract value from a Jira dropdown/select field."""
    if not field_value:
        return None
    if isinstance(field_value, str):
        return field_value
    if isinstance(field_value, dict):
        return field_value.get("value") or field_value.get("name")
    return None


def process_issue(issue_data: Dict) -> Dict:
    """
    Process a single issue and extract required fields.
    Returns a structured dict with issue information.
    """
    fields = issue_data.get("fields", {})
    issue_key = issue_data.get("key", "")

    # Extract chair info (can be user object or string)
    chair_raw = fields.get(CF_CHAIR)
    chair_info = extract_user_info(chair_raw)

    # Extract chair email (separate field, can be string)
    chair_email_raw = fields.get(CF_CHAIR_EMAIL)
    chair_email = chair_email_raw if isinstance(chair_email_raw, str) else chair_info.get("emailAddress")

    # Extract vice-chair info (can be user object or string)
    vice_chair_raw = fields.get(CF_VICE_CHAIR)
    vice_chair_info = extract_user_info(vice_chair_raw)

    # Extract vice-chair email (separate field, can be string)
    vice_chair_email_raw = fields.get(CF_VICE_CHAIR_EMAIL)
    vice_chair_email = vice_chair_email_raw if isinstance(vice_chair_email_raw, str) else vice_chair_info.get("emailAddress")

    # Collect all emails
    emails = []
    if chair_email:
        emails.append(chair_email)
    if vice_chair_email and vice_chair_email not in emails:
        emails.append(vice_chair_email)

    # Extract status
    status_raw = fields.get("status")
    status = status_raw.get("name") if isinstance(status_raw, dict) else None

    # Extract affiliations
    chair_affiliation = fields.get(CF_CHAIR_AFFILIATION)
    if isinstance(chair_affiliation, dict):
        chair_affiliation = chair_affiliation.get("value") or chair_affiliation.get("name")
    vice_chair_affiliation = fields.get(CF_VICE_CHAIR_AFFILIATION)
    if isinstance(vice_chair_affiliation, dict):
        vice_chair_affiliation = vice_chair_affiliation.get("value") or vice_chair_affiliation.get("name")

    # Extract additional fields
    charter = extract_url_field(fields.get(CF_CHARTER))
    confluence_space = extract_url_field(fields.get(CF_CONFLUENCE_SPACE))
    mailing_list = extract_url_field(fields.get(CF_MAILING_LIST))
    activity_level = extract_dropdown_value(fields.get(CF_ACTIVITY_LEVEL))
    meeting_notes = extract_url_field(fields.get(CF_MEETING_NOTES))
    creation_date = fields.get(CF_GROUP_CREATION_DATE)  # Date string like "2023-01-15"
    next_election_month = extract_dropdown_value(fields.get(CF_NEXT_ELECTION_MONTH))
    next_election_year = extract_dropdown_value(fields.get(CF_NEXT_ELECTION_YEAR))
    last_election_month = extract_dropdown_value(fields.get(CF_LAST_ELECTION_MONTH))
    last_election_year = extract_dropdown_value(fields.get(CF_LAST_ELECTION_YEAR))

    # Extract acting chair/vice-chair flags (checkbox fields)
    is_acting_chair_raw = fields.get(CF_IS_ACTING_CHAIR)
    is_acting_vice_chair_raw = fields.get(CF_IS_ACTING_VICE_CHAIR)
    # Checkbox fields can be: None, boolean, or list with {"value": "Yes"/"No"}
    def parse_checkbox(val):
        if val is None:
            return False
        if isinstance(val, bool):
            return val
        if isinstance(val, list) and len(val) > 0:
            first = val[0]
            if isinstance(first, dict):
                return first.get("value", "").lower() == "yes"
            return str(first).lower() == "yes"
        if isinstance(val, dict):
            return val.get("value", "").lower() == "yes"
        return str(val).lower() in ("yes", "true", "1")

    is_acting_chair = parse_checkbox(is_acting_chair_raw)
    is_acting_vice_chair = parse_checkbox(is_acting_vice_chair_raw)

    # Extract recharter approval date
    recharter_approval_date = fields.get(CF_RECHARTER_APPROVAL_DATE)  # Date string like "2023-01-15"

    # Extract participation & voting rights
    participation_voting = extract_url_field(fields.get(CF_PARTICIPATION_VOTING))

    # Extract Proposal of Work page
    pow_page = extract_url_field(fields.get(CF_PROPOSAL_OF_WORK))

    return {
        "key": issue_key,
        "group_type": extract_dropdown_value(fields.get(CF_GROUP_TYPE)),
        "lifecycle_start_date": fields.get(CF_LIFECYCLE_START_DATE),
        "chair_start_date": fields.get(CF_CHAIR_START_DATE),
        "chair_end_date": fields.get(CF_CHAIR_END_DATE),
        "vice_chair_start_date": fields.get(CF_VICE_CHAIR_START_DATE),
        "vice_chair_end_date": fields.get(CF_VICE_CHAIR_END_DATE),
        "election_status": extract_dropdown_value(fields.get(CF_ELECTION_STATUS)),
        "two_years_active": extract_dropdown_value(fields.get(CF_TWO_YEARS_ACTIVE)),
        "extension_request": extract_dropdown_value(fields.get(CF_EXTENSION_REQUEST)),
        "extension_decision_date": fields.get(CF_EXTENSION_DECISION_DATE),
        "disbanding_date": fields.get(CF_DISBANDING_DATE),
        "summary": fields.get("summary", ""),
        "created": fields.get("created"),
        "url": get_issue_url(issue_key),
        "chair": chair_info.get("displayName"),
        "chair_email": chair_email,
        "chair_affiliation": chair_affiliation,
        "vice_chair": vice_chair_info.get("displayName"),
        "vice_chair_email": vice_chair_email,
        "vice_chair_affiliation": vice_chair_affiliation,
        "emails": emails,
        "status": status,
        "charter": charter,
        "confluence_space": confluence_space,
        "mailing_list": mailing_list,
        "activity_level": activity_level,
        "meeting_notes": meeting_notes,
        "creation_date": creation_date,
        "next_election_month": next_election_month,
        "next_election_year": next_election_year,
        "last_election_month": last_election_month,
        "last_election_year": last_election_year,
        "is_acting_chair": is_acting_chair,
        "is_acting_vice_chair": is_acting_vice_chair,
        "recharter_approval_date": recharter_approval_date,
        "participation_voting": participation_voting,
        "pow_page": pow_page,
    }


def get_linked_issues(
    issue_data: Dict,
    link_types: List[str],
) -> List[Dict]:
    """
    Extract linked issues from issue data based on specified link types.
    Returns list of linked issue references.
    """
    fields = issue_data.get("fields", {})
    issue_links = fields.get("issuelinks", [])
    linked = []

    for link in issue_links:
        link_type = link.get("type", {})

        # Check inward links
        inward_name = link_type.get("inward", "").lower()
        outward_name = link_type.get("outward", "").lower()

        linked_issue = None
        link_direction = None

        # Check if this link type matches our criteria
        for lt in link_types:
            lt_lower = lt.lower()
            if lt_lower in inward_name and "inwardIssue" in link:
                linked_issue = link.get("inwardIssue")
                link_direction = "inward"
                break
            elif lt_lower in outward_name and "outwardIssue" in link:
                linked_issue = link.get("outwardIssue")
                link_direction = "outward"
                break

        if linked_issue:
            linked.append({
                "key": linked_issue.get("key"),
                "link_type": link_type.get("name"),
                "direction": link_direction,
            })

    return linked


def fetch_and_process_issues(
    sess: requests.Session,
    jql: Optional[str],
    issue_keys: Optional[List[str]],
    verbose: bool = False,
) -> List[Dict]:
    """
    Fetch issues and their linked issues, process and return structured data.
    """
    results = []

    if issue_keys:
        # Fetch specific issues
        print(f"Fetching {len(issue_keys)} specified issue(s)...")
        issues = []
        for key in issue_keys:
            issue = get_issue_details(sess, key, ISSUE_FIELDS, verbose)
            if issue:
                issues.append(issue)
    else:
        # Search using JQL
        search_jql = jql or DEFAULT_JQL
        print(f"Searching issues with JQL: {search_jql}")
        issues = search_issues(sess, search_jql, ISSUE_FIELDS, verbose)

    print(f"Found {len(issues)} issue(s)")

    # Process each issue
    for idx, issue_data in enumerate(issues, 1):
        issue_key = issue_data.get("key", "")
        print(f"Processing {idx}/{len(issues)}: {issue_key}")

        # Process main issue
        main_info = process_issue(issue_data)

        # Get linked issues
        linked_refs = get_linked_issues(issue_data, LINK_TYPES_OF_INTEREST)

        # Fetch details for linked issues
        linked_issues = []
        for ref in linked_refs:
            linked_key = ref.get("key")
            if verbose:
                print(f"  [VERBOSE] Fetching linked issue: {linked_key}")

            linked_data = get_issue_details(sess, linked_key, ISSUE_FIELDS, verbose)
            if linked_data:
                linked_info = process_issue(linked_data)
                linked_info["link_type"] = ref.get("link_type")
                linked_info["link_direction"] = ref.get("direction")
                linked_issues.append(linked_info)

        # Combine results
        result = {
            "issue": main_info,
            "linked_issues": linked_issues,
        }
        results.append(result)

    return results


def format_text_output(results: List[Dict]) -> str:
    """Format results as organized text."""
    lines = []
    lines.append("=" * 80)
    lines.append("RVG ISSUES WITH LINKED GOVERNANCE")
    lines.append("=" * 80)
    lines.append("")

    for result in results:
        issue = result["issue"]
        linked = result["linked_issues"]

        lines.append("-" * 80)
        lines.append(f"Issue: {issue['key']}")
        lines.append("-" * 80)
        lines.append(f"  Summary:     {issue['summary']}")
        lines.append(f"  URL:         {issue['url']}")
        lines.append(f"  Chair:       {issue['chair'] or 'N/A'}")
        if issue['chair_email']:
            lines.append(f"               Email: {issue['chair_email']}")
        lines.append(f"  Vice-Chair:  {issue['vice_chair'] or 'N/A'}")
        if issue['vice_chair_email']:
            lines.append(f"               Email: {issue['vice_chair_email']}")
        if issue['emails']:
            lines.append(f"  Emails:      {', '.join(issue['emails'])}")

        if linked:
            lines.append("")
            lines.append(f"  Linked Issues ({len(linked)}):")
            for li in linked:
                lines.append(f"    - {li['key']} ({li.get('link_type', 'unknown')})")
                lines.append(f"      Summary:     {li['summary']}")
                lines.append(f"      URL:         {li['url']}")
                lines.append(f"      Chair:       {li['chair'] or 'N/A'}")
                if li['chair_email']:
                    lines.append(f"                   Email: {li['chair_email']}")
                lines.append(f"      Vice-Chair:  {li['vice_chair'] or 'N/A'}")
                if li['vice_chair_email']:
                    lines.append(f"                   Email: {li['vice_chair_email']}")
                if li['emails']:
                    lines.append(f"      Emails:      {', '.join(li['emails'])}")
        else:
            lines.append("")
            lines.append("  Linked Issues: None")

        lines.append("")

    lines.append("=" * 80)
    lines.append(f"Total: {len(results)} issue(s)")
    lines.append("=" * 80)

    return "\n".join(lines)


def save_json(results: List[Dict], filepath: str) -> None:
    """Save results to JSON file."""
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"Saved JSON to: {filepath}")


def save_csv(results: List[Dict], filepath: str) -> None:
    """Save results to CSV file (flattened format)."""
    # Flatten results for CSV
    rows = []
    for result in results:
        issue = result["issue"]
        linked = result["linked_issues"]

        # Main issue row
        row = {
            "type": "main",
            "key": issue["key"],
            "summary": issue["summary"],
            "url": issue["url"],
            "chair": issue["chair"] or "",
            "chair_email": issue["chair_email"] or "",
            "vice_chair": issue["vice_chair"] or "",
            "vice_chair_email": issue["vice_chair_email"] or "",
            "emails": ";".join(issue["emails"]),
            "linked_to": "",
            "link_type": "",
        }
        rows.append(row)

        # Linked issue rows
        for li in linked:
            row = {
                "type": "linked",
                "key": li["key"],
                "summary": li["summary"],
                "url": li["url"],
                "chair": li["chair"] or "",
                "chair_email": li["chair_email"] or "",
                "vice_chair": li["vice_chair"] or "",
                "vice_chair_email": li["vice_chair_email"] or "",
                "emails": ";".join(li["emails"]),
                "linked_to": issue["key"],
                "link_type": li.get("link_type", ""),
            }
            rows.append(row)

    # Write CSV
    if rows:
        fieldnames = list(rows[0].keys())
        with open(filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        print(f"Saved CSV to: {filepath}")
    else:
        print("No data to save to CSV")


def fetch_status_history(
    sess: requests.Session,
    issue_key: str,
    current_status: Optional[str],
    created: Optional[str],
    verbose: bool = False,
) -> str:
    """
    Build a compact status history for one issue from its Jira changelog.

    Returns "YYYY-MM-DD:Status;YYYY-MM-DD:Status;..." where the first entry is
    the issue creation date with its initial status and each later entry is a
    day on which the status changed. Several transitions on the same day are
    collapsed to the net change, and days with no net change are dropped (Jira
    workflow migrations often bounce a status and back within seconds).
    Returns "" if the changelog cannot be read.
    """
    auth = HTTPBasicAuth(JIRA_USER_EMAIL, JIRA_API_TOKEN)
    url = f"{JIRA_SERVER_URL}/rest/api/3/issue/{issue_key}/changelog"
    histories: List[Dict] = []
    start_at = 0
    while True:
        resp = None
        for attempt in range(6):
            resp = sess.get(url, params={"startAt": start_at, "maxResults": 100}, auth=auth, timeout=HTTP_TIMEOUT_SECS)
            if resp.status_code == 429:
                _respect_retry_after(resp)
                continue
            break
        if resp is None or resp.status_code != 200:
            print(f"Warning: could not read changelog of {issue_key}: HTTP {resp.status_code if resp is not None else '?'}")
            return ""
        data = resp.json()
        values = data.get("values", [])
        histories.extend(values)
        if data.get("isLast", True) or not values:
            break
        start_at += len(values)

    # (timestamp, from, to) for every status change, oldest first
    changes = []
    for h in histories:
        for item in h.get("items", []):
            if item.get("field") == "status":
                changes.append((h.get("created", ""), item.get("fromString") or "", item.get("toString") or ""))
    changes.sort(key=lambda c: c[0])

    initial = changes[0][1] if changes else (current_status or "")
    entries = [f"{(created or '')[:10]}:{initial}"]
    by_day: Dict[str, List[Tuple[str, str, str]]] = {}
    order: List[str] = []
    for c in changes:
        day = c[0][:10]
        if day not in by_day:
            by_day[day] = []
            order.append(day)
        by_day[day].append(c)
    state = initial
    for day in order:
        final = by_day[day][-1][2]
        if final and final != state:
            entries.append(f"{day}:{final}")
            state = final
    if verbose:
        print(f"  [VERBOSE] {issue_key} history: {';'.join(entries)}")
    return ";".join(entries)


GROUPED_CSV_FIELDS = [
    "Issue",
    "Summary",
    "Status",
    "Creation Date",
    "Recharter Approval Date",
    "Charter",
    "Confluence Space",
    "Mailing List",
    "Activity Level",
    "Meeting Notes",
    "Participation & Voting Rights",
    "PoW",
    "Next Election Month",
    "Next Election Year",
    "Last Election Month",
    "Last Election Year",
    "Chair",
    "Chair Email",
    "Chair Affiliation",
    "Is Acting Chair",
    "Vice-Chair",
    "Vice-Chair Email",
    "Vice-Chair Affiliation",
    "Is Acting Vice-Chair",
    "Linked Issue Summary",
    "Linked Issue Chair",
    "Linked Issue Chair Email",
    "Linked Issue Chair Affiliation",
    "Linked Issue Vice-Chair",
    "Linked Issue Vice-Chair Email",
    "Linked Issue Vice-Chair Affiliation",
    "Linked Issue Mailing List",
    "Linked Issue Participation & Voting Rights",
    # Columns added later; appended so existing consumers keep working.
    "Linked Issue Key",
    "Group Type",
    "Lifecycle Starting Date",
    "Chair Start Date",
    "Chair End Date",
    "Vice-Chair Start Date",
    "Vice-Chair End Date",
    "Election Status",
    "2+ Years Active",
    "Extension Request",
    "Extension Decision Date",
    "Disbanding Date",
    "Open Elections",
    "Status History",
    "Data Fetched At",
]

HISTORY_ONLY_BLANK_FIELDS = [
    "Chair", "Chair Email", "Chair Affiliation", "Is Acting Chair",
    "Vice-Chair", "Vice-Chair Email", "Vice-Chair Affiliation", "Is Acting Vice-Chair",
    "Chair Start Date", "Chair End Date", "Vice-Chair Start Date", "Vice-Chair End Date",
]


def _grouped_row(issue: Dict, li: Optional[Dict], fetched_at: str) -> Dict[str, str]:
    """One grouped-CSV row for an issue and (optionally) one governing issue."""
    li = li or {}
    return {
        "Issue": issue["key"],
        "Summary": issue["summary"],
        "Status": issue.get("status") or "",
        "Creation Date": issue.get("creation_date") or "",
        "Recharter Approval Date": issue.get("recharter_approval_date") or "",
        "Charter": issue.get("charter") or "",
        "Confluence Space": issue.get("confluence_space") or "",
        "Mailing List": issue.get("mailing_list") or "",
        "Activity Level": issue.get("activity_level") or "",
        "Meeting Notes": issue.get("meeting_notes") or "",
        "Participation & Voting Rights": issue.get("participation_voting") or "",
        "PoW": issue.get("pow_page") or "",
        "Next Election Month": issue.get("next_election_month") or "",
        "Next Election Year": issue.get("next_election_year") or "",
        "Last Election Month": issue.get("last_election_month") or "",
        "Last Election Year": issue.get("last_election_year") or "",
        "Chair": issue.get("chair") or "",
        "Chair Email": issue.get("chair_email") or "",
        "Chair Affiliation": issue.get("chair_affiliation") or "",
        "Is Acting Chair": "Yes" if issue.get("is_acting_chair") else "No",
        "Vice-Chair": issue.get("vice_chair") or "",
        "Vice-Chair Email": issue.get("vice_chair_email") or "",
        "Vice-Chair Affiliation": issue.get("vice_chair_affiliation") or "",
        "Is Acting Vice-Chair": "Yes" if issue.get("is_acting_vice_chair") else "No",
        "Linked Issue Summary": li.get("summary") or "",
        "Linked Issue Chair": li.get("chair") or "",
        "Linked Issue Chair Email": li.get("chair_email") or "",
        "Linked Issue Chair Affiliation": li.get("chair_affiliation") or "",
        "Linked Issue Vice-Chair": li.get("vice_chair") or "",
        "Linked Issue Vice-Chair Email": li.get("vice_chair_email") or "",
        "Linked Issue Vice-Chair Affiliation": li.get("vice_chair_affiliation") or "",
        "Linked Issue Mailing List": li.get("mailing_list") or "",
        "Linked Issue Participation & Voting Rights": li.get("participation_voting") or "",
        "Linked Issue Key": li.get("key") or "",
        "Group Type": issue.get("group_type") or "",
        "Lifecycle Starting Date": issue.get("lifecycle_start_date") or "",
        "Chair Start Date": issue.get("chair_start_date") or "",
        "Chair End Date": issue.get("chair_end_date") or "",
        "Vice-Chair Start Date": issue.get("vice_chair_start_date") or "",
        "Vice-Chair End Date": issue.get("vice_chair_end_date") or "",
        "Election Status": issue.get("election_status") or "",
        "2+ Years Active": issue.get("two_years_active") or "",
        "Extension Request": issue.get("extension_request") or "",
        "Extension Decision Date": issue.get("extension_decision_date") or "",
        "Disbanding Date": issue.get("disbanding_date") or "",
        "Open Elections": issue.get("open_elections") or "",
        "Status History": issue.get("status_history") or "",
        "Data Fetched At": fetched_at,
    }


def fetch_open_elections(sess: requests.Session, verbose: bool = False) -> Dict[str, str]:
    """
    Map RVG key -> "RVC-1:Voting|RVC-2:No Candidates" for every RVC issue
    (call for candidates) that is not in a Done status category.
    """
    out: Dict[str, List[str]] = {}
    for raw in search_issues(sess, OPEN_ELECTIONS_JQL, ["status", "issuelinks"], verbose, strict=True):
        status = (raw.get("fields", {}).get("status") or {}).get("name") or ""
        for link in raw.get("fields", {}).get("issuelinks", []):
            other = link.get("inwardIssue") or link.get("outwardIssue") or {}
            key = other.get("key", "")
            if key.startswith(f"{PROJECT_KEY}-"):
                out.setdefault(key, []).append(f"{raw.get('key')}:{status}")
    return {k: "|".join(v) for k, v in out.items()}


def save_grouped_csv(results: List[Dict], filepath: str, history_issues: Optional[List[Dict]] = None) -> None:
    """
    Save results to CSV file grouped by linked issue summary.

    One row per (group, governing committee) pair, so a group with two
    governing committees appears twice; consumers must de-duplicate on
    "Issue" when counting groups. history_issues (Archived/Cancelled/TODO
    groups) are appended as rows without governing data; they exist only so
    the dashboard can compute history and are filtered out of every view.
    """
    fetched_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    rows = []
    for result in results:
        issue = result["issue"]
        linked = result["linked_issues"]
        if linked:
            for li in linked:
                rows.append(_grouped_row(issue, li, fetched_at))
        else:
            rows.append(_grouped_row(issue, None, fetched_at))

    # Sort by Linked Issue Summary to group them together
    rows.sort(key=lambda x: (x["Linked Issue Summary"] or "zzz", x["Issue"]))

    # History-only rows (Archived/Cancelled/TODO groups) keep no people data:
    # the file is public, and the History view only needs keys, names,
    # status, type and dates.
    seen = {r["Issue"] for r in rows}
    for issue in history_issues or []:
        if issue["key"] not in seen:
            row = _grouped_row(issue, None, fetched_at)
            for field in HISTORY_ONLY_BLANK_FIELDS:
                row[field] = ""
            rows.append(row)

    if rows:
        with open(filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=GROUPED_CSV_FIELDS)
            writer.writeheader()
            writer.writerows(rows)
        print(f"Saved grouped CSV to: {filepath}")
    else:
        print("No data to save to CSV")


# =========================
# Main
# =========================


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fetch RVG issues with linked governance information.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    %(prog)s
    %(prog)s --output json --save output.json
    %(prog)s --output csv --save output.csv
    %(prog)s --jql "project = RVG AND status = Active"
    %(prog)s --issues RVG-1 RVG-2 RVG-3
    %(prog)s --verbose

Environment variables:
    JIRA_USER_EMAIL  - Your Jira account email (required)
    JIRA_API_TOKEN   - Your Jira API token (required)
    JIRA_SERVER_URL  - Jira server URL (default: https://riscv.atlassian.net)
""",
    )
    parser.add_argument(
        "--jql",
        default=None,
        help=f"JQL query to filter issues (default: '{DEFAULT_JQL}').",
    )
    parser.add_argument(
        "--issues",
        nargs="+",
        metavar="KEY",
        help="Specific issue keys to fetch (e.g., RVG-1 RVG-2).",
    )
    parser.add_argument(
        "--output",
        choices=["text", "json", "csv", "grouped-csv"],
        default="text",
        help="Output format: text, json, csv, or grouped-csv (default: text).",
    )
    parser.add_argument(
        "--save",
        metavar="FILE",
        help="Save output to file (for json/csv formats).",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable verbose debug output.",
    )
    parser.add_argument(
        "--no-history",
        action="store_true",
        help="grouped-csv only: skip the status changelog and the Archived/Cancelled/TODO history rows.",
    )
    parser.add_argument(
        "--list-link-types",
        action="store_true",
        help="Fetch and list all available link types in Jira, then exit.",
    )
    args = parser.parse_args()

    # Validate environment variables
    if not JIRA_USER_EMAIL or not JIRA_API_TOKEN:
        print("Error: Set env vars JIRA_USER_EMAIL and JIRA_API_TOKEN.")
        sys.exit(1)

    if args.verbose:
        print(f"[VERBOSE] Jira Server: {JIRA_SERVER_URL}")
        print(f"[VERBOSE] User: {JIRA_USER_EMAIL}")

    sess = make_http_session()

    # List link types option
    if args.list_link_types:
        print("Fetching available link types...")
        auth = HTTPBasicAuth(JIRA_USER_EMAIL, JIRA_API_TOKEN)
        url = f"{JIRA_SERVER_URL}/rest/api/3/issueLinkType"
        resp = sess.get(url, auth=auth, timeout=HTTP_TIMEOUT_SECS)
        if resp.status_code == 200:
            data = resp.json()
            print("\nAvailable Link Types:")
            print("-" * 60)
            for lt in data.get("issueLinkTypes", []):
                print(f"  Name: {lt.get('name')}")
                print(f"    Inward:  {lt.get('inward')}")
                print(f"    Outward: {lt.get('outward')}")
                print()
        else:
            print(f"Error fetching link types: HTTP {resp.status_code}")
        return

    # Fetch and process issues
    results = fetch_and_process_issues(
        sess=sess,
        jql=args.jql,
        issue_keys=args.issues,
        verbose=args.verbose,
    )

    if not results:
        print("No issues found.")
        return

    # Output results
    if args.output == "text":
        output = format_text_output(results)
        print(output)
        if args.save:
            with open(args.save, "w", encoding="utf-8") as f:
                f.write(output)
            print(f"Saved text to: {args.save}")

    elif args.output == "json":
        if args.save:
            save_json(results, args.save)
        else:
            print(json.dumps(results, indent=2, ensure_ascii=False))

    elif args.output == "csv":
        if args.save:
            save_csv(results, args.save)
        else:
            print("CSV output requires --save option to specify output file.")
            sys.exit(1)

    elif args.output == "grouped-csv":
        if args.save:
            history_issues: List[Dict] = []
            open_elections = fetch_open_elections(sess, args.verbose)
            for r in results:
                r["issue"]["open_elections"] = open_elections.get(r["issue"]["key"], "")
            if not args.no_history:
                print("Fetching status history (changelog) for every RVG group...")
                for raw in search_issues(sess, HISTORY_JQL, ISSUE_FIELDS, args.verbose, strict=True):
                    history_issues.append(process_issue(raw))
                for issue in [r["issue"] for r in results] + history_issues:
                    issue["status_history"] = fetch_status_history(
                        sess, issue["key"], issue.get("status"), issue.get("created"), args.verbose
                    )
            save_grouped_csv(results, args.save, history_issues)
        else:
            print("Grouped CSV output requires --save option to specify output file.")
            sys.exit(1)


if __name__ == "__main__":
    main()
