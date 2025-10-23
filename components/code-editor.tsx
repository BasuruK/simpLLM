"use client";

import { useEffect, useRef, useState } from "react";
import { Editor, EditorState, ContentState } from "draft-js";
import "draft-js/dist/Draft.css";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  minRows?: number;
}

export function CodeEditor({ value, onChange, readOnly = false, minRows = 25 }: CodeEditorProps) {
  const [editorState, setEditorState] = useState(() => EditorState.createEmpty());
  const editorRef = useRef<Editor>(null);
  const previousValue = useRef(value);

  // Update editor state when value prop changes
  useEffect(() => {
    // Only update if the value actually changed from outside
    if (value !== previousValue.current) {
      previousValue.current = value;
      const currentContent = editorState.getCurrentContent().getPlainText();
      
      if (currentContent !== value) {
        const newContentState = ContentState.createFromText(value);
        const newEditorState = EditorState.push(
          editorState,
          newContentState,
          'insert-characters'
        );
        setEditorState(EditorState.moveFocusToEnd(newEditorState));
      }
    }
  }, [value]);

  const handleChange = (newEditorState: EditorState) => {
    setEditorState(newEditorState);
    
    if (onChange && !readOnly) {
      const content = newEditorState.getCurrentContent().getPlainText();
      previousValue.current = content;
      onChange(content);
    }
  };

  const focusEditor = () => {
    if (!readOnly) {
      editorRef.current?.focus();
    }
  };

  // Calculate min height based on rows
  const minHeight = minRows * 1.5 + 1; // Approximate line height in rem

  return (
    <div
      onClick={focusEditor}
      className={`border border-default-200 rounded-lg p-3 overflow-auto ${
        readOnly ? 'bg-default-100/50 dark:bg-default-100/30' : 'bg-default-50 dark:bg-default-100/50 cursor-text'
      }`}
      style={{
        minHeight: `${minHeight}rem`,
        maxHeight: '70vh',
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: '0.875rem',
        lineHeight: '1.5rem',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      <Editor
        ref={editorRef}
        editorState={editorState}
        onChange={handleChange}
        readOnly={readOnly}
        placeholder={readOnly ? "" : "Enter text here..."}
        spellCheck={false}
      />
    </div>
  );
}
