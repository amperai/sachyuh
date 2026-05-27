const tests = [];

export function test(name, fn) {
  tests.push({ name, fn });
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

export function assertEqual(actual, expected, message) {
  if (!Object.is(actual, expected)) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

export function assertClose(actual, expected, epsilon = 1e-6) {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`Expected ${expected}, got ${actual}`);
  }
}

function logResult(status, name, error) {
  const line = `${status === 'pass' ? 'PASS' : 'FAIL'} ${name}`;
  if (typeof document !== 'undefined') {
    const list = document.getElementById('results');
    if (list) {
      const item = document.createElement('li');
      item.className = status;
      item.textContent = line;
      if (error) {
        const detail = document.createElement('pre');
        detail.textContent = error.stack || String(error);
        item.appendChild(detail);
      }
      list.appendChild(item);
    }
  } else if (status === 'pass') {
    console.log(line);
  } else {
    console.error(line);
    if (error) {
      console.error(error);
    }
  }
}

export async function run() {
  let failures = 0;

  for (const { name, fn } of tests) {
    try {
      await fn();
      logResult('pass', name);
    } catch (error) {
      failures += 1;
      logResult('fail', name, error);
    }
  }

  if (typeof document !== 'undefined') {
    const summary = document.getElementById('summary');
    if (summary) {
      summary.textContent = failures
        ? `Neúspěch: ${failures} testů`
        : 'Všechny testy prošly';
      summary.className = failures ? 'fail' : 'pass';
      summary.dataset.status = failures ? 'fail' : 'pass';
    }
  } else if (typeof process !== 'undefined') {
    process.exitCode = failures ? 1 : 0;
  }
}
