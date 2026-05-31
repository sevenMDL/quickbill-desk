import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Global error boundary for catching and displaying React component errors
 * @component
 * @extends {Component<Props, State>}
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  /**
   * Logs error information for monitoring
   * @param {Error} error - The error that was thrown
   * @param {ErrorInfo} errorInfo - Additional error information
   */
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  /**
   * Resets error state and attempts to recover
   */
  private resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  /**
   * Navigates user to home page
   */
  private goHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-background">
          <Card className="w-full max-w-md border-destructive/50 shadow-lg">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <AlertCircle className="h-16 w-16 text-destructive" />
              </div>
              <CardTitle className="text-xl text-destructive">
                Application Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <p className="text-muted-foreground">
                {this.state.error?.message || "An unexpected error occurred. Our team has been notified and is working to resolve the issue."}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={this.resetError}
                  className="flex items-center gap-2"
                  variant="default"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button 
                  onClick={this.goHome}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>
              </div>

              {/* Development details - only shown in development */}
              {import.meta.env.DEV && this.state.error && (
                <details className="text-left border rounded-lg p-3 bg-muted/30">
                  <summary className="cursor-pointer text-sm font-medium">
                    Development Details
                  </summary>
                  <pre className="text-xs mt-2 overflow-auto max-h-32 whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
