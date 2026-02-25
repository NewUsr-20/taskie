import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null, errorInfo: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { this.setState({ errorInfo }); console.error("Caught by Error Boundary:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 max-w-3xl mx-auto mt-20 bg-red-50 border-2 border-red-200 rounded-xl font-sans">
          <h1 className="text-3xl font-bold text-red-700 mb-4">💥 React Crashed!</h1>
          <p className="text-red-600 mb-6 font-medium">Please copy the error below and send it to your AI assistant so we can fix it instantly:</p>
          <div className="bg-white p-4 rounded-lg text-sm text-red-800 overflow-auto border border-red-100 shadow-inner whitespace-pre-wrap font-mono">
            <strong>{this.state.error?.toString()}</strong>
            <br/><br/>
            {this.state.errorInfo?.componentStack}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)