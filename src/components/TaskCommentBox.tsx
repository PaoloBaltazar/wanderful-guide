
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import MentionSuggestions from "./MentionSuggestions";

interface TaskCommentBoxProps {
  taskId: string;
  onCommentAdded: () => void;
}

interface Employee {
  name: string;
  email: string;
}

const TaskCommentBox = ({ taskId, onCommentAdded }: TaskCommentBoxProps) => {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mention state
  const [mentionState, setMentionState] = useState({
    isMentioning: false,
    mentionText: "",
    startPosition: 0,
    showSuggestions: false
  });

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('name, email');
          
        if (error) throw error;
        
        setEmployees(data || []);
      } catch (error) {
        console.error('Error fetching employees for mentions:', error);
      }
    };
    
    fetchEmployees();
  }, []);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    
    // Check for mention
    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = newContent.substring(0, cursorPosition);
    
    // Find the last @ symbol before the cursor
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtSymbol !== -1 && !textBeforeCursor.substring(lastAtSymbol).includes(' ')) {
      // We're in a mention
      const mentionText = textBeforeCursor.substring(lastAtSymbol + 1); // Text after @ symbol
      
      setMentionState({
        isMentioning: true,
        mentionText,
        startPosition: lastAtSymbol,
        showSuggestions: true
      });
    } else {
      // Not in a mention
      setMentionState({
        isMentioning: false,
        mentionText: "",
        startPosition: 0,
        showSuggestions: false
      });
    }
  };

  const handleSelectMention = (employee: Employee) => {
    // Insert the selected mention
    const beforeMention = content.substring(0, mentionState.startPosition);
    const afterMention = content.substring(mentionState.startPosition + mentionState.mentionText.length + 1);
    
    const newContent = `${beforeMention}@${employee.name} ${afterMention}`;
    setContent(newContent);
    
    // Reset mention state
    setMentionState({
      isMentioning: false,
      mentionText: "",
      startPosition: 0,
      showSuggestions: false
    });
    
    // Focus the textarea and place cursor after the inserted mention
    if (textareaRef.current) {
      const newCursorPosition = beforeMention.length + employee.name.length + 2; // +2 for @ and space
      textareaRef.current.focus();
      
      // Need to set timeout for cursor position to work correctly
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newCursorPosition;
          textareaRef.current.selectionEnd = newCursorPosition;
        }
      }, 0);
    }
  };

  const extractMentions = (text: string) => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1].toLowerCase());
    }
    
    return mentions;
  };

  const findMentionedEmployees = (mentionTexts: string[]) => {
    return employees.filter(emp => 
      mentionTexts.some(mention => 
        emp.name.toLowerCase().includes(mention) || 
        emp.email.toLowerCase().includes(mention)
      )
    );
  };

  const createMentionNotifications = async (mentionedEmployees: Employee[], taskTitle: string) => {
    for (const employee of mentionedEmployees) {
      if (user && employee.email !== user.email) {
        const notificationData = {
          recipient: employee.email,
          type: "mention",
          title: "You were mentioned in a comment",
          content: `You were mentioned in a comment on task "${taskTitle}"`,
          related_id: taskId,
          read: false
        };
        
        try {
          await supabase
            .from('notifications')
            .insert(notificationData);
        } catch (error) {
          console.error('Error creating mention notification:', error);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Comment cannot be empty",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Extract mentions from content
      const mentionTexts = extractMentions(content);
      const mentionedEmployees = findMentionedEmployees(mentionTexts);
      const mentionedEmails = mentionedEmployees.map(emp => emp.email);
      
      // Get task title for notifications
      const { data: taskData } = await supabase
        .from('tasks')
        .select('title')
        .eq('id', taskId)
        .single();
      
      // Add comment using RPC function
      const { data, error } = await supabase.rpc('add_task_comment', {
        p_task_id: taskId,
        p_user_email: user?.email,
        p_content: content,
        p_mentioned_employees: mentionedEmails.length > 0 ? mentionedEmails : null
      });
      
      if (error) throw error;
      
      // Create notifications for mentioned employees
      if (mentionedEmployees.length > 0 && taskData) {
        await createMentionNotifications(mentionedEmployees, taskData.title);
      }
      
      setContent("");
      onCommentAdded();
      
      toast({
        title: "Success",
        description: "Comment added successfully"
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} onKeyDown={(e) => {
      // Prevent form submission on Enter when showing suggestions
      if (e.key === 'Enter' && mentionState.showSuggestions) {
        e.preventDefault();
      }
    }}>
      <div className="space-y-2 relative">
        <Textarea
          ref={textareaRef}
          placeholder="Write a comment... Use @ to mention someone"
          value={content}
          onChange={handleTextareaChange}
          rows={3}
        />
        
        {mentionState.showSuggestions && (
          <MentionSuggestions 
            employees={employees}
            query={mentionState.mentionText}
            onSelect={handleSelectMention}
            visible={mentionState.showSuggestions}
          />
        )}
        
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !content.trim()}>
            {isSubmitting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default TaskCommentBox;
