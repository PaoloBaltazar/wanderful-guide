
import { supabase } from '@/lib/supabase';
import { Task } from '@/types/task';

export const taskService = {
  async getTasks() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication required');
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Task[];
    } catch (error) {
      console.error('Error getting tasks:', error);
      throw error;
    }
  },

  async createTask(task: Omit<Task, 'id' | 'created_at'>) {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data, error } = await supabase
        .from('tasks')
        .insert([{ ...task, user_id: userData.user.id }])
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  },

  async updateTaskStatus(taskId: string, status: Task['status']) {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data as Task;
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }
};
