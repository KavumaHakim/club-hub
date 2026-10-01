// Monaco themes on the ch-* ground so editors sit flush with the Split shell.
// Pass defineSplitThemes to <Editor beforeMount>, and splitEditorTheme(theme) as its theme.
export const defineSplitThemes = (monaco: any) => {
    monaco.editor.defineTheme('ch-dark', {
        base: 'vs-dark', inherit: true, rules: [],
        colors: {
            'editor.background': '#141312',
            'editorGutter.background': '#1e1c1b',
            'editor.lineHighlightBackground': '#1e1c1b',
            'editorLineNumber.foreground': '#6f6b69',
            'editorLineNumber.activeForeground': '#f472b6',
            'editorCursor.foreground': '#f472b6',
            'editor.selectionBackground': '#ec489940',
        },
    });
    monaco.editor.defineTheme('ch-light', {
        base: 'vs', inherit: true, rules: [],
        colors: {
            'editor.background': '#f3f2f2',
            'editorGutter.background': '#eae9e9',
            'editor.lineHighlightBackground': '#eae9e9',
            'editorLineNumber.foreground': '#8f8b89',
            'editorLineNumber.activeForeground': '#db2777',
            'editorCursor.foreground': '#db2777',
            'editor.selectionBackground': '#db277726',
        },
    });
};

export const splitEditorTheme = (theme: 'light' | 'dark') => (theme === 'dark' ? 'ch-dark' : 'ch-light');
