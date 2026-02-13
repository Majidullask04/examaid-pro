import React, { useState } from 'react';
import { UniversalEngine } from '@/lib/ai/UniversalEngine';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { AnalysisResult } from '@/types/examaid';

export const UniversalAnalysis = () => {
    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const { toast } = useToast();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleAnalyze = async () => {
        if (!file) {
            toast({
                title: "No file selected",
                description: "Please upload a syllabus image or PDF first.",
                variant: "destructive"
            });
            return;
        }

        setIsAnalyzing(true);
        setResult(null);
        setLogs([]);

        // Capture logs from console for demo purposes
        const originalLog = console.log;
        console.log = (...args) => {
            originalLog(...args);
            setLogs(prev => [...prev, args.join(' ')]);
        };

        try {
            const engine = new UniversalEngine();
            const analysisResult = await engine.analyze(file, {
                subject_name: file.name.split('.')[0] // rudimentary subject name guess
            });

            setResult(analysisResult);
            toast({
                title: "Analysis Complete",
                description: `Successfully analyzed ${analysisResult.metadata.subject_name}`,
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Analysis Failed",
                description: error instanceof Error ? error.message : "Unknown error occurred",
                variant: "destructive"
            });
        } finally {
            setIsAnalyzing(false);
            console.log = originalLog; // Restore console
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5 text-primary" />
                        Universal Syllabus Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="syllabus">Syllabus Document</Label>
                        <Input id="syllabus" type="file" onChange={handleFileChange} accept="image/*,.pdf" />
                    </div>

                    <Button
                        onClick={handleAnalyze}
                        disabled={!file || isAnalyzing}
                        className="w-full sm:w-auto"
                    >
                        {isAnalyzing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Analyzing with Universal Engine...
                            </>
                        ) : (
                            <>
                                <FileText className="mr-2 h-4 w-4" />
                                Start Analysis
                            </>
                        )}
                    </Button>

                    {logs.length > 0 && (
                        <div className="bg-muted p-4 rounded-md text-xs font-mono h-40 overflow-y-auto">
                            {logs.map((log, i) => (
                                <div key={i} className="mb-1">{log}</div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {result && (
                <Card className="border-green-500/20 bg-green-500/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-700">
                            <CheckCircle className="w-5 h-5" />
                            Analysis Results
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-semibold">Subject:</span> {result.metadata.subject_name}
                            </div>
                            <div>
                                <span className="font-semibold">Units:</span> {result.metadata.total_units}
                            </div>
                            <div>
                                <span className="font-semibold">Regulation:</span> {result.metadata.regulation}
                            </div>
                            <div>
                                <span className="font-semibold">Status:</span> {result.metadata.processing_status}
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <h4 className="font-semibold mb-2">Strategy</h4>
                            <p className="text-sm text-muted-foreground">{result.study_plan?.strategy}</p>
                        </div>

                        <div className="pt-4 border-t">
                            <h4 className="font-semibold mb-2">JSON Output Preview</h4>
                            <pre className="text-xs bg-slate-950 text-slate-50 p-4 rounded overflow-auto max-h-60">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
