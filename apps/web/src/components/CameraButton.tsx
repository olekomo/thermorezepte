'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  /** Wird mit der ausgewählten Datei aufgerufen */
  // eslint-disable-next-line no-unused-vars
  onPick?: (file: File) => void;
  /** Button-Text */
  label?: string;
  /** Optional: Button-Variante (shadcn) */
  variant?: React.ComponentProps<typeof Button>['variant'];
  /** Optional: Button-Größe (shadcn) */
  size?: React.ComponentProps<typeof Button>['size'];
  /** Zusätzliche Klassen für den Button-Wrapper */
  className?: string;
  /** Direktes Styling (Legacy-Kompatibilität) */
  style?: React.CSSProperties;

  /** Wenn true: bevorzugt Kamera (Mobile, `capture=\"environment\"`) */
  preferCamera?: boolean;
  /** Disabled-State */
  disabled?: boolean;
  /** Optional: akzeptierte MIME-Types (Default: nur Bilder) */
  accept?: string;

  /** Optional: Iconwahl – 'camera' (default) oder 'upload' */
  icon?: 'camera' | 'upload';
  /** Optional: aria-label für bessere A11y, falls label leer ist */
  ariaLabel?: string;
};

export default function CameraButton({
  onPick,
  label = 'Rezept fotografieren',
  variant = 'default',
  size = 'default',
  className,
  style,
  preferCamera = true,
  disabled = false,
  accept = 'image/*',
  icon = 'camera',
  ariaLabel,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const openPicker = React.useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      // wichtig: Input zurücksetzen, damit dieselbe Datei erneut gewählt werden kann
      e.currentTarget.value = '';
      if (file) onPick?.(file);
    },
    [onPick]
  );

  return (
    <div className={cn('w-full', className)} style={style}>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={openPicker}
        disabled={disabled}
        className="w-full rounded-xl"
        aria-label={ariaLabel || (typeof label === 'string' ? label : 'Bild auswählen')}
      >
        <span className="inline-flex items-center gap-2">
          {icon === 'upload' ? (
            <Upload className="size-4" aria-hidden />
          ) : (
            <Camera className="size-4" aria-hidden />
          )}
          {label}
        </span>
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        // Nur im Kameramodus setzen; Desktop/Browser ignorieren oder fallbacken automatisch
        {...(preferCamera ? { capture: 'environment' as any } : {})}
        hidden
        onChange={handleChange}
      />
    </div>
  );
}
