import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Subject } from '@/types/database';
import { ChevronRight } from 'lucide-react';

interface SubjectCardProps {
  subject: Subject;
  unitCount?: number;
}

export function SubjectCard({ subject, unitCount }: SubjectCardProps) {
  return (
    <Link to={`/subjects/${subject.id}`}>
      <Card className="group h-full transition-all duration-300 hover:shadow-lg hover:border-primary/50 cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="text-4xl mb-2">{subject.icon || '📚'}</div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <CardTitle className="text-lg">{subject.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="line-clamp-2">
            {subject.description || 'Explore this subject and prepare for your exams.'}
          </CardDescription>
          {unitCount !== undefined && (
            <p className="mt-3 text-sm font-medium text-primary">
              {unitCount} {unitCount === 1 ? 'Unit' : 'Units'}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
