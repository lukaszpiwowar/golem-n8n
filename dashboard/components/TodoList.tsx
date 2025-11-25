'use client';

import TodoItem from './TodoItem';
import styles from './TodoList.module.css';

interface Todo {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

interface TodoListProps {
  todos: Todo[];
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
}

export default function TodoList({ todos, onToggle, onDelete }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Brak zadań. Dodaj pierwsze zadanie!</p>
      </div>
    );
  }

  const completedCount = todos.filter((t) => t.completed).length;
  const totalCount = todos.length;

  return (
    <div className={styles.container}>
      <div className={styles.stats}>
        <span>
          {completedCount} / {totalCount} ukończonych
        </span>
      </div>
      <ul className={styles.list}>
        {todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </div>
  );
}

