import { useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  Upload,
  X,
  Image as ImageIcon,
  Target,
  Trophy,
  Loader2,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SyllabusUploaderProps {
  onAnalyze: (imageBase64: string, studyGoal: 'pass' | 'high_marks') => void;
  isProcessing: boolean;
  processingStage: string;
}

export function SyllabusUploader({ onAnalyze, isProcessing, processingStage }: SyllabusUploaderProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [studyGoal, setStudyGoal] = useState<'pass' | 'high_marks'>('high_marks');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size should be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      // Extract base64 data (remove data URL prefix)
      const base64 = result.split(',')[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleAnalyze = () => {
    if (!imageBase64) {
      toast.error('Please upload a syllabus image first');
      return;
    }
    onAnalyze(imageBase64, studyGoal);
  };

  return (
    <div className="space-y-4">
      {/* Image Upload Area */}
      <Card
        className={cn(
          "border-2 border-dashed transition-all duration-300",
          isDragging && "border-primary bg-primary/5",
          imagePreview && "border-solid"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="p-6">
          {!imagePreview ? (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <div className="p-4 rounded-full bg-muted">
                <ImageIcon className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold mb-1">Upload Syllabus Image</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Take a photo or upload an image of your JNTUH syllabus
                </p>
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </Button>
                <Button
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Supports: JPG, PNG, WEBP (max 10MB)
              </p>
              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Preview */}
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Syllabus preview"
                  className="w-full max-h-[300px] object-contain rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={clearImage}
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Study Goal Toggle */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-sm mb-1">Study Goal</h3>
              <p className="text-xs text-muted-foreground">
                Choose your exam preparation strategy
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={studyGoal === 'pass' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStudyGoal('pass')}
                disabled={isProcessing}
                className="gap-2"
              >
                <Target className="h-4 w-4" />
                Just Pass 😅
              </Button>
              <Button
                variant={studyGoal === 'high_marks' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStudyGoal('high_marks')}
                disabled={isProcessing}
                className="gap-2"
              >
                <Trophy className="h-4 w-4" />
                High Marks 🏆
              </Button>
            </div>
          </div>

          {/* Goal Description */}
          <div className="mt-3 p-3 rounded-lg bg-muted/50">
            {studyGoal === 'pass' ? (
              <div className="flex items-start gap-2">
                <Badge variant="secondary" className="text-xs">😅 Just Pass</Badge>
                <p className="text-xs text-muted-foreground">
                  Focus on high-frequency questions only. Minimum effort for passing marks.
                  Skip complex derivations, prioritize definitions & diagrams.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <Badge variant="default" className="text-xs">🏆 High Marks</Badge>
                <p className="text-xs text-muted-foreground">
                  Comprehensive coverage of all topics. Includes derivations, proofs,
                  and application-based questions. Aim for 80%+ marks.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Analyze Button */}
      {imagePreview && (
        <Button
          onClick={handleAnalyze}
          disabled={isProcessing || !imageBase64}
          className="w-full gap-2 transition-all duration-300"
          size="lg"
          variant={isProcessing ? "secondary" : "default"}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {processingStage || 'Processing...'}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Analyze Syllabus with AI
            </>
          )}
        </Button>
      )}

      {/* Processing Stages Indicator */}
      {isProcessing && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <div className="flex gap-1">
            <div className={cn(
              "h-2 w-2 rounded-full transition-colors",
              processingStage.includes('1') || processingStage.includes('extract') ? 'bg-primary animate-pulse' : 'bg-muted'
            )} />
            <div className={cn(
              "h-2 w-2 rounded-full transition-colors",
              processingStage.includes('2') || processingStage.includes('search') ? 'bg-primary animate-pulse' : 'bg-muted'
            )} />
            <div className={cn(
              "h-2 w-2 rounded-full transition-colors",
              processingStage.includes('3') || processingStage.includes('plan') ? 'bg-primary animate-pulse' : 'bg-muted'
            )} />
          </div>
          <span>{processingStage}</span>
        </div>
      )}
    </div>
  );
}
