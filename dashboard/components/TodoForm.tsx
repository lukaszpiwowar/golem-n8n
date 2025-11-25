'use client';

import { useState, FormEvent } from 'react';
import styles from './TodoForm.module.css';

interface TodoFormProps {
  onAdd: (title: string) => void;
}

export default function TodoForm({ onAdd }: TodoFormProps) {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAdd(title.trim());
      setTitle('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Dodaj nowe zadanie..."
        className={styles.input}
        disabled={isSubmitting}
        maxLength={255}
      />
      <button
        type="submit"
        disabled={!title.trim() || isSubmitting}
        className={styles.button}
      >
        {isSubmitting ? 'Dodawanie...' : 'Dodaj'}
      </button>
    </form>
  );
}

