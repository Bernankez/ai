#!/usr/bin/env python3
"""从 Netscape 书签 HTML 文件中提取目录结构，输出为 Markdown 文件。"""

import sys
import re
from html.parser import HTMLParser


class BookmarkDirExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.depth = -1
        self.in_h3 = False
        self._current_title = ""
        self.dirs = []  # list of (depth, name)

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag == "dl":
            self.depth += 1
        elif tag == "h3":
            self.in_h3 = True
            self._current_title = ""

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag == "dl":
            self.depth -= 1
        elif tag == "h3":
            self.in_h3 = False
            self.dirs.append((self.depth, self._current_title.strip()))

    def handle_data(self, data):
        if self.in_h3:
            self._current_title += data


def main():
    if len(sys.argv) < 2:
        print("用法: python extract_bookmarks_dirs.py <书签文件.html> [输出文件.md]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else input_file.rsplit(".", 1)[0] + "_dirs.md"

    with open(input_file, "r", encoding="utf-8") as f:
        html = f.read()

    parser = BookmarkDirExtractor()
    parser.feed(html)

    min_depth = min(d for d, _ in parser.dirs) if parser.dirs else 0
    lines = ["# 书签目录结构\n"]
    for depth, name in parser.dirs:
        level = depth - min_depth
        prefix = "  " * level + "-"
        lines.append(f"{prefix} {name}")

    md = "\n".join(lines) + "\n"

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(md)

    print(f"已提取 {len(parser.dirs)} 个目录 -> {output_file}")


if __name__ == "__main__":
    main()