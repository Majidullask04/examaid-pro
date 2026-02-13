import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <Card className="border-destructive/50 bg-destructive/10">
                    <CardContent className="pt-6 text-center space-y-4">
                        <div className="flex justify-center">
                            <AlertTriangle className="h-12 w-12 text-destructive" />
                        </div>
                        <h3 className="text-lg font-semibold text-destructive">Something went wrong</h3>
                        <p className="text-sm text-muted-foreground font-mono bg-background/50 p-2 rounded">
                            {this.state.error?.message}
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => this.setState({ hasError: false })}
                        >
                            Try again
                        </Button>
                    </CardContent>
                </Card>
            );
        }

        return this.props.children;
    }
}
