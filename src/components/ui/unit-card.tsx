import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Unit } from '@/types/database';
import { ChevronRight, FileText } from 'lucide-react';

interface UnitCardProps {
  unit: Unit;
  questionCount?: number;
}

export function UnitCard({ unit, questionCount }: UnitCardProps) {
  return (
    <Link to={`/units/${unit.id}`}>
      <Card className="group h-full transition-all duration-300 hover:shadow-lg hover:border-primary/50 cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                {unit.unit_number}
              </div>
              <CardTitle className="text-lg">{unit.title}</CardTitle>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="line-clamp-2">
            {unit.description || 'Study this unit to master the concepts.'}
          </CardDescription>
          {questionCount !== undefined && (
            <div className="mt-3 flex items-center gap-2 text-sm font-medium text-primary">
              <FileText className="h-4 w-4" />
              {questionCount} {questionCount === 1 ? 'Question' : 'Questions'}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
