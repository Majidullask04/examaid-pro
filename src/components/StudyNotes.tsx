import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X, FileText, Loader2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { StudyNote, ResourceItem } from '@/types/database';

interface StudyNotesProps {
  userId: string | null;
}

export function StudyNotes({ userId }: StudyNotesProps) {
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', topic: '' });
  const [editNote, setEditNote] = useState({ title: '', content: '', topic: '' });
  const { toast } = useToast();

  useEffect(() => {
    if (userId) {
      fetchNotes();
    } else {
      setIsLoading(false);
    }
  }, [userId]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('study_notes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedNotes: StudyNote[] = (data || []).map(note => ({
        id: note.id,
        user_id: note.user_id,
        title: note.title,
        content: note.content,
        topic: note.topic,
        created_at: note.created_at,
        updated_at: note.updated_at,
        resources: Array.isArray(note.resources) 
          ? (note.resources as unknown as ResourceItem[]) 
          : []
      }));
      
      setNotes(transformedNotes);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load study notes',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createNote = async () => {
    if (!userId || !newNote.title.trim()) return;

    try {
      const { error } = await supabase.from('study_notes').insert({
        user_id: userId,
        title: newNote.title,
        content: newNote.content,
        topic: newNote.topic || null,
        resources: [],
      });

      if (error) throw error;

      toast({ title: 'Note created successfully' });
      setNewNote({ title: '', content: '', topic: '' });
      setIsCreating(false);
      fetchNotes();
    } catch (error) {
      console.error('Error creating note:', error);
      toast({
        title: 'Error',
        description: 'Failed to create note',
        variant: 'destructive',
      });
    }
  };

  const updateNote = async (id: string) => {
    try {
      const { error } = await supabase
        .from('study_notes')
        .update({
          title: editNote.title,
          content: editNote.content,
          topic: editNote.topic || null,
        })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Note updated successfully' });
      setEditingId(null);
      fetchNotes();
    } catch (error) {
      console.error('Error updating note:', error);
      toast({
        title: 'Error',
        description: 'Failed to update note',
        variant: 'destructive',
      });
    }
  };

  const deleteNote = async (id: string) => {
    try {
      const { error } = await supabase.from('study_notes').delete().eq('id', id);

      if (error) throw error;

      toast({ title: 'Note deleted successfully' });
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete note',
        variant: 'destructive',
      });
    }
  };

  const startEditing = (note: StudyNote) => {
    setEditingId(note.id);
    setEditNote({
      title: note.title,
      content: note.content || '',
      topic: note.topic || '',
    });
  };

  if (!userId) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sign in to save notes</h3>
          <p className="text-muted-foreground">
            Create an account to save and manage your study notes.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Create Note Button/Form */}
      {isCreating ? (
        <Card className="border-primary/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">New Study Note</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Note title"
              value={newNote.title}
              onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
            />
            <Input
              placeholder="Topic (optional)"
              value={newNote.topic}
              onChange={(e) => setNewNote({ ...newNote, topic: e.target.value })}
            />
            <Textarea
              placeholder="Note content..."
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              rows={4}
            />
            <div className="flex gap-2">
              <Button onClick={createNote} disabled={!newNote.title.trim()}>
                <Save className="h-4 w-4 mr-2" />
                Save Note
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setIsCreating(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Create New Note
        </Button>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No study notes yet</h3>
            <p className="text-muted-foreground">
              Create your first note or save resources from your searches.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {notes.map((note) => (
            <Card key={note.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {editingId === note.id ? (
                  <div className="space-y-3">
                    <Input
                      value={editNote.title}
                      onChange={(e) => setEditNote({ ...editNote, title: e.target.value })}
                    />
                    <Input
                      placeholder="Topic"
                      value={editNote.topic}
                      onChange={(e) => setEditNote({ ...editNote, topic: e.target.value })}
                    />
                    <Textarea
                      value={editNote.content}
                      onChange={(e) => setEditNote({ ...editNote, content: e.target.value })}
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateNote(note.id)}>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold">{note.title}</h3>
                        {note.topic && (
                          <Badge variant="secondary" className="mt-1">
                            {note.topic}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => startEditing(note)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteNote(note.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {note.content && (
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {note.content}
                      </p>
                    )}
                    {note.resources && note.resources.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">
                          {note.resources.length} saved resources
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Updated {new Date(note.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
