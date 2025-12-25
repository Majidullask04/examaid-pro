import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { supabase } from '@/integrations/supabase/client';
import { Subject, Unit, Question, QuestionImportance } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Shield } from 'lucide-react';

export default function Admin() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Subject form
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [subjectDescription, setSubjectDescription] = useState('');
  const [subjectIcon, setSubjectIcon] = useState('');
  
  // Unit form
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitSubjectId, setUnitSubjectId] = useState('');
  const [unitTitle, setUnitTitle] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [unitDescription, setUnitDescription] = useState('');
  
  // Question form
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionUnitId, setQuestionUnitId] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [questionAnswer, setQuestionAnswer] = useState('');
  const [questionImportance, setQuestionImportance] = useState<QuestionImportance>('medium');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isAdmin) {
        toast({
          title: 'Access Denied',
          description: 'You need admin privileges to access this page.',
          variant: 'destructive',
        });
        navigate('/');
      } else {
        fetchData();
      }
    }
  }, [user, isAdmin, authLoading, navigate, toast]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [subjectsRes, unitsRes, questionsRes] = await Promise.all([
        supabase.from('subjects').select('*').order('name'),
        supabase.from('units').select('*').order('unit_number'),
        supabase.from('questions').select('*').order('created_at', { ascending: false }),
      ]);
      
      setSubjects(subjectsRes.data || []);
      setUnits(unitsRes.data || []);
      setQuestions(questionsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Subject CRUD
  const openSubjectDialog = (subject?: Subject) => {
    if (subject) {
      setEditingSubject(subject);
      setSubjectName(subject.name);
      setSubjectDescription(subject.description || '');
      setSubjectIcon(subject.icon || '');
    } else {
      setEditingSubject(null);
      setSubjectName('');
      setSubjectDescription('');
      setSubjectIcon('');
    }
    setSubjectDialogOpen(true);
  };

  const saveSubject = async () => {
    if (!subjectName.trim()) return;
    setIsSubmitting(true);
    
    try {
      if (editingSubject) {
        const { error } = await supabase
          .from('subjects')
          .update({ name: subjectName, description: subjectDescription || null, icon: subjectIcon || null })
          .eq('id', editingSubject.id);
        if (error) throw error;
        toast({ title: 'Subject updated successfully' });
      } else {
        const { error } = await supabase
          .from('subjects')
          .insert({ name: subjectName, description: subjectDescription || null, icon: subjectIcon || null });
        if (error) throw error;
        toast({ title: 'Subject created successfully' });
      }
      setSubjectDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteSubject = async (id: string) => {
    if (!confirm('Delete this subject? All units and questions will also be deleted.')) return;
    
    try {
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Subject deleted' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Unit CRUD
  const openUnitDialog = (unit?: Unit) => {
    if (unit) {
      setEditingUnit(unit);
      setUnitSubjectId(unit.subject_id);
      setUnitTitle(unit.title);
      setUnitNumber(String(unit.unit_number));
      setUnitDescription(unit.description || '');
    } else {
      setEditingUnit(null);
      setUnitSubjectId('');
      setUnitTitle('');
      setUnitNumber('');
      setUnitDescription('');
    }
    setUnitDialogOpen(true);
  };

  const saveUnit = async () => {
    if (!unitSubjectId || !unitTitle.trim() || !unitNumber) return;
    setIsSubmitting(true);
    
    try {
      if (editingUnit) {
        const { error } = await supabase
          .from('units')
          .update({ 
            subject_id: unitSubjectId, 
            title: unitTitle, 
            unit_number: parseInt(unitNumber),
            description: unitDescription || null 
          })
          .eq('id', editingUnit.id);
        if (error) throw error;
        toast({ title: 'Unit updated successfully' });
      } else {
        const { error } = await supabase
          .from('units')
          .insert({ 
            subject_id: unitSubjectId, 
            title: unitTitle, 
            unit_number: parseInt(unitNumber),
            description: unitDescription || null 
          });
        if (error) throw error;
        toast({ title: 'Unit created successfully' });
      }
      setUnitDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteUnit = async (id: string) => {
    if (!confirm('Delete this unit? All questions will also be deleted.')) return;
    
    try {
      const { error } = await supabase.from('units').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Unit deleted' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Question CRUD
  const openQuestionDialog = (question?: Question) => {
    if (question) {
      setEditingQuestion(question);
      setQuestionUnitId(question.unit_id);
      setQuestionText(question.question);
      setQuestionAnswer(question.answer || '');
      setQuestionImportance(question.importance);
    } else {
      setEditingQuestion(null);
      setQuestionUnitId('');
      setQuestionText('');
      setQuestionAnswer('');
      setQuestionImportance('medium');
    }
    setQuestionDialogOpen(true);
  };

  const saveQuestion = async () => {
    if (!questionUnitId || !questionText.trim()) return;
    setIsSubmitting(true);
    
    try {
      if (editingQuestion) {
        const { error } = await supabase
          .from('questions')
          .update({ 
            unit_id: questionUnitId, 
            question: questionText, 
            answer: questionAnswer || null,
            importance: questionImportance 
          })
          .eq('id', editingQuestion.id);
        if (error) throw error;
        toast({ title: 'Question updated successfully' });
      } else {
        const { error } = await supabase
          .from('questions')
          .insert({ 
            unit_id: questionUnitId, 
            question: questionText, 
            answer: questionAnswer || null,
            importance: questionImportance 
          });
        if (error) throw error;
        toast({ title: 'Question created successfully' });
      }
      setQuestionDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    
    try {
      const { error } = await supabase.from('questions').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Question deleted' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || 'Unknown';
  const getUnitTitle = (id: string) => {
    const unit = units.find(u => u.id === id);
    return unit ? `${unit.title}` : 'Unknown';
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-8 md:py-12">
        <div className="container">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Admin Panel</h1>
              <p className="text-muted-foreground">Manage subjects, units, and questions</p>
            </div>
          </div>

          <Tabs defaultValue="subjects" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="subjects">Subjects</TabsTrigger>
              <TabsTrigger value="units">Units</TabsTrigger>
              <TabsTrigger value="questions">Questions</TabsTrigger>
            </TabsList>

            {/* Subjects Tab */}
            <TabsContent value="subjects">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Subjects</CardTitle>
                    <CardDescription>{subjects.length} subjects</CardDescription>
                  </div>
                  <Button onClick={() => openSubjectDialog()} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Subject
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Icon</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjects.map((subject) => (
                        <TableRow key={subject.id}>
                          <TableCell className="text-2xl">{subject.icon || '📚'}</TableCell>
                          <TableCell className="font-medium">{subject.name}</TableCell>
                          <TableCell className="text-muted-foreground truncate max-w-xs">
                            {subject.description}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openSubjectDialog(subject)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteSubject(subject.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Units Tab */}
            <TabsContent value="units">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Units</CardTitle>
                    <CardDescription>{units.length} units</CardDescription>
                  </div>
                  <Button onClick={() => openUnitDialog()} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Unit
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {units.map((unit) => (
                        <TableRow key={unit.id}>
                          <TableCell>{unit.unit_number}</TableCell>
                          <TableCell className="font-medium">{unit.title}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {getSubjectName(unit.subject_id)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openUnitDialog(unit)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteUnit(unit.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Questions Tab */}
            <TabsContent value="questions">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Questions</CardTitle>
                    <CardDescription>{questions.length} questions</CardDescription>
                  </div>
                  <Button onClick={() => openQuestionDialog()} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Question
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Question</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Importance</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {questions.map((question) => (
                        <TableRow key={question.id}>
                          <TableCell className="font-medium truncate max-w-md">
                            {question.question}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {getUnitTitle(question.unit_id)}
                          </TableCell>
                          <TableCell>
                            <span className={`capitalize ${
                              question.importance === 'high' ? 'text-destructive' :
                              question.importance === 'medium' ? 'text-primary' : ''
                            }`}>
                              {question.importance}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openQuestionDialog(question)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => deleteQuestion(question.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />

      {/* Subject Dialog */}
      <Dialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSubject ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
            <DialogDescription>
              {editingSubject ? 'Update the subject details.' : 'Create a new subject.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subjectName">Name *</Label>
              <Input
                id="subjectName"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="Mathematics"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subjectIcon">Icon (emoji)</Label>
              <Input
                id="subjectIcon"
                value={subjectIcon}
                onChange={(e) => setSubjectIcon(e.target.value)}
                placeholder="📐"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subjectDescription">Description</Label>
              <Textarea
                id="subjectDescription"
                value={subjectDescription}
                onChange={(e) => setSubjectDescription(e.target.value)}
                placeholder="Brief description of the subject..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubjectDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveSubject} disabled={isSubmitting || !subjectName.trim()}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unit Dialog */}
      <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUnit ? 'Edit Unit' : 'Add Unit'}</DialogTitle>
            <DialogDescription>
              {editingUnit ? 'Update the unit details.' : 'Create a new unit.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject *</Label>
              <Select value={unitSubjectId} onValueChange={setUnitSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.icon} {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unitNumber">Unit # *</Label>
                <Input
                  id="unitNumber"
                  type="number"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  placeholder="1"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="unitTitle">Title *</Label>
                <Input
                  id="unitTitle"
                  value={unitTitle}
                  onChange={(e) => setUnitTitle(e.target.value)}
                  placeholder="Algebra Fundamentals"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitDescription">Description</Label>
              <Textarea
                id="unitDescription"
                value={unitDescription}
                onChange={(e) => setUnitDescription(e.target.value)}
                placeholder="Brief description of the unit..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnitDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveUnit} disabled={isSubmitting || !unitSubjectId || !unitTitle.trim() || !unitNumber}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add Question'}</DialogTitle>
            <DialogDescription>
              {editingQuestion ? 'Update the question details.' : 'Create a new question.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit *</Label>
                <Select value={questionUnitId} onValueChange={setQuestionUnitId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        Unit {unit.unit_number}: {unit.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Importance *</Label>
                <Select value={questionImportance} onValueChange={(v) => setQuestionImportance(v as QuestionImportance)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="questionText">Question *</Label>
              <Textarea
                id="questionText"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="What is the quadratic formula?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="questionAnswer">Answer (optional)</Label>
              <Textarea
                id="questionAnswer"
                value={questionAnswer}
                onChange={(e) => setQuestionAnswer(e.target.value)}
                placeholder="The answer to the question..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveQuestion} disabled={isSubmitting || !questionUnitId || !questionText.trim()}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
