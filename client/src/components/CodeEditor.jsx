import React, { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { RotateCcw, Play, Send } from 'lucide-react';

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

  const handleReset = () => {
    if (window.confirm('Reset editor to default starter template?')) {
      const template = STARTER_TEMPLATES[language] || '';
      onChange(template);
      if (problemSlug) {
        localStorage.setItem(`codeforge_draft_${problemSlug}_${language}`, template);
      }
    }
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
            className="linkbutton reset-btn"
            title="Reset code to default template"
            onClick={handleReset}
          >
            <RotateCcw size={14} /> Reset
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

