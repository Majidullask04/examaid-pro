import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { apiUrl } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Target, CheckCircle, AlertTriangle, TrendingDown } from 'lucide-react';

interface Prediction {
  id: string;
  question_text: string;
  probability_score: number;
  confidence_level: string;
  prediction_reason: string;
  marks: number;
  key_points: string[];
}

export default function Predictions() {
  const { subjectCode } = useParams();
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPredictions = useCallback(async () => {
    if (!subjectCode) {
      setPredictions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(apiUrl(`/api/v2/subjects/${subjectCode}/predictions`));
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setPredictions(data.predictions);
    } catch (error) {
      toast.error('Failed to load predictions');
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }, [subjectCode]);

  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-white hover:text-slate-200">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Question Predictions</h1>
              <p className="text-sm text-slate-400">Subject: {subjectCode}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">High Confidence</p>
                <p className="text-2xl font-bold text-green-600">
                  {predictions.filter(p => p.confidence_level === 'high').length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Medium Confidence</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {predictions.filter(p => p.confidence_level === 'medium').length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Low Confidence</p>
                <p className="text-2xl font-bold text-red-600">
                  {predictions.filter(p => p.confidence_level === 'low').length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Predictions List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">Predicted Questions</h2>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-slate-500">Analyzing previous papers...</p>
            </div>
          ) : predictions.length === 0 ? (
            <Card className="p-8 text-center">
              <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No predictions available yet</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {predictions.map((prediction, index) => (
                <div
                  key={prediction.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <Card className="hover:shadow-lg transition-shadow bg-slate-900 border-slate-700">
                    <CardContent className="p-8">
                      <div className="flex flex-col gap-6">
                        {/* Question Header */}
                        <div className="flex flex-wrap items-start justify-between gap-6">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <Badge className={`px-3 py-1 text-sm font-semibold border ${getConfidenceColor(prediction.confidence_level)}`}>
                                {prediction.confidence_level.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="px-3 py-1 text-sm font-semibold bg-slate-800 text-white border-slate-600">
                                {prediction.marks} Marks
                              </Badge>
                              <span className="text-sm text-slate-400 font-medium">
                                #{index + 1}
                              </span>
                            </div>
                            <h3 className="text-2xl font-bold text-white leading-relaxed">
                              {prediction.question_text}
                            </h3>
                          </div>
                          
                          {/* Probability Score - Larger */}
                          <div className="flex flex-col items-center min-w-[120px] bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-700">
                            <div className={`text-4xl font-bold ${
                              prediction.probability_score >= 80 ? 'text-green-400' :
                              prediction.probability_score >= 50 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {prediction.probability_score.toFixed(0)}%
                            </div>
                            <span className="text-sm font-medium text-slate-300 mt-1">Probability</span>
                          </div>
                        </div>

                        {/* Progress Bar - Thicker */}
                        <Progress 
                          value={prediction.probability_score} 
                          className={`h-3 ${
                            prediction.probability_score >= 80 ? 'bg-green-900 [&>div]:bg-green-500' :
                            prediction.probability_score >= 50 ? 'bg-yellow-900 [&>div]:bg-yellow-500' :
                            'bg-red-900 [&>div]:bg-red-500'
                          }`}
                        />

                        {/* Prediction Reason - Larger */}
                        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                          <p className="text-base text-slate-200 leading-relaxed">
                            <span className="font-bold text-white">Why this is predicted: </span>
                            {prediction.prediction_reason}
                          </p>
                        </div>

                        {/* Key Points */}
                        {prediction.key_points.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {prediction.key_points.map((point, i) => (
                              <span 
                                key={i}
                                className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              >
                                {point}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Action Buttons - Larger */}
                        <div className="flex flex-wrap gap-3 pt-2">
                          <Button size="default" className="flex-1 min-w-[150px] bg-slate-700 text-white hover:bg-slate-600 border-slate-600">
                            Add to Study Plan
                          </Button>
                          <Button size="default" variant="outline" className="flex-1 min-w-[150px] bg-slate-800 text-white border-slate-600 hover:bg-slate-700">
                            Practice Now
                          </Button>
                          <Button size="default" variant="ghost" className="flex-1 min-w-[150px] text-white hover:bg-slate-800">
                            Mark as Studied
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
