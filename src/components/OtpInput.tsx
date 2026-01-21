import { Box, TextField } from '@mui/material';
import { useEffect, useMemo, useRef } from 'react';

export function OtpInput({
  value,
  length = 6,
  disabled,
  autoFocus,
  onChange,
  onComplete,
}: {
  value: string;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
}) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const digits = useMemo(() => {
    const clean = (value || '').replace(/\D/g, '').slice(0, length);
    const arr = Array.from({ length }, (_, i) => clean[i] ?? '');
    return { clean, arr };
  }, [value, length]);

  useEffect(() => {
    if (!autoFocus) return;
    const first = inputsRef.current[0];
    if (first) first.focus();
  }, [autoFocus]);

  const focusIndex = (idx: number) => {
    const el = inputsRef.current[idx];
    if (el) el.focus();
  };

  const setValueAt = (idx: number, nextChar: string) => {
    const current = digits.arr.slice();
    current[idx] = nextChar;
    const next = current.join('').replace(/\D/g, '').slice(0, length);
    onChange(next);
    if (next.length === length) onComplete?.(next);
  };

  const handlePaste = (raw: string) => {
    const pasted = (raw || '').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    if (pasted.length === length) onComplete?.(pasted);
    focusIndex(Math.min(length - 1, pasted.length - 1));
  };

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${length}, minmax(0, 1fr))`, gap: 1 }}>
      {digits.arr.map((d, idx) => (
        <TextField
          key={idx}
          inputRef={(el) => {
            inputsRef.current[idx] = el;
          }}
          value={d}
          disabled={disabled}
          onChange={(e) => {
            const v = (e.target.value || '').replace(/\D/g, '');
            if (!v) {
              setValueAt(idx, '');
              return;
            }
            const char = v.slice(-1);
            setValueAt(idx, char);
            if (idx < length - 1) focusIndex(idx + 1);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              if (digits.arr[idx]) {
                setValueAt(idx, '');
              } else if (idx > 0) {
                focusIndex(idx - 1);
                setValueAt(idx - 1, '');
              }
            } else if (e.key === 'ArrowLeft' && idx > 0) {
              focusIndex(idx - 1);
            } else if (e.key === 'ArrowRight' && idx < length - 1) {
              focusIndex(idx + 1);
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            handlePaste(e.clipboardData.getData('text'));
          }}
          inputProps={{
            inputMode: 'numeric',
            pattern: '[0-9]*',
            maxLength: 1,
            style: {
              textAlign: 'center',
              fontSize: 18,
              padding: '10px 0',
            },
          }}
          size="small"
        />
      ))}
    </Box>
  );
}

