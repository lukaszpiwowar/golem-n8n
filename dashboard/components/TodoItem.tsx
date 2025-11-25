'use client';

import { useState } from 'react';
import styles from './TodoItem.module.css';

interface Todo {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
}

export default function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(todo.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <li className={`${styles.item} ${todo.completed ? styles.completed : ''}`}>
      <label className={styles.label}>
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo.id, todo.completed)}
          className={styles.checkbox}
        />
        <span className={styles.title}>{todo.title}</span>
      </label>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className={styles.deleteButton}
        aria-label="Usuń zadanie"
      >
        {isDeleting ? '...' : '×'}
      </button>
    </li>
  );
}

