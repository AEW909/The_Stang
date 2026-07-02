import { useEffect, useRef, useState } from "react";

export interface TerminalLine {
  kind: "input" | "output";
  text: string;
}

export function Terminal({
  lines,
  suggestions,
  onSubmit,
  lastMove,
}: {
  lines: TerminalLine[];
  suggestions: string[];
  onSubmit: (raw: string) => void;
  lastMove?: "running" | "walking" | null;
}) {
  const [value, setValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  function submit(text: string) {
    if (!text.trim()) return;
    onSubmit(text);
    setValue("");
    inputRef.current?.focus();
  }

  return (
    <div className="crt-screen terminal">
      <div className="terminal-output" ref={scrollRef}>
        {lines.map((line, i) => (
          <div key={i} className={line.kind === "input" ? "line line-input" : "line line-output"}>
            {line.kind === "input" ? `> ${line.text}` : line.text}
          </div>
        ))}
      </div>
      <div className="suggestions-bar">
        {suggestions.map((s) => (
          <button type="button" key={s} className="suggestion-chip" onClick={() => submit(s)}>
            {s}
          </button>
        ))}
      </div>
      <form
        className="terminal-input-row"
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
      >
        <span className="prompt">&gt;</span>
        <input
          ref={inputRef}
          className="terminal-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />
        {lastMove && <span className={`move-indicator move-indicator-${lastMove}`}>{lastMove}</span>}
      </form>
    </div>
  );
}
