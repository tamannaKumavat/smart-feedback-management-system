import React from "react";

function parseInline(text, keyPrefix) {
  const nodes = [];
  let index = 0;

  while (index < text.length) {
    if (text.startsWith("**", index)) {
      const end = text.indexOf("**", index + 2);
      if (end !== -1) {
        nodes.push(
          <strong key={`${keyPrefix}-strong-${index}`}>
            {text.slice(index + 2, end)}
          </strong>,
        );
        index = end + 2;
        continue;
      }
    }

    if (text[index] === "`") {
      const end = text.indexOf("`", index + 1);
      if (end !== -1) {
        nodes.push(
          <code key={`${keyPrefix}-code-${index}`}>
            {text.slice(index + 1, end)}
          </code>,
        );
        index = end + 1;
        continue;
      }
    }

    const nextBold = text.indexOf("**", index);
    const nextCode = text.indexOf("`", index);
    const nextStops = [nextBold, nextCode].filter((pos) => pos !== -1);
    const next = nextStops.length ? Math.min(...nextStops) : text.length;
    nodes.push(text.slice(index, next));
    index = next;
  }

  return nodes;
}

function renderParagraph(lines, key) {
  return (
    <p key={key}>
      {lines.map((line, index) => (
        <React.Fragment key={`${key}-line-${index}`}>
          {index > 0 ? <br /> : null}
          {parseInline(line, `${key}-${index}`)}
        </React.Fragment>
      ))}
    </p>
  );
}

export default function MarkdownMessage({ children, className = "" }) {
  const text = String(children ?? "").replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  const blocks = [];
  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(renderParagraph(paragraph, `p-${blocks.length}`));
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    const Tag = list.type === "ol" ? "ol" : "ul";
    blocks.push(
      <Tag key={`list-${blocks.length}`}>
        {list.items.map((item, index) => (
          <li key={`item-${index}`}>{parseInline(item, `li-${index}`)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(heading[1].length, 6);
      const Tag = `h${level}`;
      blocks.push(
        <Tag key={`heading-${blocks.length}`}>
          {parseInline(heading[2], `heading-${blocks.length}`)}
        </Tag>,
      );
      continue;
    }

    const unordered = /^[-*]\s+(.+)$/.exec(line);
    if (unordered) {
      flushParagraph();
      if (!list || list.type !== "ul") {
        flushList();
        list = { type: "ul", items: [] };
      }
      list.items.push(unordered[1]);
      continue;
    }

    const ordered = /^\d+[.)]\s+(.+)$/.exec(line);
    if (ordered) {
      flushParagraph();
      if (!list || list.type !== "ol") {
        flushList();
        list = { type: "ol", items: [] };
      }
      list.items.push(ordered[1]);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return <div className={`markdown-message ${className}`}>{blocks}</div>;
}
