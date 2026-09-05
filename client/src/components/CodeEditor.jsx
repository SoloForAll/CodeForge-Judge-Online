import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { RotateCcw, Play, Send, Sparkles, Check } from 'lucide-react';

// Lightweight intelligent code formatter for competitive programming
function beautifyCode(rawCode, lang) {
  if (!rawCode || typeof rawCode !== 'string') return rawCode;

  if (lang === 'Python') {
    const rawLines = rawCode.replace(/\r\n/g, '\n').split('\n');
    let indent = 0;
    const result = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        if (result.length > 0 && result[result.length - 1] === '') continue;
        result.push('');
        continue;
      }

      // Check dedent keywords in Python
      if (
        trimmed.startsWith('elif ') ||
        trimmed.startsWith('elif(') ||
        trimmed.startsWith('else:') ||
        trimmed.startsWith('except ') ||
        trimmed.startsWith('except:') ||
        trimmed.startsWith('finally:')
      ) {
        indent = Math.max(0, indent - 1);
      }

      // Clean spacing after commas and normalize end of line colon
      const formattedLine = trimmed
        .replace(/\s*,\s*/g, ', ')
        .replace(/\s*:\s*$/, ':');

      result.push('    '.repeat(indent) + formattedLine);

      // If line opens a block
      if (trimmed.endsWith(':')) {
        indent++;
      } else if (
        trimmed.startsWith('return ') ||
        trimmed === 'return' ||
        trimmed.startsWith('raise ') ||
        trimmed === 'break' ||
        trimmed === 'continue' ||
        trimmed === 'pass'
      ) {
        const nextLine = rawLines.slice(i + 1).find((l) => l.trim().length > 0);
        if (nextLine) {
          const originalIndent = (nextLine.match(/^\s*/) || [''])[0].length;
          const currentOriginalIndent = (line.match(/^\s*/) || [''])[0].length;
          if (originalIndent < currentOriginalIndent) {
            indent = Math.max(0, Math.floor(originalIndent / 4));
          }
        }
      }
    }

    return result.join('\n');
  }

  if (lang === 'C++' || lang === 'Java' || lang === 'JavaScript') {
    const rawLines = rawCode.replace(/\r\n/g, '\n').split('\n');
    let indent = 0;
    const result = [];

    for (let line of rawLines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (result.length > 0 && result[result.length - 1] === '') continue;
        result.push('');
        continue;
      }

      const leadingCloses = (trimmed.match(/^(\s*\})+/) || [''])[0].replace(/\s+/g, '').length;
      if (leadingCloses > 0) {
        indent = Math.max(0, indent - leadingCloses);
      }

      let formattedLine = trimmed
        .replace(/\s*,\s*/g, ', ')
        .replace(/\s*;\s*/g, '; ');

      if (formattedLine.endsWith('; ')) {
        formattedLine = formattedLine.slice(0, -1);
      }

      result.push('    '.repeat(indent) + formattedLine);

      const opens = (trimmed.match(/\{/g) || []).length;
      const closes = (trimmed.match(/\}/g) || []).length;
      indent = Math.max(0, indent + opens - (closes - leadingCloses));
    }

    return result.join('\n');
  }

  return rawCode;
}


export const STARTER_TEMPLATES = {
  JavaScript: `const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim();

function solve() {
  if (!input) return;
  const lines = input.split('\\n');
  
  // Write your solution here
}

solve();
`,
  Python: `import sys

def solve():
    raw_input = sys.stdin.read().strip()
    if not raw_input:
        return
    lines = raw_input.split()
    
    # Write your solution here

if __name__ == '__main__':
    solve()
`,
  'C++': `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <unordered_map>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // Read standard input and solve problem

    return 0;
}
`,
  Java: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String line = br.readLine();
        if (line == null) return;
        
        // Write your solution here
    }
}
`
};

const MONACO_LANGUAGES = {
  JavaScript: 'javascript',
  Python: 'python',
  'C++': 'cpp',
  Java: 'java'
};

const FILE_NAMES = {
  JavaScript: 'solution.js',
  Python: 'solution.py',
  'C++': 'solution.cpp',
  Java: 'Main.java'
};

export function CodeEditor({
  problemSlug,
  language,
  onLanguageChange,
  code,
  onChange,
  onRunCode,
  onSubmit,
  isPending
}) {
  const editorRef = useRef(null);

  // Load saved draft on problem or language change
  useEffect(() => {
    if (!problemSlug) return;
    const storageKey = `codeforge_draft_${problemSlug}_${language}`;
    const savedDraft = localStorage.getItem(storageKey);
    if (savedDraft) {
      onChange(savedDraft);
    } else {
      onChange(STARTER_TEMPLATES[language] || '// Write your code here');
    }
  }, [problemSlug, language]);

  const handleCodeChange = (newCode) => {
    onChange(newCode || '');
    if (problemSlug) {
      localStorage.setItem(`codeforge_draft_${problemSlug}_${language}`, newCode || '');
    }
  };

  const [formattedFeedback, setFormattedFeedback] = useState(false);
  const [resetFeedback, setResetFeedback] = useState(false);

  const handleReset = () => {
    const template = STARTER_TEMPLATES[language] || '// Write your solution here\n';
    if (editorRef.current) {
      editorRef.current.setValue(template);
    }
    onChange(template);
    if (problemSlug) {
      localStorage.setItem(`codeforge_draft_${problemSlug}_${language}`, template);
    }
    setResetFeedback(true);
    setTimeout(() => setResetFeedback(false), 1200);
  };

  const handleFormatCode = () => {
    if (!editorRef.current) return;

    if (language === 'JavaScript') {
      try {
        const action = editorRef.current.getAction('editor.action.formatDocument');
        if (action) action.run();
      } catch {}
    }

    const currentVal = editorRef.current.getValue();
    const formatted = beautifyCode(currentVal, language);
    if (formatted && formatted !== currentVal) {
      editorRef.current.setValue(formatted);
      onChange(formatted);
      if (problemSlug) {
        localStorage.setItem(`codeforge_draft_${problemSlug}_${language}`, formatted);
      }
    }

    setFormattedFeedback(true);
    setTimeout(() => setFormattedFeedback(false), 1500);
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Add Ctrl+Enter shortcut for Run Code
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunCode?.();
    });

    // Add Ctrl+Shift+Enter shortcut for Submit
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
      onSubmit?.();
    });

    // Add Alt+Shift+F for Format Document
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      handleFormatCode();
    });
  };

  return (
    <div className="editor-container">
      <div className="editor-top">
        <div className="editor-lang-picker">
          <select
            aria-label="Programming language"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
          >
            <option>JavaScript</option>
            <option>Python</option>
            <option>C++</option>
            <option>Java</option>
          </select>
          <span className="file-badge">{FILE_NAMES[language]}</span>
        </div>

        <div className="editor-top-actions">
          <button
            className={`linkbutton format-btn ${formattedFeedback ? 'active' : ''}`}
            title="Auto-format code (Shift+Alt+F)"
            onClick={handleFormatCode}
          >
            {formattedFeedback ? (
              <>
                <Check size={13} style={{ color: '#22c55e' }} /> Formatted!
              </>
            ) : (
              <>
                <Sparkles size={13} /> Format
              </>
            )}
          </button>
          <button
            className="linkbutton reset-btn"
            title="Reset code to default template"
            onClick={handleReset}
          >
            <RotateCcw size={13} className={resetFeedback ? 'icon-spin' : ''} />
            {resetFeedback ? 'Reset!' : 'Reset'}
          </button>
        </div>
      </div>


      <div className="monaco-wrapper">
        <Editor
          height="100%"
          language={MONACO_LANGUAGES[language] || 'javascript'}
          theme="vs-dark"
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorDidMount}
          loading={<div className="loading-editor">Loading Monaco Editor...</div>}
          options={{
            fontSize: 14,
            fontFamily: "'DM Mono', Consolas, 'Courier New', monospace",
            lineNumbers: 'on',
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: language === 'Python' || language === 'C++' ? 4 : 2,
            bracketPairColorization: { enabled: true },
            formatOnPaste: true,
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            padding: { top: 12, bottom: 12 }
          }}
        />
      </div>
    </div>
  );
}

