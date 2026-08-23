import React, {useState} from "react";
import {createRoot} from "react-dom/client";
import Editor from "@monaco-editor/react";
import {transpileModule, ScriptTarget, ModuleKind, JsxEmit} from "typescript";
import "./style.css";

const languages = ["Snippet","JavaScript","TypeScript","Python","HTML","CSS","React","C","C++","C#","Java","Go","Rust","Ruby","PHP","Swift","Kotlin","Dart","Lua","Perl","R","Bash","Haskell"];

const webLanguages = new Set(["HTML", "CSS", "React"]);

const examples = {
  Snippet: `app:
  name: "My Program"

name = "Mason"
print("Hello, " + name)`,
  JavaScript: `const name = "Mason";
console.log("Hello, " + name);`,
  TypeScript: `const name: string = "Mason";
console.log("Hello, " + name);`,
  Python: `name = "Mason"
print("Hello, " + name)`,
  HTML: {
    "index.html": `<!doctype html>
<html>
  <body>
    <main class="card">
      <h1>Hello, world</h1>
      <button id="button">Click me</button>
    </main>
  </body>
</html>`,
    "styles.css": `body { font-family: sans-serif; background: #111827; color: white; display: grid; place-items: center; min-height: 100vh; }
.card { padding: 2rem; border-radius: 12px; background: #1f2937; box-shadow: 0 10px 30px rgba(0,0,0,.35); }
button { background: #22c55e; border: none; padding: 0.7rem 1.2rem; border-radius: 8px; color: black; font-weight: 700; }`,
    "script.js": `document.getElementById('button').addEventListener('click', () => {
  const btn = document.getElementById('button');
  btn.textContent = 'Clicked!';
});`
  },
  CSS: {
    "index.html": `<div class="card">
  <h1>Styled Card</h1>
  <p>Custom CSS is active.</p>
</div>`,
    "styles.css": `body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: linear-gradient(135deg, #0f172a, #1d4ed8); font-family: Arial, sans-serif; }
.card { background: white; color: #0f172a; border-radius: 16px; padding: 2rem; box-shadow: 0 20px 40px rgba(0,0,0,.25); }
h1 { margin-top: 0; }`
  },
  React: {
    "index.html": `<!doctype html>
<html>
  <body>
    <div id="root"></div>
  </body>
</html>`,
    "App.jsx": `const App = () => {
  const [count, setCount] = React.useState(0);
  return (
    <div className="card">
      <h1>Idiot Compiler</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
};`,
    "styles.css": `body { font-family: Arial, sans-serif; display: grid; place-items: center; min-height: 100vh; background: #0f172a; color: white; }
.card { background: #1f2937; border-radius: 16px; padding: 2rem; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,.25); }
button { margin-top: 0.75rem; background: #38bdf8; border: none; padding: 0.7rem 1rem; border-radius: 8px; font-weight: 700; }`
  },
  C: `#include <stdio.h>

int main() {
  printf("Hello, Mason\\n");
  return 0;
}`,
  "C++": `#include <iostream>
using namespace std;

int main() {
  cout << "Hello, Mason" << endl;
  return 0;
}`,
  "C#": `using System;

class Program {
  static void Main() {
    Console.WriteLine("Hello, Mason");
  }
}`,
  Java: `public class Main {
  public static void main(String[] args) {
    System.out.println("Hello, Mason");
  }
}`,
  Go: `package main
import "fmt"

func main() {
  fmt.Println("Hello, Mason")
}`,
  Rust: `fn main() {
  println!("Hello, Mason");
}`,
  Ruby: `name = "Mason"
puts "Hello, #{name}"`,
  PHP: `<?php
$name = "Mason";
echo "Hello, $name";`,
  Swift: `let name = "Mason"
print("Hello, \(name)")`,
  Kotlin: `fun main() {
  val name = "Mason"
  println("Hello, $name")
}`,
  Dart: `void main() {
  final name = "Mason";
  print("Hello, $name");
}`,
  Lua: `name = "Mason"
print("Hello, " .. name)`,
  Perl: `$name = "Mason";
print "Hello, $name\n";`,
  R: `name <- "Mason"
cat("Hello, ", name, "\n")`,
  Bash: `name="Mason"
echo "Hello, $name"`,
  Haskell: `main = putStrLn "Hello, Mason"`
};

function createProject(lang) {
  const project = examples[lang];
  if (typeof project === "string") {
    return { "main.txt": project };
  }
  if (project && typeof project === "object") {
    return {...project};
  }
  return { "main.txt": "" };
}

function getDefaultFileName(lang) {
  if (lang === "HTML") return "index.html";
  if (lang === "CSS") return "styles.css";
  if (lang === "React") return "App.jsx";
  return "main.txt";
}

function toOutput(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join("\n");
  return String(value);
}

function evaluateSnippetExpression(expr, vars) {
  const text = expr.trim();
  if (!text) return "";

  const additionParts = text.split(/\s*\+\s*/);
  if (additionParts.length > 1) {
    return additionParts.map((part) => evaluateSnippetExpression(part, vars)).join("");
  }

  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1).replace(/\\n/g, "\n");
  }

  if (!Number.isNaN(Number(text))) {
    return Number(text);
  }

  if (Object.hasOwn(vars, text)) {
    return vars[text];
  }

  return text;
}

function runSnippet(code) {
  const lines = code.split(/\r?\n/);
  const vars = {};
  const out = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("print(") && line.endsWith(")")) {
      const expr = line.slice(6, -1).trim();
      out.push(String(evaluateSnippetExpression(expr, vars)));
      continue;
    }

    const match = line.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (match) {
      const [, key, rawValue] = match;
      vars[key] = evaluateSnippetExpression(rawValue.trim(), vars);
      continue;
    }

    if (line.startsWith("app:") || /^[A-Za-z_]\w*:\s*$/.test(line) || /^-\s+/.test(line) || /^\w+:\s+/.test(line)) {
      continue;
    }

    throw new Error("Unknown Snippet statement: " + line);
  }

  return out.join("\n");
}

function runJavaScript(code) {
  const logs = [];
  const consoleProxy = {
    log: (...args) => logs.push(args.map((arg) => String(arg)).join(" ")),
    error: (...args) => logs.push(args.map((arg) => String(arg)).join(" "))
  };

  new Function("console", code)(consoleProxy);
  return logs.join("\n") || "No output.";
}

function runTypeScript(code) {
  const js = transpileModule(code, {
    compilerOptions: {
      target: ScriptTarget.ES2020,
      module: ModuleKind.ESNext,
      jsx: JsxEmit.ReactJSX
    }
  }).outputText;

  return runJavaScript(js);
}

let pyodidePromise = null;

async function getPyodide() {
  if (window.loadPyodide) {
    if (!pyodidePromise) {
      pyodidePromise = window.loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/"
      });
    }
    return pyodidePromise;
  }

  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Failed to load Python backend."));
    document.head.appendChild(script);
  });

  if (!pyodidePromise) {
    pyodidePromise = window.loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/"
    });
  }

  return pyodidePromise;
}

function hasPythonGuiImport(code) {
  return /\bimport\s+(pygame|sys)\b|from\s+pygame\s+import\b/i.test(code);
}

function installPythonGuiShim(pyodide) {
  pyodide.runPython(`
import sys
import types

if "pygame" not in sys.modules:
    pygame = types.ModuleType("pygame")

    class DummySurface:
        def __init__(self, size):
            self.size = size
        def fill(self, *args, **kwargs):
            return None
        def blit(self, *args, **kwargs):
            return None
        def update(self, *args, **kwargs):
            return None
        def convert(self, *args, **kwargs):
            return self

    class DummyFont:
        def __init__(self, *args, **kwargs):
            pass
        def render(self, *args, **kwargs):
            return ""

    pygame.Surface = DummySurface
    pygame.font = types.SimpleNamespace(SysFont=lambda *args, **kwargs: DummyFont())
    pygame.display = types.SimpleNamespace(
        set_mode=lambda *args, **kwargs: DummySurface(args[0] if args else (800, 600)),
        set_caption=lambda *args, **kwargs: None,
        flip=lambda *args, **kwargs: None,
        quit=lambda *args, **kwargs: None,
    )
    pygame.draw = types.SimpleNamespace(
        rect=lambda *args, **kwargs: None,
        circle=lambda *args, **kwargs: None,
        line=lambda *args, **kwargs: None,
        polygon=lambda *args, **kwargs: None,
    )
    pygame.event = types.SimpleNamespace(get=lambda *args, **kwargs: [])
    pygame.time = types.SimpleNamespace(delay=lambda *args, **kwargs: None)
    pygame.init = lambda *args, **kwargs: None
    pygame.quit = lambda *args, **kwargs: None
    pygame.display.set_mode = pygame.display.set_mode
    sys.modules["pygame"] = pygame
`);
}

async function runPython(code) {
  const pyodide = await getPyodide();
  let stdout = "";
  pyodide.setStdout({ batched: (text) => {
    stdout += text;
  }});
  pyodide.setStderr({ batched: (text) => {
    stdout += text;
  }});

  if (hasPythonGuiImport(code)) {
    installPythonGuiShim(pyodide);
  }

  await pyodide.runPythonAsync(code);
  if (hasPythonGuiImport(code)) {
    return stdout || "GUI import loaded. Pygame/sys support is active.";
  }
  return stdout || "No output.";
}

function resolveExpression(expr, vars) {
  let value = expr.trim();
  value = value.replace(/\btrue\b/g, "true").replace(/\bfalse\b/g, "false");

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1).replace(/\\n/g, "\n");
  }

  if (!Number.isNaN(Number(value))) {
    return Number(value);
  }

  if (Object.hasOwn(vars, value)) {
    return vars[value];
  }

  if (value.includes(" + ")) {
    const pieces = value.split(" + ");
    return pieces.map((part) => resolveExpression(part, vars)).join("");
  }

  if (value.includes("#")) {
    return value.split("#")[0].trim();
  }

  return value;
}

function runGenericBackend(code, language) {
  const lines = code.split(/\r?\n/);
  const vars = {};
  const output = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith("#") || line.startsWith("/*") || line.startsWith("*") || line.startsWith("}") || line.startsWith("{")) {
      continue;
    }

    const printPatterns = [
      /^print\s*\((.*)\)\s*;?$/,
      /^printf\s*\((.*)\)\s*;?$/,
      /^println\s*\((.*)\)\s*;?$/,
      /^Console\.WriteLine\s*\((.*)\)\s*;?$/,
      /^System\.out\.println\s*\((.*)\)\s*;?$/,
      /^puts\s+(.+)$/,
      /^echo\s+(.+)$/,
      /^echo\s*\((.*)\)\s*;?$/,
      /^cat\s*\((.*)\)\s*;?$/
    ];

    let printMatch = null;
    for (const pattern of printPatterns) {
      const match = line.match(pattern);
      if (match) {
        printMatch = match[1];
        break;
      }
    }

    if (printMatch) {
      output.push(String(resolveExpression(printMatch, vars)));
      continue;
    }

    const assignmentMatch = line.match(/^(?:const|let|var|final)?\s*([A-Za-z_]\w*)\s*[:=]\s*(.+)$/);
    if (assignmentMatch) {
      const [, key, rawValue] = assignmentMatch;
      vars[key] = resolveExpression(rawValue.replace(/;$/, ""), vars);
      continue;
    }

    if (line.startsWith("package ") || line.startsWith("import ") || line.includes("()") || line.endsWith("{") || line.endsWith("}") || line.includes("return")) {
      continue;
    }

    if (line.includes("main") || line.includes("using ")) {
      continue;
    }
  }

  if (output.length === 0) {
    return `${language} backend connected. No output generated.`;
  }

  return output.join("\n");
}

function buildHtmlPreview(language, files) {
  const entries = Object.entries(files);
  const htmlFile = entries.find(([name]) => name.endsWith(".html"));
  const cssFiles = entries.filter(([name]) => name.endsWith(".css"));
  const jsFiles = entries.filter(([name]) => /\.(js|jsx|ts|tsx)$/.test(name));

  const htmlContent = htmlFile ? htmlFile[1] : "<div id='root'></div>";
  const cssContent = cssFiles.map(([, content]) => content).join("\n\n");

  if (language === "HTML") {
    const scriptContent = jsFiles.map(([, content]) => content).join("\n\n");
    return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>${cssContent}</style>
  </head>
  <body>
    ${htmlContent}
    <script>${scriptContent}</script>
  </body>
</html>`;
  }

  if (language === "CSS") {
    const wrappedHtml = htmlFile ? htmlFile[1] : "<div class='card'>Hello from CSS</div>";
    return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>${cssContent}</style>
  </head>
  <body>
    ${wrappedHtml}
  </body>
</html>`;
  }

  const jsxFiles = jsFiles.filter(([name]) => name.endsWith(".jsx") || name.endsWith(".js"));
  const componentContent = jsxFiles
    .map(([name, content]) => content
      .replace(/export\s+default\s+/, "")
      .replace(/import\s+.*?from\s+['"][^'"]+['"];?\n?/g, "")
      .replace(/const\s+root\s*=\s*ReactDOM\.createRoot\([^)]*\)\s*;?/g, "")
      .replace(/root\.render\s*\([^;]*\)\s*;?/g, "")
      .replace(/ReactDOM\.createRoot\([^)]*\)\.render\s*\([^;]*\)\s*;?/g, "")
    )
    .join("\n\n");

  return `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>${cssContent}</style>
  </head>
  <body>
    ${htmlFile ? htmlFile[1] : "<div id='root'></div>"}
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script type="text/babel">
      const { useState, useEffect } = React;
      ${componentContent}
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(<App />);
    </script>
  </body>
</html>`;
}

function getMonacoLanguage(lang) {
  const map = {
    Snippet: "yaml",
    JavaScript: "javascript",
    TypeScript: "typescript",
    Python: "python",
    HTML: "html",
    CSS: "css",
    React: "javascript",
    C: "c",
    "C++": "cpp",
    "C#": "csharp",
    Java: "java",
    Go: "go",
    Rust: "rust",
    Ruby: "ruby",
    PHP: "php",
    Swift: "swift",
    Kotlin: "kotlin",
    Dart: "dart",
    Lua: "lua",
    Perl: "perl",
    R: "r",
    Bash: "shell",
    Haskell: "haskell"
  };

  return map[lang] || "plaintext";
}

function App() {
  const [lang, setLang] = useState("Snippet");
  const [files, setFiles] = useState(createProject("Snippet"));
  const [currentFile, setCurrentFile] = useState("main.txt");
  const [output, setOutput] = useState("");

  const fileNames = Object.keys(files);
  const currentContent = files[currentFile] ?? "";
  const isWebProject = webLanguages.has(lang);

  const handleLanguageChange = (nextLang) => {
    const project = createProject(nextLang);
    const firstFile = Object.keys(project)[0];
    setLang(nextLang);
    setFiles(project);
    setCurrentFile(firstFile);
    setOutput(nextLang === "HTML" || nextLang === "CSS" || nextLang === "React" ? "Preview ready." : "");
  };

  const updateCurrentFile = (value) => {
    setFiles((previous) => ({
      ...previous,
      [currentFile]: value || ""
    }));
  };

  const addFile = () => {
    const extension = lang === "HTML" ? "html" : lang === "CSS" ? "css" : "jsx";
    const baseName = `new-file-${Date.now()}.${extension}`;
    setFiles((previous) => ({
      ...previous,
      [baseName]: lang === "HTML" ? "<div>New section</div>" : lang === "CSS" ? "body { }" : "const NewSection = () => <div>New section</div>;"
    }));
    setCurrentFile(baseName);
  };

  async function run() {
    try {
      let result = "";

      if (lang === "Snippet") {
        result = runSnippet(files[currentFile] ?? "");
      } else if (lang === "JavaScript") {
        result = runJavaScript(files[currentFile] ?? "");
      } else if (lang === "TypeScript") {
        result = runTypeScript(files[currentFile] ?? "");
      } else if (lang === "Python") {
        result = await runPython(files[currentFile] ?? "");
      } else if (lang === "HTML" || lang === "CSS" || lang === "React") {
        const preview = buildHtmlPreview(lang, files);
        setOutput("Preview ready.");
        setFiles((previous) => ({ ...previous, preview: preview }));
        return;
      } else {
        result = runGenericBackend(files[currentFile] ?? "", lang);
      }

      setOutput(result);
    } catch (error) {
      setOutput("Error: " + error.message);
    }
  }

  return <div className="app">
    <header><b>Idiot Compiler</b><span>{lang}</span><button onClick={run}>▶ Run</button></header>
    <div className="body">
      <aside>
        <h3>Languages</h3>
        {languages.map((x) => <button className={x === lang ? "sel" : ""} onClick={() => handleLanguageChange(x)} key={x}>{x}</button>)}
        {isWebProject && <button className="add-file" onClick={addFile}>+ Add file</button>}
      </aside>
      <section className="editor-column">
        {isWebProject ? (
          <>
            <div className="file-tabs">
              {fileNames.map((name) => (
                <button className={name === currentFile ? "tab sel" : "tab"} key={name} onClick={() => setCurrentFile(name)}>{name}</button>
              ))}
            </div>
            <Editor height="52vh" theme="vs-dark" language={getMonacoLanguage(lang)} value={currentContent} onChange={(value) => updateCurrentFile(value || "")} options={{minimap:{enabled:false},fontSize:15}} />
            <div className="preview-panel">
              <div className="title">WEB GUI</div>
              <iframe title="Web preview" sandbox="allow-scripts allow-modals" srcDoc={buildHtmlPreview(lang, files)} />
            </div>
          </>
        ) : (
          <Editor height="100%" theme="vs-dark" language={getMonacoLanguage(lang)} value={currentContent} onChange={(value) => updateCurrentFile(value || "")} options={{minimap:{enabled:false},fontSize:15}} />
        )}
      </section>
    </div>
    <footer className="compact-output"><div className="title">OUTPUT</div><pre>{output}</pre></footer>
  </div>;
}

createRoot(document.getElementById("root")).render(<App />);