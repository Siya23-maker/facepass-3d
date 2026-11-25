import { Component, type ReactNode } from 'react'

// An "error boundary" catches crashes in the components inside it.
// Without one, any error makes React remove everything → a blank white page.
// With one, we show what went wrong, which makes problems easy to report and fix.

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('[FacePass] crashed:', error)
  }

  render() {
    if (!this.state.error) return this.props.children
    const webgl = /webgl|context/i.test(this.state.error.message)
    return (
      <div style={{ maxWidth: 640, margin: '12vh auto', padding: 24, fontFamily: 'Segoe UI, system-ui, sans-serif' }}>
        <h1 style={{ color: '#e3061b', margin: 0 }}>FacePass couldn't start</h1>
        <p>
          {webgl
            ? 'Your browser could not start 3D graphics (WebGL). In Chrome, open Settings → System and turn on "Use graphics acceleration when available", then reload.'
            : 'Something went wrong while loading the demo. Please send this message to the developer:'}
        </p>
        <pre style={{ background: '#f4f4f5', padding: 12, borderRadius: 8, whiteSpace: 'pre-wrap' }}>
          {this.state.error.message}
        </pre>
        <button onClick={() => location.reload()} style={{ padding: '10px 18px', borderRadius: 8, border: 0, background: '#e3061b', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
          Reload
        </button>
      </div>
    )
  }
}
