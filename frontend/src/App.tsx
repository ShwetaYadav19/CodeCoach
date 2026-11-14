import { useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  AlertTriangle, CheckCircle2, Code2, FlaskConical, Play,
  ShieldCheck, WandSparkles, XCircle,
} from 'lucide-react';

type ParsedProblem = {
  title: string;
  methodName: string;
  signature: string;
  starterCode: string;
  assumptions: string[];
  testPlan: string[];
};
type TestResult = {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  detail: string;
};

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const demoStatement = `Given a weighted graph and a source vertex src, find the shortest distance from src to every other vertex. Return -1 for unreachable vertices.

GFG-style function:
class Solution {
    public int[] dijkstra(int V, ArrayList<ArrayList<ArrayList<Integer>>> adj, int src)
}

Constraints:
1 <= V <= 100000
0 <= E <= 200000
0 <= weight <= 100000

The graph is undirected. The adjacency list contains entries [neighbor, weight].`;

const provisional: ParsedProblem = {
  title: 'Provisional Java scaffold',
  methodName: 'solve',
  signature: 'public int[] solve(int n, int[][] edges)',
  starterCode: `import java.util.*;

class Solution {
    public int[] solve(int n, int[][] edges) {
        // TODO: implement your solution
        return new int[n];
    }
}`,
  assumptions: [
    'This is only a fallback example; it was not generated from your pasted statement.',
    'Confirm the exact GFG method signature, parameter types, input grammar and output convention.',
  ],
  testPlan: [
    'Minimum input / single element',
    'Empty or missing edges',
    'Duplicate values or edges',
    'Disconnected components',
    'Boundary values from constraints',
    'Maximum-size stress input',
  ],
};

export default function App() {
  const [statement, setStatement] = useState('');
  const [code, setCode] = useState(provisional.starterCode);
  const [problem, setProblem] = useState<ParsedProblem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState('Paste a problem statement to begin.');

  async function generateScaffold() {
    if (!statement.trim()) {
      setError('Paste the complete problem statement first.');
      return;
    }
    setBusy(true);
    setError('');
    setResults([]);
    try {
      const response = await fetch(`${API}/api/problems/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement }),
      });
      if (!response.ok) throw new Error(await response.text());
      const parsed: ParsedProblem = await response.json();
      if (!parsed.starterCode || !parsed.signature || !parsed.testPlan) {
        throw new Error('Parser response is missing required fields.');
      }
      setProblem(parsed);
      setCode(parsed.starterCode);
      setSummary('Scaffold generated. Review the signature and assumptions before running tests.');
    } catch (cause) {
      setProblem(provisional);
      setCode(provisional.starterCode);
      setError(`Problem parser is not connected or returned an invalid response. No scaffold was generated from your statement. ${cause instanceof Error ? cause.message : ''}`);
      setSummary('Showing a clearly marked fallback example only.');
    } finally {
      setBusy(false);
    }
  }

  async function runTests() {
    if (!problem || problem === provisional) {
      setError('Generate a real problem scaffold before submitting.');
      return;
    }
    setBusy(true);
    setError('');
    setResults([]);
    try {
      // First execution milestone: run the GFG Solution class against one
      // deterministic Dijkstra sample using an appended Java driver.
      const driver = `

class Main {
    private static void addEdge(ArrayList<ArrayList<ArrayList<Integer>>> adj,
                                int u, int v, int w) {
        ArrayList<Integer> a = new ArrayList<>();
        a.add(v); a.add(w);
        adj.get(u).add(a);

        ArrayList<Integer> b = new ArrayList<>();
        b.add(u); b.add(w);
        adj.get(v).add(b);
    }

    public static void main(String[] args) {
        int n = 5;
        ArrayList<ArrayList<ArrayList<Integer>>> adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());

        addEdge(adj, 0, 1, 2);
        addEdge(adj, 0, 2, 4);
        addEdge(adj, 1, 2, 1);
        addEdge(adj, 1, 3, 7);
        addEdge(adj, 2, 4, 3);
        addEdge(adj, 4, 3, 2);

        int[] answer = new Solution().dijkstra(n, adj, 0);
        for (int i = 0; i < answer.length; i++) {
            if (i > 0) System.out.print(" ");
            System.out.print(answer[i]);
        }
    }
}
`;

      const response = await fetch(`${API}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code + driver,
          input: '',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || JSON.stringify(data));
      }

      const expected = '0 2 3 8 6';
      const actual = String(data.output ?? '').trim().replace(/\\s+/g, ' ');
      const passed =
        data.exit_code === 0 &&
        !data.error &&
        actual === expected;

      setResults([{
        name: 'Dijkstra sample graph',
        status: passed ? 'passed' : 'failed',
        detail: data.error
          ? data.error
          : `Expected: ${expected} | Actual: ${actual || '(empty output)'} | Exit code: ${data.exit_code ?? 'unknown'}`,
      }]);
      setSummary(
        data.error
          ? 'Compilation or runtime error returned by the Java compiler.'
          : passed
            ? 'Java code compiled and the sample test passed.'
            : 'Java code executed, but the sample output did not match.'
      );
    } catch (cause) {
      setError(`Execution service is not configured. Your code was not compiled or run. ${cause instanceof Error ? cause.message : ''}`);
      setSummary('No execution result is available.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header>
        <div className="brand">
          <div className="logo"><Code2 /></div>
          <div>
            <h1>CodeCoach</h1>
            <p>Paste a problem. Write your solution. Find the edge cases.</p>
          </div>
        </div>
        <span className="pill"><ShieldCheck size={14} /> No account required</span>
      </header>

      <section className="intro">
        <div>
          <span className="eyebrow">UNIVERSAL DSA JUDGE</span>
          <h2>Your coding practice,<br /><em>with a better judge.</em></h2>
          <p>Paste a GFG-style problem statement. CodeCoach prepares a Java starter template and a test plan, then evaluates your implementation.</p>
        </div>
        <div className="intro-art">
          <FlaskConical size={76} />
          <span>Parse → Scaffold → Test → Diagnose</span>
        </div>
      </section>

      <section className="card paste">
        <div className="section-head">
          <div><span className="step">01</span><h3>Paste problem statement</h3></div>
          <button className="ghost" onClick={() => setStatement(demoStatement)}>Load demo problem</button>
        </div>
        <textarea
          value={statement}
          onChange={(event) => setStatement(event.target.value)}
          placeholder="Paste the full GFG problem statement, including method signature, constraints, input/output format and examples…"
        />
        <div className="actions">
          <small>Include the GFG function signature if available. Review generated assumptions before trusting the harness.</small>
          <button className="primary" onClick={generateScaffold} disabled={busy}>
            <WandSparkles size={16} /> {busy ? 'Generating…' : 'Generate code scaffold'}
          </button>
        </div>
      </section>

      <section className="workspace">
        <div className="card editor-card">
          <div className="section-head">
            <div><span className="step">02</span><h3>Java solution</h3></div>
            <span className="language">JAVA 21</span>
          </div>
          <div className="editor">
            <Editor
              height="470px"
              language="java"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value ?? '')}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16 },
                wordWrap: 'on',
              }}
            />
          </div>
          <div className="editor-actions">
            <button className="ghost" onClick={() => setCode(problem?.starterCode ?? provisional.starterCode)}>Reset scaffold</button>
            <button className="primary" onClick={runTests} disabled={busy || !problem || problem === provisional}>
              <Play size={15} /> {busy ? 'Running…' : 'Run all tests'}
            </button>
          </div>
        </div>

        <aside className="card side">
          <div className="section-head">
            <div><span className="step">03</span><h3>Test strategy</h3></div>
          </div>
          {problem ? (
            <>
              <h4>{problem.title}</h4>
              <p className="muted">Method: <code>{problem.signature}</code></p>
              <h4>Planned edge cases</h4>
              <ul>{problem.testPlan.map((item) => <li key={item}>{item}</li>)}</ul>
              <h4>Review before execution</h4>
              <ul className="warnings">{problem.assumptions.map((item) => <li key={item}>{item}</li>)}</ul>
            </>
          ) : <p className="muted">Your generated test plan and parser assumptions will appear here.</p>}
          <div className="notice">
            <AlertTriangle size={16} />
            <span>AI-generated harnesses can be wrong. Verify the signature, input format and expected behavior before trusting a verdict.</span>
          </div>
        </aside>
      </section>

      <section className="card report">
        <div className="section-head">
          <div><span className="step">04</span><h3>Evaluation report</h3></div>
          <span className="muted">{results.length ? `${results.filter((item) => item.status === 'passed').length}/${results.length} passed` : 'Waiting for submission'}</span>
        </div>
        <p className="summary">{summary}</p>
        {error && <div className="error">{error}</div>}
        {results.length > 0 && (
          <div className="test-list">
            {results.map((item, index) => (
              <div className="test-row" key={`${item.name}-${index}`}>
                {item.status === 'passed' ? <CheckCircle2 className="pass-icon" size={16} /> : <XCircle className="fail-icon" size={16} />}
                <strong>{item.name}</strong>
                <span className={`status ${item.status}`}>{item.status}</span>
                <small>{item.detail}</small>
              </div>
            ))}
          </div>
        )}
      </section>
      <footer>CodeCoach · Public practice tool · Submitted solutions are not saved to this repository.</footer>
    </main>
  );
}
