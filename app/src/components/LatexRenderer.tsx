import React, { useMemo } from 'react';
import katex from 'katex';

interface LatexRendererProps {
  content: string;
  className?: string;
}

/**
 * Custom SVG Diagrams for the two problems in Big Beautiful Shortlist v2.1
 * that include \begin{asy} blocks (2023 C3 and 2023 C6).
 */
const AsyDiagram: React.FC<{ code: string }> = ({ code }) => {
  const isJapaneseTriangle = code.includes('lightred') || code.includes('unitcircle');
  const isGridPaths = code.includes('miterjoin') || code.includes('(5,-5)');

  if (isJapaneseTriangle) {
    // 2023 C3: n = 6 Japanese triangle with red circles at t = {0, 0, 2, 2, 3, 0}
    // and ninja path (0,0)->(1,1)->(2,1)->(3,2)->(4,2)->(5,2)
    const redIndices = [0, 0, 2, 2, 3, 0];
    const pathCols = [0, 1, 1, 2, 2, 2];
    const rowStepY = 30;
    const colStepX = 34;
    const centerX = 130;
    const startY = 26;

    const getCoords = (row: number, col: number) => ({
      x: centerX - (row * colStepX) / 2 + col * colStepX,
      y: startY + row * rowStepY,
    });

    const pathPoints = pathCols.map((col, row) => getCoords(row, col));
    const polylinePoints = pathPoints.map((p) => `${p.x},${p.y}`).join(' ');

    return (
      <div className="my-4 flex flex-col items-center justify-center">
        <svg
          width="260"
          height="220"
          viewBox="0 0 260 220"
          className="overflow-visible text-slate-800 dark:text-slate-200"
        >
          {/* Ninja path connecting line */}
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Triangle of circles */}
          {Array.from({ length: 6 }).map((_, r) =>
            Array.from({ length: r + 1 }).map((__, c) => {
              const { x, y } = getCoords(r, c);
              const isRed = redIndices[r] === c;
              const isOnPath = pathCols[r] === c;
              return (
                <circle
                  key={`${r}-${c}`}
                  cx={x}
                  cy={y}
                  r={10}
                  fill={isRed ? '#f87171' : '#ffffff'}
                  stroke={isOnPath ? '#0f172a' : '#64748b'}
                  strokeWidth={isOnPath ? '2.5' : '1.5'}
                  className={isRed ? '' : 'dark:fill-slate-800 dark:stroke-slate-400'}
                />
              );
            })
          )}
          {/* Bottom dimension arrow for n = 6 */}
          <line
            x1={35}
            y1={200}
            x2={225}
            y2={200}
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <polygon points="35,200 42,196 42,204" fill="currentColor" />
          <polygon points="225,200 218,196 218,204" fill="currentColor" />
          <text
            x="130"
            y="216"
            textAnchor="middle"
            className="fill-current text-xs font-serif italic"
          >
            n = 6
          </text>
        </svg>
      </div>
    );
  }

  if (isGridPaths) {
    // 2023 C6: 5x5 grid partitioned into 5 paths
    const scale = 32;
    const pad = 16;
    const toSvg = (x: number, y: number) => `${pad + x * scale},${pad + -y * scale}`;
    const poly = (pts: [number, number][]) => pts.map(([x, y]) => toSvg(x, y)).join(' ');

    return (
      <div className="my-4 flex flex-col items-center justify-center">
        <svg
          width={5 * scale + pad * 2}
          height={5 * scale + pad * 2}
          viewBox={`0 0 ${5 * scale + pad * 2} ${5 * scale + pad * 2}`}
          className="text-slate-900 dark:text-slate-100"
        >
          {/* Inner thin grid lines */}
          {[1, 2, 3, 4].map((i) => (
            <React.Fragment key={i}>
              <line
                x1={pad + i * scale}
                y1={pad}
                x2={pad + i * scale}
                y2={pad + 5 * scale}
                stroke="currentColor"
                strokeOpacity="0.25"
                strokeWidth="1"
              />
              <line
                x1={pad}
                y1={pad + i * scale}
                x2={pad + 5 * scale}
                y2={pad + i * scale}
                stroke="currentColor"
                strokeOpacity="0.25"
                strokeWidth="1"
              />
            </React.Fragment>
          ))}
          {/* Outer border */}
          <rect
            x={pad}
            y={pad}
            width={5 * scale}
            height={5 * scale}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          {/* Thick partition walls from the Asymptote script */}
          <polyline
            points={poly([
              [0, -1],
              [3, -1],
              [3, -2],
              [1, -2],
              [1, -4],
              [4, -4],
              [4, -3],
              [2, -3],
              [2, -2],
            ])}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          <polyline
            points={poly([
              [3, 0],
              [3, -1],
            ])}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <polyline
            points={poly([
              [1, -4],
              [1, -5],
            ])}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <polyline
            points={poly([
              [4, -3],
              [4, -1],
              [5, -1],
            ])}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="miter"
          />
        </svg>
      </div>
    );
  }

  return null;
};

/**
 * Renders inline math and LaTeX prose formatting within a block of text (no block-level lists).
 */
function renderMathAndFormatting(raw: string): string {
  let text = raw;

  // Normalize align* and eqnarray* into $$ \begin{aligned} ... \end{aligned} $$
  text = text.replace(
    /\\begin\{(align\*|eqnarray\*)\}([\s\S]*?)\\end\{\1\}/g,
    (_, _env, inner) => {
      // eqnarray uses & = & sometimes, normalize if needed
      return `$$\\begin{aligned}${inner}\\end{aligned}$$`;
    }
  );

  // Normalize \[ ... \] to $$ ... $$
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `$$${inner}$$`);

  // Normalize \( ... \) to $ ... $
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => `$${inner}$`);

  // Tokenize math blocks so we don't accidentally apply text replacements inside math
  const mathBlocks: { display: boolean; math: string }[] = [];

  // Extract display math $$ ... $$
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    const id = mathBlocks.length;
    mathBlocks.push({ display: true, math: math.trim() });
    return `@@MATH_BLOCK_${id}@@`;
  });

  // Extract inline math $ ... $
  text = text.replace(/\$([^\$]+?)\$/g, (_, math) => {
    const id = mathBlocks.length;
    mathBlocks.push({ display: false, math: math.trim() });
    return `@@MATH_BLOCK_${id}@@`;
  });

  // Escape raw HTML characters in prose
  text = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Remove \begin{center} and \end{center} wrappers
  text = text.replace(/\\begin\{center\}/g, '<div class="text-center my-2">');
  text = text.replace(/\\end\{center\}/g, '</div>');

  // Handle \href{url}{label}
  text = text.replace(
    /\\href\{([^}]+)\}\{([^}]+)\}/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-indigo-600 dark:text-indigo-400 underline hover:opacity-80">$2</a>'
  );

  // Handle nested or simple \textbf, \textit, \emph, \underline, \textsc
  // Apply twice to support nesting like \textbf{\textit{...}}
  for (let pass = 0; pass < 2; pass++) {
    text = text.replace(/\\textbf\{([^{}]*)\}/g, '<strong>$1</strong>');
    text = text.replace(/\\textit\{([^{}]*)\}/g, '<em>$1</em>');
    text = text.replace(/\\emph\{([^{}]*)\}/g, '<em>$1</em>');
    text = text.replace(/\\underline\{([^{}]*)\}/g, '<span class="underline">$1</span>');
    text = text.replace(/\\textsc\{([^{}]*)\}/g, '<span class=" uppercase tracking-wider text-xs font-semibold">$1</span>');
    text = text.replace(/\\text\{([^{}]*)\}/g, '$1');
  }

  // Handle LaTeX special prose symbols
  text = text
    .replace(/``/g, '“')
    .replace(/''/g, '”')
    .replace(/---/g, '—')
    .replace(/--/g, '–')
    .replace(/\\ldots/g, '…')
    .replace(/\\dots/g, '…')
    .replace(/\\noindent\b\s*/g, '')
    .replace(/\\normalsize\b\s*/g, '')
    .replace(/\\newpage\b\s*/g, '')
    .replace(/\\vspace\*?\{[^}]*\}/g, '')
    .replace(/\\hspace\*?\{[^}]*\}/g, ' ')
    .replace(/\\,/g, '&#8239;')
    .replace(/~/g, '&nbsp;')
    .replace(/\\&/g, '&amp;')
    .replace(/\\%/g, '%')
    .replace(/\\#/g, '#')
    .replace(/\\_/g, '_');

  // Convert double newlines to paragraph breaks
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const htmlWithPlaceholders =
    paragraphs.length > 1
      ? paragraphs.map((p) => `<p class="mb-3 last:mb-0">${p.replace(/\\\\/g, '<br/>')}</p>`).join('')
      : text.replace(/\\\\/g, '<br/>');

  // Restore math blocks and render with KaTeX
  return htmlWithPlaceholders.replace(/@@MATH_BLOCK_(\d+)@@/g, (_, idxStr) => {
    const block = mathBlocks[Number(idxStr)];
    if (!block) return '';
    try {
      // Clean minor LaTeX macros that KaTeX might complain about if any
      const cleanedMath = block.math
        .replace(/\\mbox\{/g, '\\text{')
        .replace(/\\bold\{/g, '\\mathbf{');

      return katex.renderToString(cleanedMath, {
        displayMode: block.display,
        throwOnError: false,
        trust: true,
        strict: false,
      });
    } catch {
      return `<code>${block.math}</code>`;
    }
  });
}

interface ParsedSegment {
  type: 'prose' | 'enumerate' | 'itemize' | 'asy';
  content: string;
  items?: { label?: string; body: string }[];
  enumStyle?: string;
}

/**
 * Splits a LaTeX problem statement into prose, enumerate, itemize, and asy segments.
 */
function parseSegments(statement: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  // Match \begin{asy}...\end{asy}, \begin{enumerate}...\end{enumerate}, or \begin{itemize}...\end{itemize}
  const blockRegex = /\\begin\{(asy|enumerate|itemize)\}(?:\[([^\]]*)\])?([\s\S]*?)\\end\{\1\}/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(statement)) !== null) {
    if (match.index > lastIndex) {
      const before = statement.slice(lastIndex, match.index).trim();
      if (before) {
        segments.push({ type: 'prose', content: before });
      }
    }

    const envType = match[1] as 'asy' | 'enumerate' | 'itemize';
    const optArg = match[2] || '';
    const innerContent = match[3] || '';

    if (envType === 'asy') {
      segments.push({ type: 'asy', content: innerContent.trim() });
    } else {
      // Parse \item or \item[...] inside the list
      const itemParts = innerContent.split(/\\item(?=\s|\[)/);
      const parsedItems: { label?: string; body: string }[] = [];

      for (const part of itemParts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const optMatch = trimmed.match(/^\[([^\]]*)\]\s*([\s\S]*)$/);
        if (optMatch) {
          let customLabel = optMatch[1].trim();
          // Strip $\bullet$ if it's just a standard bullet
          if (customLabel === '$\\bullet$' || customLabel === '\\bullet') {
            customLabel = '';
          }
          parsedItems.push({
            label: customLabel,
            body: optMatch[2].trim(),
          });
        } else {
          parsedItems.push({
            body: trimmed,
          });
        }
      }

      segments.push({
        type: envType,
        content: innerContent,
        items: parsedItems,
        enumStyle: optArg,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < statement.length) {
    const rem = statement.slice(lastIndex).trim();
    if (rem) {
      segments.push({ type: 'prose', content: rem });
    }
  }

  return segments;
}

export const LatexRenderer: React.FC<LatexRendererProps> = ({ content, className = '' }) => {
  const segments = useMemo(() => parseSegments(content), [content]);

  return (
    <div className={`latex-content leading-relaxed ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.type === 'asy') {
          return <AsyDiagram key={idx} code={seg.content} />;
        }

        if (seg.type === 'enumerate' && seg.items) {
          return (
            <ol key={idx} className="my-3 ml-5 space-y-2 list-none">
              {seg.items.map((item, i) => {
                // Determine label (a), (b) or (i), (ii) or 1., 2.
                let defaultLabel = `(${String.fromCharCode(97 + i)})`;
                if (seg.enumStyle?.includes('i') || seg.enumStyle?.includes('roman')) {
                  const romans = ['i', 'ii', 'iii', 'iv', 'v', 'vi'];
                  defaultLabel = `(${romans[i] || i + 1})`;
                } else if (seg.enumStyle?.includes('1')) {
                  defaultLabel = `${i + 1}.`;
                }
                const labelHtml = item.label
                  ? renderMathAndFormatting(item.label)
                  : defaultLabel;

                return (
                  <li key={i} className="flex items-baseline gap-2.5">
                    <span
                      className="font-semibold text-slate-600 dark:text-slate-400 shrink-0 select-none text-sm"
                      dangerouslySetInnerHTML={{ __html: labelHtml }}
                    />
                    <div
                      className="flex-1 min-w-0"
                      dangerouslySetInnerHTML={{ __html: renderMathAndFormatting(item.body) }}
                    />
                  </li>
                );
              })}
            </ol>
          );
        }

        if (seg.type === 'itemize' && seg.items) {
          return (
            <ul key={idx} className="my-3 ml-5 space-y-2 list-disc marker:text-slate-400">
              {seg.items.map((item, i) => (
                <li key={i} className="pl-1">
                  {item.label ? (
                    <span
                      className="font-semibold mr-2"
                      dangerouslySetInnerHTML={{ __html: renderMathAndFormatting(item.label) }}
                    />
                  ) : null}
                  <span
                    dangerouslySetInnerHTML={{ __html: renderMathAndFormatting(item.body) }}
                  />
                </li>
              ))}
            </ul>
          );
        }

        return (
          <div
            key={idx}
            className="mb-3 last:mb-0"
            dangerouslySetInnerHTML={{ __html: renderMathAndFormatting(seg.content) }}
          />
        );
      })}
    </div>
  );
};
