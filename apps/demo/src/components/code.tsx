import * as React from "react"
import { CheckIcon, CopyIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/* A tiny TS/TSX highlighter — enough for short snippets, no dependency. */

const KEYWORDS = new Set([
  "const",
  "let",
  "await",
  "async",
  "return",
  "if",
  "else",
  "function",
  "export",
  "import",
  "from",
  "type",
  "new",
  "null",
  "true",
  "false",
  "void",
  "typeof",
  "try",
  "catch",
  "finally",
  "switch",
  "case",
  "throw",
])

type Token = { kind: string; text: string }

const PATTERN =
  /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(<\/?[A-Z][\w.]*|<\/?[a-z][\w-]*)|([A-Za-z_$][\w$]*)(?=\s*[<(])|([A-Za-z_$][\w$]*)|(\d+)|(\s+)|([^\s\w])/g

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  for (const match of source.matchAll(PATTERN)) {
    const [text, comment, string, tag, call, word, number] = match
    if (comment) tokens.push({ kind: "comment", text })
    else if (string) tokens.push({ kind: "string", text })
    else if (tag) tokens.push({ kind: "tag", text })
    else if (call)
      tokens.push({ kind: KEYWORDS.has(call) ? "keyword" : "call", text })
    else if (word) {
      tokens.push({
        kind: KEYWORDS.has(word)
          ? "keyword"
          : /^[A-Z]/.test(word)
            ? "type"
            : "plain",
        text,
      })
    } else if (number) tokens.push({ kind: "number", text })
    else tokens.push({ kind: "plain", text })
  }
  return tokens
}

const TOKEN_CLASS: Record<string, string> = {
  comment: "text-muted-foreground italic",
  string: "text-resolved",
  keyword: "text-[oklch(0.55_0.2_300)] dark:text-[oklch(0.78_0.14_300)]",
  call: "text-[oklch(0.5_0.17_255)] dark:text-[oklch(0.78_0.12_250)]",
  tag: "text-[oklch(0.5_0.17_255)] dark:text-[oklch(0.78_0.12_250)]",
  type: "text-pending",
  number: "text-pending",
  plain: "",
}

export function Code({
  code,
  className,
  copyable = true,
}: {
  code: string
  className?: string
  copyable?: boolean
}) {
  const tokens = React.useMemo(() => tokenize(code.trim()), [code])

  return (
    <div className={cn("group/code relative min-w-0", className)}>
      <pre className="overflow-x-auto rounded-lg bg-muted/50 p-4 pr-10 font-mono text-[13px] leading-6 ring-1 ring-foreground/5">
        <code>
          {tokens.map((token, index) => (
            <span key={index} className={TOKEN_CLASS[token.kind]}>
              {token.text}
            </span>
          ))}
        </code>
      </pre>
      {copyable ? (
        <CopyButton text={code.trim()} className="absolute top-2 right-2" />
      ) : null}
    </div>
  )
}

export function CopyButton({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const [copied, setCopied] = React.useState(false)

  React.useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => setCopied(true))
      }}
      aria-label={copied ? "Copied" : "Copy code"}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-3.5",
        className
      )}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  )
}
