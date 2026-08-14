import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro de renderização:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full border border-gray-200 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-gray-900">
                {this.props.fallbackTitle || 'Recuperação Automática do Sistema'}
              </h2>
              <p className="text-sm text-gray-600 font-medium">
                Ocorreu uma instabilidade pontual na interface. Seus dados de canteiros e avaliações permanecem salvos com segurança.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-left overflow-auto max-h-32 text-xs font-mono text-gray-700">
                <span className="font-bold text-rose-700 block mb-1">Detalhes do erro:</span>
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full flex-1 py-3 px-4 bg-[#1b4332] hover:bg-[#2d6a4f] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recarregar Aplicativo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                }}
                className="w-full sm:w-auto py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-sm transition-all cursor-pointer"
              >
                Tentar Continuar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
