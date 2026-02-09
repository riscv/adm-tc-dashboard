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

# Link types we're interested in (inward link names)
LINK_TYPES_OF_INTEREST = [
    "is direct-lined by",
    "is governed by",
]

# Fields to fetch from Jira
ISSUE_FIELDS = [
    "summary",
    "status",
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
) -> List[Dict]:
    """
    Search for issues using JQL with pagination (v3 API with POST).
    Returns list of issue data.
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


def extract_url_field(field_value: Any) -> Optional[str]:
    """Extract URL from a Jira URL field (can be string or dict with href)."""
    if not field_value:
        return None
    if isinstance(field_value, str):
        return field_value
    if isinstance(field_value, dict):
        return field_value.get("href") or field_value.get("url")
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

    return {
        "key": issue_key,
        "summary": fields.get("summary", ""),
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


def save_grouped_csv(results: List[Dict], filepath: str) -> None:
    """
    Save results to CSV file grouped by linked issue summary.
    """
    rows = []
    for result in results:
        issue = result["issue"]
        linked = result["linked_issues"]

        if linked:
            # One row per linked issue
            for li in linked:
                row = {
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
                    "Next Election Month": issue.get("next_election_month") or "",
                    "Next Election Year": issue.get("next_election_year") or "",
                    "Last Election Month": issue.get("last_election_month") or "",
                    "Last Election Year": issue.get("last_election_year") or "",
                    "Chair": issue["chair"] or "",
                    "Chair Email": issue["chair_email"] or "",
                    "Chair Affiliation": issue.get("chair_affiliation") or "",
                    "Is Acting Chair": "Yes" if issue.get("is_acting_chair") else "No",
                    "Vice-Chair": issue["vice_chair"] or "",
                    "Vice-Chair Email": issue["vice_chair_email"] or "",
                    "Vice-Chair Affiliation": issue.get("vice_chair_affiliation") or "",
                    "Is Acting Vice-Chair": "Yes" if issue.get("is_acting_vice_chair") else "No",
                    "Linked Issue Summary": li["summary"],
                    "Linked Issue Chair": li["chair"] or "",
                    "Linked Issue Chair Email": li["chair_email"] or "",
                    "Linked Issue Chair Affiliation": li.get("chair_affiliation") or "",
                    "Linked Issue Vice-Chair": li["vice_chair"] or "",
                    "Linked Issue Vice-Chair Email": li["vice_chair_email"] or "",
                    "Linked Issue Vice-Chair Affiliation": li.get("vice_chair_affiliation") or "",
                    "Linked Issue Mailing List": li.get("mailing_list") or "",
                }
                rows.append(row)
        else:
            # Issue with no linked issues
            row = {
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
                "Next Election Month": issue.get("next_election_month") or "",
                "Next Election Year": issue.get("next_election_year") or "",
                "Last Election Month": issue.get("last_election_month") or "",
                "Last Election Year": issue.get("last_election_year") or "",
                "Chair": issue["chair"] or "",
                "Chair Email": issue["chair_email"] or "",
                "Chair Affiliation": issue.get("chair_affiliation") or "",
                "Is Acting Chair": "Yes" if issue.get("is_acting_chair") else "No",
                "Vice-Chair": issue["vice_chair"] or "",
                "Vice-Chair Email": issue["vice_chair_email"] or "",
                "Vice-Chair Affiliation": issue.get("vice_chair_affiliation") or "",
                "Is Acting Vice-Chair": "Yes" if issue.get("is_acting_vice_chair") else "No",
                "Linked Issue Summary": "",
                "Linked Issue Chair": "",
                "Linked Issue Chair Email": "",
                "Linked Issue Chair Affiliation": "",
                "Linked Issue Vice-Chair": "",
                "Linked Issue Vice-Chair Email": "",
                "Linked Issue Vice-Chair Affiliation": "",
                "Linked Issue Mailing List": "",
            }
            rows.append(row)

    # Sort by Linked Issue Summary to group them together
    rows.sort(key=lambda x: (x["Linked Issue Summary"] or "zzz", x["Issue"]))

    # Write CSV
    if rows:
        fieldnames = [
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
        ]
        with open(filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
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
            save_grouped_csv(results, args.save)
        else:
            print("Grouped CSV output requires --save option to specify output file.")
            sys.exit(1)


if __name__ == "__main__":
    main()
