import { useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  AlertTriangle, CheckCircle2, Code2, FlaskConical, Play,
  ShieldCheck, WandSparkles, XCircle,
} from 'lucide-react';

type GeneratedTestCase = {
  name: string;
  input: string;
  expectedOutput?: string;
  expectedOutputSource?: 'problem_example' | 'reference_solution' | 'ai_generated' | 'unknown';
};

type ExecutionHarness = {
  driverCode: string;
  inputFormat?: string;
  tests: GeneratedTestCase[];
  oracleNotes?: string;
};

type ParsedProblem = {
  title: string;
  methodName: string;
  signature: string;
  starterCode: string;
  signatureSource?: 'gfg_retrieved' | 'user_supplied' | 'ai_inferred';
  sourceUrl?: string;
  sourceTitle?: string;
  matchConfidence?: 'high' | 'medium' | 'low' | 'none';
  assumptions: string[];
  testPlan: string[];
  executionSupported?: boolean;
  executionMode?: string;
  referenceSolutionCode?: string;
  referenceSolutionStatus?: 'generated' | 'unavailable';
  executionHarness?: ExecutionHarness;
};
type TestResult = {
  name: string;
  status: 'passed' | 'cross-checked' | 'failed' | 'skipped';
  detail: string;
};

function assembleJavaSource(solutionCode: string, driverCode: string): string {
  const importPattern = /^\s*import\s+[^;]+;\s*$/gm;
  const imports = [
    ...(solutionCode.match(importPattern) ?? []),
    ...(driverCode.match(importPattern) ?? []),
  ];
  const solutionBody = solutionCode.replace(importPattern, '');
  const driverBody = driverCode.replace(importPattern, '');
  return [...new Set(imports)].join('\n') + '\n\n' + solutionBody + '\n\n' + driverBody;
}

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
    const harness = problem.executionHarness;
    if (!harness || !harness.driverCode || !Array.isArray(harness.tests) || harness.tests.length === 0) {
      setError('The parser did not return a validated execution harness. This problem can be analyzed, but it cannot be executed yet.');
      return;
    }
    if (!/\bclass\s+Main\\b/.test(harness.driverCode)) {
      setError('The generated execution harness is invalid: it must contain a Java Main class.');
      return;
    }
    if (/\bclass\s+Main\\b/.test(code)) {
      setError('Please submit only your GFG Solution class. CodeCoach supplies the Main driver.');
      return;
    }
    if (!/\bclass\s+Solution\\b/.test(code)) {
      setError('Your Java code must contain class Solution.');
      return;
    }
    if (harness.tests.length > 20) {
      setError('The generated harness contains too many test cases. Maximum allowed is 20.');
      return;
    }

    setBusy(true);
    setError('');
    setResults([]);
    try {
      const completed: TestResult[] = [];
      for (const test of harness.tests) {
        const combinedInput = test.input ?? '';
        const userResponse = await fetch(`${API}/api/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: assembleJavaSource(code, harness.driverCode),
            input: combinedInput,
          }),
        });
        const userData = await userResponse.json();
        if (!userResponse.ok || userData.error || userData.exit_code !== 0) {
          completed.push({
            name: test.name,
            status: 'failed',
            detail: `Your solution failed to compile or execute: ${userData.error || userData.output || JSON.stringify(userData)}`,
          });
          continue;
        }

        const actual = String(userData.output ?? '').trim().replace(/\s+/g, ' ');
        if (test.expectedOutputSource === 'problem_example' &&
            typeof test.expectedOutput === 'string' && test.expectedOutput.trim()) {
          const expected = test.expectedOutput.trim().replace(/\s+/g, ' ');
          completed.push({
            name: test.name,
            status: actual === expected ? 'passed' : 'failed',
            detail: `Expected (problem example): ${expected} | Actual: ${actual}`,
          });
          continue;
        }

        if (!problem.referenceSolutionCode) {
          completed.push({
            name: test.name,
            status: 'skipped',
            detail: `Actual: ${actual || '(empty)'} | No independent reference implementation was available, so this test cannot be scored.`,
          });
          continue;
        }

        const referenceResponse = await fetch(`${API}/api/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: assembleJavaSource(problem.referenceSolutionCode, harness.driverCode),
            input: combinedInput,
          }),
        });
        const referenceData = await referenceResponse.json();
        if (!referenceResponse.ok || referenceData.error || referenceData.exit_code !== 0) {
          completed.push({
            name: test.name,
            status: 'skipped',
            detail: `Actual: ${actual || '(empty)'} | Reference implementation could not compile or execute: ${referenceData.error || referenceData.output || JSON.stringify(referenceData)}`,
          });
          continue;
        }

        const referenceOutput = String(referenceData.output ?? '').trim().replace(/\s+/g, ' ');
        completed.push({
          name: test.name,
          status: actual === referenceOutput ? 'cross-checked' : 'failed',
          detail: `Your output: ${actual || '(empty)'} | Reference output: ${referenceOutput || '(empty)'} | ${actual === referenceOutput ? 'Outputs agree; this is a differential cross-check, not a proof of correctness.' : 'Output mismatch against the generated reference implementation.'}`,
        });
      }

      setResults(completed);
      const passed = completed.filter((item) => item.status === 'passed').length;
      const crossChecked = completed.filter((item) => item.status === 'cross-checked').length;
      const failed = completed.filter((item) => item.status === 'failed').length;
      const skipped = completed.filter((item) => item.status === 'skipped').length;
      setSummary(`${passed} passed against statement examples, ${crossChecked} cross-checked against a separately generated reference, ${failed} failed, ${skipped} unverified. Differential agreement is useful evidence, not a formal correctness proof. Each solution/reference execution was compiled separately. ${harness.oracleNotes || ''}`);
    } catch (cause) {
      setError(`Execution request failed. ${cause instanceof Error ? cause.message : ''}`);
      setSummary('No reliable execution result is available.');
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
            <span className="language">JAVA 25</span>
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
            <button className="primary" onClick={runTests} disabled={busy || !problem || problem === provisional || !problem.executionHarness?.driverCode || !problem.executionHarness?.tests?.length}>
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
              <p className="muted">
                Signature source: {
                  problem.signatureSource === 'gfg_retrieved'
                    ? 'Retrieved from GeeksforGeeks'
                    : problem.signatureSource === 'user_supplied'
                      ? 'Provided in pasted statement'
                      : 'AI inferred — verify before submitting'
                } {problem.matchConfidence ? `(confidence: ${problem.matchConfidence})` : ''}
              </p>
              {problem.sourceUrl && (
                <p className="muted">Reference: <a href={problem.sourceUrl} target="_blank" rel="noreferrer">{problem.sourceTitle || 'GeeksforGeeks problem page'}</a></p>
              )}
              {problem.executionHarness?.driverCode && problem.executionHarness.tests?.length ? (
                <p className="muted">A problem-specific Java driver was generated with {problem.executionHarness.tests.length} test cases.</p>
              ) : (
                <div className="notice">
                  <AlertTriangle size={16} />
                  <span>Problem analysis is available, but the parser has not supplied a problem-specific execution driver and test inputs yet.</span>
                </div>
              )}
              {problem.executionHarness?.inputFormat && (
                <p className="muted">CodeCoach test-input format: {problem.executionHarness.inputFormat}</p>
              )}
              {problem.executionHarness?.oracleNotes && (
                <p className="muted">Test-oracle notes: {problem.executionHarness.oracleNotes}</p>
              )}
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
          <span className="muted">{results.length ? `${results.filter((item) => item.status === 'passed' || item.status === 'cross-checked').length}/${results.length} checked` : 'Waiting for submission'}</span>
        </div>
        <p className="summary">{summary}</p>
        {error && <div className="error">{error}</div>}
        {results.length > 0 && (
          <div className="test-list">
            {results.map((item, index) => (
              <div className="test-row" key={`${item.name}-${index}`}>
                {item.status === 'passed' || item.status === 'cross-checked' ? <CheckCircle2 className="pass-icon" size={16} /> : item.status === 'skipped' ? <AlertTriangle size={16} /> : <XCircle className="fail-icon" size={16} />}
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
