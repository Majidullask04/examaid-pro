import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Parse and render markdown content
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let tableHeaders: string[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let listItems: { level: number; content: string; type: 'ul' | 'ol' }[] = [];

    const processInlineFormatting = (line: string): JSX.Element[] => {
      const parts: JSX.Element[] = [];
      let remaining = line;
      let key = 0;

      // Process bold, italic, code, and links
      const regex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(remaining)) !== null) {
        // Add text before match
        if (match.index > lastIndex) {
          parts.push(<span key={key++}>{remaining.slice(lastIndex, match.index)}</span>);
        }

        if (match[1]) {
          // Bold
          parts.push(<strong key={key++} className="font-bold text-foreground">{match[2]}</strong>);
        } else if (match[3]) {
          // Italic
          parts.push(<em key={key++} className="italic">{match[4]}</em>);
        } else if (match[5]) {
          // Inline code
          parts.push(
            <code key={key++} className="px-1.5 py-0.5 rounded bg-muted text-foreground text-sm font-mono">
              {match[6]}
            </code>
          );
        } else if (match[7]) {
          // Link
          parts.push(
            <a key={key++} href={match[9]} className="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer">
              {match[8]}
            </a>
          );
        }

        lastIndex = match.index + match[0].length;
      }

      // Add remaining text
      if (lastIndex < remaining.length) {
        parts.push(<span key={key++}>{remaining.slice(lastIndex)}</span>);
      }

      return parts.length > 0 ? parts : [<span key={0}>{line}</span>];
    };

    const flushList = () => {
      if (listItems.length > 0) {
        const isOrdered = listItems[0].type === 'ol';
        const ListTag = isOrdered ? 'ol' : 'ul';
        elements.push(
          <ListTag key={elements.length} className={`${isOrdered ? 'list-decimal' : 'list-disc'} list-inside space-y-1 my-2 text-foreground`}>
            {listItems.map((item, i) => (
              <li key={i} className="text-foreground leading-relaxed" style={{ marginLeft: `${item.level * 16}px` }}>
                {processInlineFormatting(item.content)}
              </li>
            ))}
          </ListTag>
        );
        listItems = [];
      }
    };

    const flushTable = () => {
      if (tableHeaders.length > 0 || tableRows.length > 0) {
        elements.push(
          <div key={elements.length} className="overflow-x-auto my-4">
            <table className="w-full border-collapse border border-border rounded-lg text-sm">
              {tableHeaders.length > 0 && (
                <thead className="bg-muted/50">
                  <tr>
                    {tableHeaders.map((header, i) => (
                      <th key={i} className="border border-border px-3 py-2 text-left font-semibold text-foreground">
                        {processInlineFormatting(header.trim())}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {tableRows.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    {row.map((cell, j) => (
                      <td key={j} className="border border-border px-3 py-2 text-foreground">
                        {processInlineFormatting(cell.trim())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableHeaders = [];
        tableRows = [];
        inTable = false;
      }
    };

    lines.forEach((line, index) => {
      // Code block handling
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={elements.length} className="my-3 rounded-lg overflow-hidden bg-muted p-3">
              <code className="text-foreground text-sm font-mono whitespace-pre-wrap">
                {codeBlockContent.join('\n')}
              </code>
            </pre>
          );
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          flushList();
          flushTable();
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      // Table handling
      if (line.includes('|') && line.trim().startsWith('|')) {
        flushList();
        const cells = line.split('|').filter(cell => cell.trim() !== '');
        
        // Check if it's a separator row
        if (cells.every(cell => cell.trim().match(/^[-:]+$/))) {
          inTable = true;
          return;
        }

        if (!inTable && tableHeaders.length === 0) {
          tableHeaders = cells;
        } else {
          tableRows.push(cells);
        }
        return;
      } else if (inTable || tableHeaders.length > 0) {
        flushTable();
      }

      // Headers
      if (line.startsWith('#### ')) {
        flushList();
        elements.push(
          <h4 key={elements.length} className="text-base font-semibold text-foreground mt-3 mb-1">
            {processInlineFormatting(line.slice(5))}
          </h4>
        );
        return;
      }
      if (line.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={elements.length} className="text-lg font-semibold text-foreground mt-4 mb-2">
            {processInlineFormatting(line.slice(4))}
          </h3>
        );
        return;
      }
      if (line.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={elements.length} className="text-xl font-bold text-foreground mt-5 mb-2">
            {processInlineFormatting(line.slice(3))}
          </h2>
        );
        return;
      }
      if (line.startsWith('# ')) {
        flushList();
        elements.push(
          <h1 key={elements.length} className="text-2xl font-bold text-foreground mt-6 mb-3 pb-2 border-b border-border">
            {processInlineFormatting(line.slice(2))}
          </h1>
        );
        return;
      }

      // Horizontal rule
      if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
        flushList();
        elements.push(<hr key={elements.length} className="my-4 border-border" />);
        return;
      }

      // Blockquote
      if (line.startsWith('> ')) {
        flushList();
        elements.push(
          <blockquote key={elements.length} className="border-l-4 border-primary pl-4 my-3 italic text-muted-foreground">
            {processInlineFormatting(line.slice(2))}
          </blockquote>
        );
        return;
      }

      // Unordered list
      const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)/);
      if (ulMatch) {
        const level = Math.floor(ulMatch[1].length / 2);
        listItems.push({ level, content: ulMatch[2], type: 'ul' });
        return;
      }

      // Ordered list
      const olMatch = line.match(/^(\s*)(\d+)\.\s+(.+)/);
      if (olMatch) {
        const level = Math.floor(olMatch[1].length / 2);
        listItems.push({ level, content: olMatch[3], type: 'ol' });
        return;
      }

      // Flush any pending list
      flushList();

      // Empty line
      if (line.trim() === '') {
        return;
      }

      // Regular paragraph
      elements.push(
        <p key={elements.length} className="my-2 leading-relaxed text-foreground">
          {processInlineFormatting(line)}
        </p>
      );
    });

    // Flush any remaining content
    flushList();
    flushTable();

    return elements;
  };

  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      {renderMarkdown(content)}
    </div>
  );
}
