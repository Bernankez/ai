#!/usr/bin/env python3
"""
Create a new GitHub Stars List via the GitHub GraphQL API.

Usage:
    python create_list.py --token "$GITHUB_TOKEN" \
        --name "🎮 Game Development" \
        --description "Game engines, frameworks, and dev tooling"

Requires a Classic Personal Access Token with the `user` scope.
"""
import argparse
import json
import sys
import urllib.request
import urllib.error

GRAPHQL_URL = "https://api.github.com/graphql"

CREATE_LIST_MUTATION = """
mutation CreateUserList($name: String!, $description: String!) {
  createUserList(input: { name: $name, description: $description }) {
    list {
      id
      name
      slug
    }
  }
}
"""

def graphql(token: str, query: str, variables: dict) -> dict:
    payload = json.dumps({"query": query, "variables": variables}).encode()
    req = urllib.request.Request(
        GRAPHQL_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"HTTP {e.code}: {body}", file=sys.stderr)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Create a GitHub Stars List.")
    parser.add_argument("--token", required=True, help="GitHub Personal Access Token (user scope).")
    parser.add_argument("--name", required=True, help="List name including emoji, e.g. '🎮 Game Development'.")
    parser.add_argument("--description", required=True, help="One-sentence description of the list.")
    args = parser.parse_args()

    result = graphql(args.token, CREATE_LIST_MUTATION, {
        "name": args.name,
        "description": args.description,
    })

    if "errors" in result:
        for err in result["errors"]:
            print(f"Error: {err['message']}", file=sys.stderr)
        sys.exit(1)

    list_data = result["data"]["createUserList"]["list"]
    if not list_data:
        print("Error: List creation returned null. The name may already be taken.", file=sys.stderr)
        sys.exit(1)

    print(json.dumps(list_data, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
