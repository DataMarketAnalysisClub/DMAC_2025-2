import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
          <span className="text-[#ef4444] text-sm font-semibold tracking-wider uppercase">
            Something went wrong
          </span>
          <span className="text-[#64748b] text-xs max-w-md break-words">
            {this.state.error.message}
          </span>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-2 px-3 py-1 text-xs bg-[#1e1e1e] text-[#e2e8f0] rounded hover:bg-[#f59e0b] hover:text-black transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
