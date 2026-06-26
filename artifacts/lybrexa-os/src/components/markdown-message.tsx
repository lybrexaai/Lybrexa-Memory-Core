import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Components } from "react-markdown";

interface MarkdownMessageProps {
  content: string;
  streaming?: boolean;
}

export function MarkdownMessage({ content, streaming }: MarkdownMessageProps) {
  const components: Components = {
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className ?? "");
      const codeString = String(children).replace(/\n$/, "");
      const isBlock = codeString.includes("\n") || match;

      if (isBlock) {
        return (
          <div className="my-3 rounded-lg overflow-hidden border border-white/8 text-xs">
            {match && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border-b border-white/8">
                <span className="font-mono text-[10px] uppercase tracking-widest text-accent/60">{match[1]}</span>
                <div className="flex gap-1 ml-auto">
                  <span className="w-2 h-2 rounded-full bg-white/10" />
                  <span className="w-2 h-2 rounded-full bg-white/10" />
                  <span className="w-2 h-2 rounded-full bg-white/10" />
                </div>
              </div>
            )}
            <SyntaxHighlighter
              style={oneDark}
              language={match?.[1] ?? "text"}
              PreTag="div"
              customStyle={{
                margin: 0,
                borderRadius: 0,
                background: "rgba(0,0,0,0.4)",
                padding: "0.85rem 1rem",
                fontSize: "0.75rem",
                lineHeight: "1.6",
              }}
              codeTagProps={{ style: { fontFamily: "ui-monospace, monospace" } }}
            >
              {codeString}
            </SyntaxHighlighter>
          </div>
        );
      }

      return (
        <code
          className="px-1.5 py-0.5 rounded bg-white/8 border border-white/10 font-mono text-[0.8em] text-accent"
          {...props}
        >
          {children}
        </code>
      );
    },

    p({ children }) {
      return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
    },

    h1({ children }) {
      return <h1 className="text-base font-semibold text-foreground mt-4 mb-2 border-b border-white/8 pb-1">{children}</h1>;
    },
    h2({ children }) {
      return <h2 className="text-sm font-semibold text-foreground mt-3 mb-1.5">{children}</h2>;
    },
    h3({ children }) {
      return <h3 className="text-sm font-medium text-muted-foreground mt-3 mb-1">{children}</h3>;
    },

    ul({ children }) {
      return <ul className="mb-2 pl-4 space-y-1 list-none">{children}</ul>;
    },
    ol({ children }) {
      return <ol className="mb-2 pl-4 space-y-1 list-decimal">{children}</ol>;
    },
    li({ children }) {
      return (
        <li className="flex gap-2 text-sm">
          <span className="text-primary/60 mt-1.5 shrink-0 text-[8px]">▸</span>
          <span>{children}</span>
        </li>
      );
    },

    blockquote({ children }) {
      return (
        <blockquote className="border-l-2 border-primary/40 pl-3 my-2 text-muted-foreground italic text-sm">
          {children}
        </blockquote>
      );
    },

    a({ href, children }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline underline-offset-2 hover:text-accent/80 transition-colors"
        >
          {children}
        </a>
      );
    },

    strong({ children }) {
      return <strong className="font-semibold text-foreground">{children}</strong>;
    },

    em({ children }) {
      return <em className="italic text-muted-foreground">{children}</em>;
    },

    hr() {
      return <hr className="my-3 border-white/8" />;
    },

    table({ children }) {
      return (
        <div className="my-3 overflow-x-auto rounded-lg border border-white/8">
          <table className="w-full text-xs">{children}</table>
        </div>
      );
    },
    thead({ children }) {
      return <thead className="bg-white/5 border-b border-white/8">{children}</thead>;
    },
    th({ children }) {
      return <th className="px-3 py-2 text-left font-mono uppercase tracking-wider text-muted-foreground">{children}</th>;
    },
    td({ children }) {
      return <td className="px-3 py-2 border-t border-white/5 text-foreground">{children}</td>;
    },
  };

  return (
    <div className="text-sm leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
      {streaming && (
        <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle animate-pulse" />
      )}
    </div>
  );
}
