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

export function CodeEditor({
  value,
  onChange,
  readOnly = false,
  minRows = 25,
}: CodeEditorProps) {
  const [editorState, setEditorState] = useState(() => {
    const contentState = ContentState.createFromText(value || "");

    return EditorState.createWithContent(contentState);
  });
  const editorRef = useRef<Editor>(null);
  const previousValue = useRef(value);
  const isComposingRef = useRef(false);

  // Update editor state when value prop changes
  useEffect(() => {
    // Only update if the value actually changed from outside
    if (value !== previousValue.current) {
      previousValue.current = value;
      const currentContent = editorState.getCurrentContent().getPlainText();

      if (currentContent !== value) {
        const newContentState = ContentState.createFromText(value);
        let newEditorState = EditorState.push(
          editorState,
          newContentState,
          "insert-characters",
        );

        // Determine if we should move focus to end or preserve selection
        const editorHasFocus = editorState.getSelection().getHasFocus();
        const currentLength = currentContent.length;
        const newLength = value.length;

        // Move focus to end if:
        // 1. Editor is not focused (external update while user is elsewhere)
        // 2. Content appears to be a full replacement (significantly different length)
        // 3. Not currently composing input
        const isFullReplacement =
          Math.abs(newLength - currentLength) > 100 || currentLength === 0;

        if (!editorHasFocus || isFullReplacement || !isComposingRef.current) {
          newEditorState = EditorState.moveFocusToEnd(newEditorState);
        } else {
          // Preserve the previous selection when content is incrementally updated
          const previousSelection = editorState.getSelection();

          newEditorState = EditorState.forceSelection(
            newEditorState,
            previousSelection,
          );
        }

        setEditorState(newEditorState);
      }
    }
  }, [value, editorState]);

  const handleChange = (newEditorState: EditorState) => {
    setEditorState(newEditorState);

    if (onChange && !readOnly) {
      const content = newEditorState.getCurrentContent().getPlainText();

      previousValue.current = content;
      onChange(content);
    }
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
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
      role="textbox"
      tabIndex={readOnly ? undefined : 0}
      className={`border border-default-200 rounded-lg p-3 overflow-auto ${
        readOnly
          ? "bg-default-100/50 dark:bg-default-100/30"
          : "bg-default-50 dark:bg-default-100/50 cursor-text"
      }`}
      style={{
        minHeight: `${minHeight}rem`,
        maxHeight: "70vh",
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: "0.875rem",
        lineHeight: "1.5rem",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
      onClick={focusEditor}
      onCompositionEnd={handleCompositionEnd}
      onCompositionStart={handleCompositionStart}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          focusEditor();
        }
      }}
    >
      <Editor
        ref={editorRef}
        editorState={editorState}
        placeholder={readOnly ? "" : "Enter text here..."}
        readOnly={readOnly}
        spellCheck={false}
        onChange={handleChange}
      />
    </div>
  );
}
